import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
// verifyPluginSecret loaded dynamically

const Body = z.object({
  license_key: z.string().min(4),
  domain: z.string().min(1),
  product_slug: z.string().min(1),
});

function normDomain(d: string) {
  // Preserve path so multi-site installs (example.com/site1 vs /site2) count separately
  return d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/license/activate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const providedSecret = request.headers.get("x-plugin-secret");
        const { verifyProductSecret } = await import("@/lib/license.server");
        let parsed;
        try {
          parsed = Body.parse(await request.json());
        } catch {
          return json({ success: false, error: "invalid_request" }, 400);
        }
        const domain = normDomain(parsed.domain);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: lic } = await supabaseAdmin
          .from("licenses")
          .select("*, products!inner(slug, api_secret)")
          .eq("license_key", parsed.license_key)
          .maybeSingle();
        if (!lic) return json({ success: false, error: "invalid_key" }, 404);
        if ((lic as any).products?.slug !== parsed.product_slug) {
          return json({ success: false, error: "product_mismatch" }, 403);
        }
        if (!verifyProductSecret(providedSecret, (lic as any).products?.api_secret)) {
          return json({ success: false, error: "unauthorized" }, 401);
        }

        // auto-expire
        if (lic.expires_at && new Date(lic.expires_at) < new Date() && lic.status === "active") {
          await supabaseAdmin.from("licenses").update({ status: "expired" }).eq("id", lic.id);
          lic.status = "expired";
        }
        if (lic.status !== "active") {
          return json({ success: false, error: lic.status }, 403);
        }

        // existing activation?
        const { data: existing } = await supabaseAdmin
          .from("activations")
          .select("*")
          .eq("license_id", lic.id)
          .eq("domain", domain)
          .maybeSingle();

        if (!existing) {
          const { count } = await supabaseAdmin
            .from("activations")
            .select("*", { count: "exact", head: true })
            .eq("license_id", lic.id);
          if ((count ?? 0) >= lic.max_activations) {
            return json({ success: false, error: "activation_limit_reached" }, 403);
          }
          await supabaseAdmin.from("activations").insert({
            license_id: lic.id,
            domain,
            ip: request.headers.get("x-forwarded-for") ?? null,
          });
        } else {
          await supabaseAdmin
            .from("activations")
            .update({ last_check_at: new Date().toISOString() })
            .eq("id", existing.id);
        }

        const { count: used } = await supabaseAdmin
          .from("activations")
          .select("*", { count: "exact", head: true })
          .eq("license_id", lic.id);

        return json({
          success: true,
          status: lic.status,
          expires_at: lic.expires_at,
          activations_used: used ?? 0,
          max_activations: lic.max_activations,
        });
      },
    },
  },
});
