import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("messages")
      .select("id, title, body, author_id, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const authorIds = Array.from(new Set((data ?? []).map((m) => m.author_id)));
    let authors: Record<string, { first_name: string | null; last_name: string | null }> = {};
    if (authorIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", authorIds);
      authors = Object.fromEntries((profs ?? []).map((p) => [p.id, { first_name: p.first_name, last_name: p.last_name }]));
    }
    return {
      messages: (data ?? []).map((m) => ({
        ...m,
        author_name: authors[m.author_id]
          ? `${authors[m.author_id].first_name ?? ""} ${authors[m.author_id].last_name ?? ""}`.trim() || "Staff"
          : "Staff",
      })),
    };
  });

export const createMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title: string; body: string }) => {
    if (!d.title?.trim() || !d.body?.trim()) throw new Error("Title and message are required");
    if (d.title.length > 200) throw new Error("Title too long");
    if (d.body.length > 5000) throw new Error("Message too long");
    return d;
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("messages").insert({
      author_id: userId,
      title: data.title.trim(),
      body: data.body.trim(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("messages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });