import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const KEY = "donation_qr";

export const getDonationQr = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data } = await supabase.from("app_settings").select("value, updated_at").eq("key", KEY).maybeSingle();
    const value = (data?.value ?? {}) as { path?: string; caption?: string; method?: string };
    let public_url: string | null = null;
    if (value.path) {
      const { data: pub } = supabase.storage.from("donation-qr").getPublicUrl(value.path);
      public_url = pub.publicUrl;
    }
    return {
      path: value.path ?? null,
      caption: value.caption ?? null,
      method: value.method ?? null,
      public_url,
      updated_at: data?.updated_at ?? null,
    };
  });

export const setDonationQr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string; caption?: string; method?: string }) => {
    if (!d.path) throw new Error("Path is required");
    if (d.caption && d.caption.length > 500) throw new Error("Caption too long");
    if (d.method && d.method.length > 100) throw new Error("Method too long");
    return d;
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("app_settings").upsert({
      key: "donation_qr",
      value: { path: data.path, caption: data.caption ?? null, method: data.method ?? null },
      updated_by: userId,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearDonationQr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.from("app_settings").delete().eq("key", "donation_qr");
    if (error) throw new Error(error.message);
    return { ok: true };
  });