import { createFileRoute } from "@tanstack/react-router";
// verifyPluginSecret loaded dynamically

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });
}

function cmpVer(a: string, b: string) {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

export const Route = createFileRoute("/api/public/license/update")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { verifyPluginSecret } = await import("@/lib/license.server"); if (!verifyPluginSecret(request.headers.get("x-plugin-secret"))) {
          return json({ error: "unauthorized" }, 401);
        }
        const url = new URL(request.url);
        const license_key = url.searchParams.get("license_key");
        const product_slug = url.searchParams.get("product_slug");
        const current_version = url.searchParams.get("current_version") ?? "0.0.0";
        if (!license_key || !product_slug) return json({ error: "invalid_request" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: lic } = await supabaseAdmin
          .from("licenses")
          .select("id, product_id, status, expires_at, products!inner(slug)")
          .eq("license_key", license_key)
          .maybeSingle();
        if (!lic) return json({ error: "invalid_key" }, 404);
        if ((lic as any).products?.slug !== product_slug) {
          return json({ error: "product_mismatch" }, 403);
        }
        if (lic.status !== "active") return json({ error: lic.status }, 403);

        const { data: product } = await supabaseAdmin
          .from("products")
          .select("latest_version, download_url, changelog")
          .eq("id", lic.product_id)
          .maybeSingle();
        if (!product) return json({ error: "product_not_found" }, 404);

        let download_url = product.download_url;
        if (download_url && download_url.startsWith("storage:")) {
          const path = download_url.slice("storage:".length);
          const { data: signed } = await supabaseAdmin.storage
            .from("plugin-releases")
            .createSignedUrl(path, 60 * 60 * 24);
          download_url = signed?.signedUrl ?? null;
        }

        return json({
          update_available: cmpVer(product.latest_version, current_version) > 0,
          latest_version: product.latest_version,
          download_url,
          changelog: product.changelog,
        });
      },
    },
  },
});
