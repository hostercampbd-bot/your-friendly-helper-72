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
          <code className="block break-all rounded bg-muted p-3 text-sm">{BASE}</code>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Endpoints</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <Endpoint method="POST" path="/api/public/license/activate" body={`{ "license_key": "XXXX-XXXX-XXXX-XXXX", "domain": "example.com" }`}
            resp={`{ "success": true, "status": "active", "expires_at": "...", "activations_used": 1, "max_activations": 3 }`} />
          <Endpoint method="POST" path="/api/public/license/validate" body={`{ "license_key": "...", "domain": "example.com" }`}
            resp={`{ "valid": true, "status": "active", "expires_at": "..." }`} />
          <Endpoint method="POST" path="/api/public/license/deactivate" body={`{ "license_key": "...", "domain": "example.com" }`}
            resp={`{ "success": true }`} />
          <Endpoint method="GET" path="/api/public/license/update?license_key=...&current_version=1.2.0"
            resp={`{ "update_available": true, "latest_version": "1.3.0", "download_url": "...", "changelog": "..." }`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>WordPress plugin snippet (PHP)</CardTitle></CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">{`define('LICENSE_API_BASE', '${BASE}');
define('LICENSE_API_SECRET', 'PASTE_YOUR_PLUGIN_API_SECRET_HERE');

function my_license_call($path, $body = null, $method = 'POST') {
  $args = [
    'method'  => $method,
    'headers' => [
      'Content-Type'   => 'application/json',
      'X-Plugin-Secret' => LICENSE_API_SECRET,
    ],
    'timeout' => 15,
  ];
  if ($body !== null) $args['body'] = wp_json_encode($body);
  $res = wp_remote_request(LICENSE_API_BASE . $path, $args);
  if (is_wp_error($res)) return ['error' => $res->get_error_message()];
  return json_decode(wp_remote_retrieve_body($res), true);
}

// Activate
my_license_call('/api/public/license/activate',
  ['license_key' => $key, 'domain' => home_url()]);

// Validate (daily cron)
my_license_call('/api/public/license/validate',
  ['license_key' => $key, 'domain' => home_url()]);

// Deactivate
my_license_call('/api/public/license/deactivate',
  ['license_key' => $key, 'domain' => home_url()]);

// Update check
my_license_call(
  '/api/public/license/update?license_key=' . urlencode($key) . '&current_version=' . MY_PLUGIN_VERSION,
  null, 'GET'
);`}</pre>
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
