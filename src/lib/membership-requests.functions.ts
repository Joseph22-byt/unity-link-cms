import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const submitMembershipRequest = createServerFn({ method: "POST" })
  .inputValidator((d: { full_name: string; email: string; phone?: string; requested_role: string; message?: string }) => {
    if (!d.full_name?.trim() || d.full_name.length > 200) throw new Error("Full name is required and must be under 200 characters");
    if (!d.email?.trim() || d.email.length > 300 || !d.email.includes("@")) throw new Error("Valid email is required");
    if (d.phone && d.phone.length > 50) throw new Error("Phone must be under 50 characters");
    if (!["member", "pastor", "staff"].includes(d.requested_role)) throw new Error("Invalid role");
    if (d.message && d.message.length > 2000) throw new Error("Message must be under 2000 characters");
    return d;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("membership_requests").insert({
      full_name: data.full_name.trim(),
      email: data.email.trim(),
      phone: data.phone?.trim() || null,
      requested_role: data.requested_role,
      message: data.message?.trim() || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMembershipRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("membership_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { requests: data ?? [] };
  });

export const updateRequestStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "pending" | "approved" | "rejected" }) => {
    if (!d.id) throw new Error("ID is required");
    if (!["pending", "approved", "rejected"].includes(d.status)) throw new Error("Invalid status");
    return d;
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("membership_requests")
      .update({ status: data.status, reviewed_by: userId, reviewed_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
