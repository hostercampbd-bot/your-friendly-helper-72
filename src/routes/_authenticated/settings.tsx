import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings" }] }),
  component: Page,
});

function Page() {
  const [base, setBase] = useState("");
  useEffect(() => { setBase(window.location.origin); }, []);

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">Settings & Plugin API</h1>

      <Card>
        <CardHeader>
          <CardTitle>Plugin API secret</CardTitle>
          <CardDescription>
            Your plugin sends this in the <code>X-Plugin-Secret</code> header on every request.
            It's stored securely and never exposed here. To rotate it, ask Lovable to regenerate <code>PLUGIN_API_SECRET</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>The secret was generated for you. You'll see the value once in the Lovable secrets UI (Project Settings → Secrets).</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API base URL</CardTitle>
        </CardHeader>
        <CardContent>
          <code className="block break-all rounded bg-muted p-3 text-sm">{base}</code>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Endpoints</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <Endpoint method="POST" path="/api/public/license/activate" body={`{ "license_key": "XXXX-XXXX-XXXX-XXXX", "domain": "example.com", "product_slug": "my-plugin" }`}
            resp={`{ "success": true, "status": "active", "expires_at": "...", "activations_used": 1, "max_activations": 3 }`} />
          <Endpoint method="POST" path="/api/public/license/validate" body={`{ "license_key": "...", "domain": "example.com", "product_slug": "my-plugin" }`}
            resp={`{ "valid": true, "status": "active", "expires_at": "..." }`} />
          <Endpoint method="POST" path="/api/public/license/deactivate" body={`{ "license_key": "...", "domain": "example.com", "product_slug": "my-plugin" }`}
            resp={`{ "success": true }`} />
          <Endpoint method="GET" path="/api/public/license/update?license_key=...&product_slug=my-plugin&current_version=1.2.0"
            resp={`{ "update_available": true, "latest_version": "1.3.0", "download_url": "...", "changelog": "..." }`} />
          <p className="text-xs text-muted-foreground">
            <code>product_slug</code> must match the <strong>slug</strong> set on the license's product in the Products page.
            Requests with a mismatched slug return <code>product_mismatch</code> (403) — this is how one license is scoped to one plugin/theme.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WordPress plugin updater (drop-in)</CardTitle>
          <CardDescription>
            Paste this into your plugin's main file (or include it). It hooks into WordPress's update system so users see the yellow
            "There is a new version available" banner, the "View details" modal, and the one-click "update now" button — same UX as any WP.org plugin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">{`<?php
// ============================================================
// 1. CONFIG — edit these 4 lines for your plugin
// ============================================================
if (!defined('ABSPATH')) exit;

define('MY_LICENSE_API_BASE',   '${base}');
define('MY_LICENSE_API_SECRET', 'PASTE_YOUR_PLUGIN_API_SECRET_HERE');
define('MY_PLUGIN_SLUG',        'my-plugin');            // must match your plugin folder name
define('MY_PLUGIN_FILE',        MY_PLUGIN_SLUG . '/' . MY_PLUGIN_SLUG . '.php'); // e.g. my-plugin/my-plugin.php
define('MY_PLUGIN_VERSION',     '1.0.0');                // current installed version

// ============================================================
// 2. Store the license key (set once after user activates)
//    update_option('my_plugin_license_key', 'XXXX-XXXX-XXXX-XXXX');
// ============================================================

// ============================================================
// 3. Updater — no edits needed below
// ============================================================
class My_Plugin_Updater {
    public static function init() {
        add_filter('pre_set_site_transient_update_plugins', [__CLASS__, 'check_update']);
        add_filter('plugins_api',                            [__CLASS__, 'plugin_info'], 20, 3);
        add_action('upgrader_process_complete',              [__CLASS__, 'purge'], 10, 2);
    }

    private static function remote_info() {
        static $cache = null;
        if ($cache !== null) return $cache;

        $key = get_option('my_plugin_license_key');
        if (!$key) return $cache = false;

        $transient_key = 'my_plugin_update_' . md5($key . MY_PLUGIN_VERSION);
        $cached = get_transient($transient_key);
        if ($cached !== false) return $cache = $cached;

        $url = MY_LICENSE_API_BASE . '/api/public/license/update'
             . '?license_key=' . urlencode($key)
             . '&product_slug=' . urlencode(MY_PLUGIN_SLUG)
             . '&current_version=' . urlencode(MY_PLUGIN_VERSION);

        $res = wp_remote_get($url, [
            'timeout' => 15,
            'headers' => ['X-Plugin-Secret' => MY_LICENSE_API_SECRET],
        ]);
        if (is_wp_error($res) || wp_remote_retrieve_response_code($res) !== 200) return $cache = false;

        $data = json_decode(wp_remote_retrieve_body($res), true);
        if (!is_array($data)) return $cache = false;

        set_transient($transient_key, $data, 6 * HOUR_IN_SECONDS);
        return $cache = $data;
    }

    // Injects into WP's update transient → shows "new version available" banner + "update now"
    public static function check_update($transient) {
        if (empty($transient->checked)) return $transient;
        $info = self::remote_info();
        if (!$info || empty($info['update_available']) || empty($info['latest_version'])) return $transient;
        if (version_compare(MY_PLUGIN_VERSION, $info['latest_version'], '>=')) return $transient;

        $transient->response[MY_PLUGIN_FILE] = (object) [
            'slug'        => MY_PLUGIN_SLUG,
            'plugin'      => MY_PLUGIN_FILE,
            'new_version' => $info['latest_version'],
            'url'         => MY_LICENSE_API_BASE,
            'package'     => $info['download_url'], // signed URL from your API
            'tested'      => get_bloginfo('version'),
        ];
        return $transient;
    }

    // Powers the "View version X.X.X details" modal
    public static function plugin_info($result, $action, $args) {
        if ($action !== 'plugin_information') return $result;
        if (empty($args->slug) || $args->slug !== MY_PLUGIN_SLUG) return $result;

        $info = self::remote_info();
        if (!$info) return $result;

        return (object) [
            'name'          => 'My Plugin',
            'slug'          => MY_PLUGIN_SLUG,
            'version'       => $info['latest_version'],
            'author'        => 'Your Company',
            'homepage'      => MY_LICENSE_API_BASE,
            'download_link' => $info['download_url'],
            'trunk'         => $info['download_url'],
            'requires'      => '5.8',
            'tested'        => get_bloginfo('version'),
            'sections'      => [
                'description' => 'My Plugin — licensed release.',
                'changelog'   => !empty($info['changelog']) ? nl2br(esc_html($info['changelog'])) : 'No changelog provided.',
            ],
        ];
    }

    // Clear cache after a successful update so the banner disappears
    public static function purge($upgrader, $options) {
        if (($options['action'] ?? '') === 'update' && ($options['type'] ?? '') === 'plugin') {
            $key = get_option('my_plugin_license_key');
            if ($key) delete_transient('my_plugin_update_' . md5($key . MY_PLUGIN_VERSION));
        }
    }
}
My_Plugin_Updater::init();`}</pre>
          <p className="mt-3 text-xs text-muted-foreground">
            After pasting: bump <code>latest_version</code> and upload a new ZIP on the Products page → within ~6h (or immediately if the site clicks "Check again")
            the yellow update banner appears in <strong>Plugins</strong>, and "update now" downloads the signed ZIP from your API.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Activate / validate / deactivate (helper calls)</CardTitle></CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">{`function my_license_call($path, $body = null, $method = 'POST') {
  $args = [
    'method'  => $method,
    'headers' => [
      'Content-Type'    => 'application/json',
      'X-Plugin-Secret' => MY_LICENSE_API_SECRET,
    ],
    'timeout' => 15,
  ];
  if ($body !== null) $args['body'] = wp_json_encode($body);
  $res = wp_remote_request(MY_LICENSE_API_BASE . $path, $args);
  if (is_wp_error($res)) return ['error' => $res->get_error_message()];
  return json_decode(wp_remote_retrieve_body($res), true);
}

// On license form submit
my_license_call('/api/public/license/activate',
  ['license_key' => $key, 'domain' => home_url(), 'product_slug' => MY_PLUGIN_SLUG]);

// Daily cron
my_license_call('/api/public/license/validate',
  ['license_key' => $key, 'domain' => home_url(), 'product_slug' => MY_PLUGIN_SLUG]);

// On deactivation
my_license_call('/api/public/license/deactivate',
  ['license_key' => $key, 'domain' => home_url(), 'product_slug' => MY_PLUGIN_SLUG]);`}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Error codes</CardTitle></CardHeader>
        <CardContent className="text-sm">
          <ul className="list-disc space-y-1 pl-5">
            <li><code>unauthorized</code> — wrong or missing <code>X-Plugin-Secret</code></li>
            <li><code>invalid_key</code> — license not found</li>
            <li><code>suspended</code> / <code>expired</code> / <code>revoked</code> — license is not active</li>
            <li><code>activation_limit_reached</code> — max domains reached</li>
            <li><code>domain_not_activated</code> — this domain hasn't run activate yet</li>
            <li><code>product_mismatch</code> — this license belongs to a different product (wrong <code>product_slug</code>)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Endpoint({ method, path, body, resp }: { method: string; path: string; body?: string; resp: string }) {
  return (
    <div className="rounded border p-3">
      <div className="flex gap-2 items-center mb-2">
        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-mono font-semibold">{method}</span>
        <code className="text-xs">{path}</code>
      </div>
      {body && <div><div className="text-xs text-muted-foreground mb-1">Request body:</div><pre className="text-xs rounded bg-muted p-2 overflow-x-auto">{body}</pre></div>}
      <div className="mt-2"><div className="text-xs text-muted-foreground mb-1">Response:</div><pre className="text-xs rounded bg-muted p-2 overflow-x-auto">{resp}</pre></div>
    </div>
  );
}
