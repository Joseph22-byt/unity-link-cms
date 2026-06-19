import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function signOne(supabase: any, bucket: string, path: string | null | undefined) {
  if (!path) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export const listEbooks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("ebooks")
      .select("id, title, author, description, cover_path, file_path, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ebooks = await Promise.all(
      (data ?? []).map(async (e) => ({
        ...e,
        cover_url: await signOne(supabase, "ebooks", e.cover_path),
      })),
    );
    return { ebooks };
  });

export const getEbookFileUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("ebooks")
      .select("file_path")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Not found");
    const url = await signOne(supabase, "ebooks", row.file_path);
    return { url };
  });

export const createEbook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    title: string;
    author?: string;
    description?: string;
    cover_path?: string | null;
    file_path: string;
  }) => {
    if (!d.title?.trim()) throw new Error("Title is required");
    if (!d.file_path) throw new Error("Book file is required");
    return d;
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: userId });
    if (!isStaff) throw new Error("Forbidden");
    const { data: row, error } = await supabase
      .from("ebooks")
      .insert({
        title: data.title.trim(),
        author: data.author?.trim() || null,
        description: data.description?.trim() || null,
        cover_path: data.cover_path ?? null,
        file_path: data.file_path,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteEbook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: userId });
    if (!isStaff) throw new Error("Forbidden");
    const { error } = await supabase.from("ebooks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });