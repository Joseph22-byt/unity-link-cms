import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function signOne(supabase: any, path: string | null | undefined) {
  if (!path) return null;
  const { data } = await supabase.storage.from("gallery").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export const listGallery = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("gallery_items")
      .select("id, title, description, media_type, file_path, thumbnail_path, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = (data ?? []).map((d) => d.id);
    let likeCounts = new Map<string, number>();
    let myLikes = new Set<string>();
    if (ids.length) {
      const { data: likes } = await supabase
        .from("gallery_likes")
        .select("gallery_item_id, user_id")
        .in("gallery_item_id", ids);
      for (const l of likes ?? []) {
        likeCounts.set(l.gallery_item_id, (likeCounts.get(l.gallery_item_id) ?? 0) + 1);
        if (l.user_id === userId) myLikes.add(l.gallery_item_id);
      }
    }

    const items = await Promise.all(
      (data ?? []).map(async (i) => ({
        ...i,
        url: await signOne(supabase, i.file_path),
        thumbnail_url: await signOne(supabase, i.thumbnail_path),
        likes: likeCounts.get(i.id) ?? 0,
        liked_by_me: myLikes.has(i.id),
      })),
    );
    return { items };
  });

export const createGalleryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    title?: string;
    description?: string;
    media_type: "photo" | "video";
    file_path: string;
    thumbnail_path?: string | null;
  }) => {
    if (!d.file_path) throw new Error("File is required");
    if (!["photo", "video"].includes(d.media_type)) throw new Error("Invalid media type");
    return d;
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: userId });
    if (!isStaff) throw new Error("Forbidden");
    const { data: row, error } = await supabase
      .from("gallery_items")
      .insert({
        title: data.title?.trim() || null,
        description: data.description?.trim() || null,
        media_type: data.media_type,
        file_path: data.file_path,
        thumbnail_path: data.thumbnail_path ?? null,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteGalleryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: userId });
    if (!isStaff) throw new Error("Forbidden");
    const { error } = await supabase.from("gallery_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleGalleryLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; liked: boolean }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (data.liked) {
      const { error } = await supabase
        .from("gallery_likes")
        .delete()
        .eq("gallery_item_id", data.id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { liked: false };
    } else {
      const { error } = await supabase
        .from("gallery_likes")
        .insert({ gallery_item_id: data.id, user_id: userId });
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
      return { liked: true };
    }
  });