import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function signPhoto(supabase: any, path: string | null | undefined) {
  if (!path) return null;
  const { data } = await supabase.storage.from("member-photos").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    const photo_signed_url = await signPhoto(supabase, profile?.photo_url);
    return { profile, roles: (roles ?? []).map((r) => r.role), photo_signed_url };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { first_name?: string; last_name?: string; phone?: string; ministry?: string; address?: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("profiles").update(data).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, membership_id, first_name, last_name, email, phone, ministry, status, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { members: data ?? [] };
  });

export const getStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const [total, active, pending, recent] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since.toISOString()),
    ]);
    return {
      total: total.count ?? 0,
      active: active.count ?? 0,
      pending: pending.count ?? 0,
      recent: recent.count ?? 0,
    };
  });

export const setMemberStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "pending" | "active" | "inactive" }) => d)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("profiles").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveMyPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string }) => d)
  .handler(async ({ context, data }) => {
    if (!data.path.startsWith(`${context.userId}/`)) throw new Error("Invalid photo path");
    const { error } = await context.supabase.from("profiles").update({ photo_url: data.path }).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const verifyMembership = createServerFn({ method: "GET" })
  .inputValidator((d: { membership_id: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("membership_id, first_name, last_name, ministry, status, photo_url, created_at")
      .eq("membership_id", data.membership_id)
      .maybeSingle();
    if (!profile) return { found: false as const };
    let photo_signed_url: string | null = null;
    if (profile.photo_url) {
      const { data: signed } = await supabaseAdmin.storage.from("member-photos").createSignedUrl(profile.photo_url, 60 * 60);
      photo_signed_url = signed?.signedUrl ?? null;
    }
    return {
      found: true as const,
      member: {
        membership_id: profile.membership_id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        ministry: profile.ministry,
        status: profile.status,
        member_since: profile.created_at,
        photo_signed_url,
      },
    };
  });