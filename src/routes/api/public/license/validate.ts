import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
// verifyPluginSecret loaded dynamically

const Body = z.object({ license_key: z.string().min(4), domain: z.string().min(1), product_slug: z.string().min(1) });

function normDomain(d: string) {
  return d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}
function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });
}

export const Route = createFileRoute("/api/public/license/validate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyPluginSecret } = await import("@/lib/license.server"); if (!verifyPluginSecret(request.headers.get("x-plugin-secret"))) {
          return json({ valid: false, error: "unauthorized" }, 401);
        }
        let parsed;
        try {
          parsed = Body.parse(await request.json());
        } catch {
          return json({ valid: false, error: "invalid_request" }, 400);
        }
        const domain = normDomain(parsed.domain);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: lic } = await supabaseAdmin
          .from("licenses")
          .select("*, products!inner(slug)")
          .eq("license_key", parsed.license_key)
          .maybeSingle();
        if (!lic) return json({ valid: false, error: "invalid_key" }, 404);
        if ((lic as any).products?.slug !== parsed.product_slug) {
          return json({ valid: false, error: "product_mismatch" }, 403);
        }

        if (lic.expires_at && new Date(lic.expires_at) < new Date() && lic.status === "active") {
          await supabaseAdmin.from("licenses").update({ status: "expired" }).eq("id", lic.id);
          lic.status = "expired";
        }

        const { data: act } = await supabaseAdmin
          .from("activations")
          .select("id")
          .eq("license_id", lic.id)
          .eq("domain", domain)
          .maybeSingle();

        if (!act) return json({ valid: false, error: "domain_not_activated", status: lic.status }, 403);
        if (lic.status !== "active") return json({ valid: false, error: lic.status, status: lic.status }, 403);

        await supabaseAdmin
          .from("activations")
          .update({ last_check_at: new Date().toISOString() })
          .eq("id", act.id);

        return json({ valid: true, status: lic.status, expires_at: lic.expires_at });
      },
    },
  },
});
