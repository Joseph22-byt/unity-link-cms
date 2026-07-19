import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const signUpAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; password: string; first_name: string; last_name: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Only an existing admin/super_admin may create additional admin accounts.
    // Bootstrap exception: if no admins exist yet, allow the first admin creation
    // by any authenticated user (needed for initial setup).
    const { count: adminCount, error: countErr0 } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if (countErr0) throw new Error(countErr0.message);

    if ((adminCount ?? 0) > 0) {
      const { data: isAdmin, error: roleCheckErr } = await context.supabase.rpc("is_admin", {
        _user_id: context.userId,
      });
      if (roleCheckErr) throw new Error(roleCheckErr.message);
      if (!isAdmin) {
        throw new Error("Only existing administrators can create new admin accounts.");
      }
    }

    // Enforce a hard limit of 2 admin accounts
    const { count, error: countErr } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if (countErr) throw new Error(countErr.message);
    if ((count ?? 0) >= 2) {
      throw new Error("Admin registration is closed. The maximum of 2 admin accounts has been reached.");
    }

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { first_name: data.first_name, last_name: data.last_name },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create account");

    // Promote to admin (handle_new_user already inserted a 'member' row)
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: "admin" });
    if (roleErr && !roleErr.message.includes("duplicate")) throw new Error(roleErr.message);

    // Activate profile so admin is not stuck in 'pending'
    await supabaseAdmin.from("profiles").update({ status: "active" }).eq("id", created.user.id);

    return { ok: true };
  });