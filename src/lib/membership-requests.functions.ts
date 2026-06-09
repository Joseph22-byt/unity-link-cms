import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const submitMembershipRequest = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({
      full_name: z.string().min(1).max(200),
      email: z.string().email().max(300),
      phone: z.string().max(50).optional(),
      requested_role: z.enum(["member", "pastor", "staff"]),
      message: z.string().max(2000).optional(),
    }).parse(raw)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("membership_requests").insert({
      full_name: data.full_name,
      email: data.email,
      phone: data.phone ?? null,
      requested_role: data.requested_role,
      message: data.message ?? null,
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
  .inputValidator((raw: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["pending", "approved", "rejected"]),
    }).parse(raw)
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("membership_requests")
      .update({ status: data.status, reviewed_by: userId, reviewed_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
