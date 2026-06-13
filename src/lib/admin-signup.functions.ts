import { createServerFn } from "@tanstack/react-start";

export const signUpAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string; first_name: string; last_name: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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