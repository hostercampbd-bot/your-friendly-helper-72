import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./admin.server";
import { z } from "zod";

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data, userId: context.userId };
  });

// ---------- LIST ----------
export const listAll = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [products, customers, licenses, activations, orders] = await Promise.all([
      context.supabase.from("products").select("*").order("created_at", { ascending: false }),
      context.supabase.from("customers").select("*").order("created_at", { ascending: false }),
      context.supabase.from("licenses").select("*").order("created_at", { ascending: false }),
      context.supabase.from("activations").select("*").order("activated_at", { ascending: false }),
      context.supabase.from("orders").select("*").order("created_at", { ascending: false }),
    ]);
    return {
      products: products.data ?? [],
      customers: customers.data ?? [],
      licenses: licenses.data ?? [],
      activations: activations.data ?? [],
      orders: orders.data ?? [],
    };
  });

// ---------- PRODUCTS ----------
export const upsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1),
      slug: z.string().min(1),
      latest_version: z.string().min(1),
      download_url: z.string().url().optional().nullable().or(z.literal("")),
      changelog: z.string().optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...rest } = data;
    const payload = { ...rest, download_url: rest.download_url || null };
    const q = id
      ? await context.supabase.from("products").update(payload).eq("id", id).select().single()
      : await context.supabase.from("products").insert(payload).select().single();
    if (q.error) throw new Error(q.error.message);
    return q.data;
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- CUSTOMERS ----------
export const upsertCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      email: z.string().email(),
      name: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = data.id
      ? await context.supabase.from("customers").update(data).eq("id", data.id).select().single()
      : await context.supabase.from("customers").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("customers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- LICENSES ----------
export const createLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      product_id: z.string().uuid(),
      customer_id: z.string().uuid(),
      max_activations: z.number().int().min(1).default(1),
      expires_at: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { generateLicenseKey } = await import("./license.server");
    const license_key = generateLicenseKey();
    const { data: row, error } = await context.supabase
      .from("licenses")
      .insert({ ...data, license_key, status: "active" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["active", "suspended", "expired", "revoked"]).optional(),
      max_activations: z.number().int().min(1).optional(),
      expires_at: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...updates } = data;
    const { data: row, error } = await context.supabase
      .from("licenses")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("licenses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- ACTIVATIONS (admin) ----------
export const removeActivation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("activations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- ORDERS ----------
export const upsertOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      customer_id: z.string().uuid(),
      product_id: z.string().uuid(),
      license_id: z.string().uuid().optional().nullable(),
      amount: z.number().min(0),
      currency: z.string().min(3).max(3),
      status: z.enum(["pending", "paid", "refunded", "cancelled"]),
      external_ref: z.string().optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = data.id
      ? await context.supabase.from("orders").update(data).eq("id", data.id).select().single()
      : await context.supabase.from("orders").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("orders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

