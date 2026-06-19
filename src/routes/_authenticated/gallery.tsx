import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listGallery, createGalleryItem, deleteGalleryItem, toggleGalleryLike } from "@/lib/gallery.functions";
import { getMyProfile } from "@/lib/members.functions";
import { ImageIcon, Plus, Trash2, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/gallery")({
  head: () => ({ meta: [{ title: "Gallery — Jessa Thetraravalar Ministries" }] }),
  component: GalleryPage,
  errorComponent: ({ error }) => <div className="p-6">Error: {error.message}</div>,
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

const STAFF_ROLES = ["super_admin", "admin", "pastor"];

function GalleryPage() {
  const qc = useQueryClient();
  const fetchItems = useServerFn(listGallery);
  const fetchMe = useServerFn(getMyProfile);
  const create = useServerFn(createGalleryItem);
  const remove = useServerFn(deleteGalleryItem);
  const like = useServerFn(toggleGalleryLike);

  const meQ = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });
  const itemsQ = useQuery({ queryKey: ["gallery"], queryFn: () => fetchItems() });
  const isStaff = (meQ.data?.roles ?? []).some((r: string) => STAFF_ROLES.includes(r));

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const [mediaFile, setMediaFile] = useState<File | null>(null);

  async function uploadOne(file: File): Promise<string> {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("gallery").upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return path;
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!mediaFile) {
      toast.error("Pick a photo or video");
      return;
    }
    setSubmitting(true);
    try {
      const file_path = await uploadOne(mediaFile);
      const media_type: "photo" | "video" = mediaFile.type.startsWith("video") ? "video" : "photo";
      await create({ data: { title: form.title, description: form.description, media_type, file_path } });
      toast.success("Uploaded to gallery");
      setShowForm(false);
      setForm({ title: "", description: "" });
      setMediaFile(null);
      itemsQ.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  const removeMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); itemsQ.refetch(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const likeMut = useMutation({
    mutationFn: ({ id, liked }: { id: string; liked: boolean }) => like({ data: { id, liked } }),
    onMutate: async ({ id, liked }) => {
      await qc.cancelQueries({ queryKey: ["gallery"] });
      const prev = qc.getQueryData<any>(["gallery"]);
      qc.setQueryData<any>(["gallery"], (old: any) => old ? {
        items: old.items.map((it: any) => it.id === id ? { ...it, liked_by_me: !liked, likes: it.likes + (liked ? -1 : 1) } : it),
      } : old);
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["gallery"], ctx.prev); },
    onSettled: () => itemsQ.refetch(),
  });

  return (
    <AppShell title="Gallery">
      {isStaff && (
        <div className="mb-6 flex justify-end">
          <Button onClick={() => setShowForm((s) => !s)}>
            <Plus className="w-4 h-4 mr-1" /> {showForm ? "Cancel" : "Upload Media"}
          </Button>
        </div>
      )}

      {isStaff && showForm && (
        <Card className="p-6 mb-6">
          <form onSubmit={onCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Title (optional)</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={2000} />
            </div>
            <div className="space-y-2">
              <Label>Photo or video</Label>
              <Input type="file" accept="image/*,video/*" onChange={(e) => setMediaFile(e.target.files?.[0] ?? null)} required />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>{submitting ? "Uploading…" : "Publish"}</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {itemsQ.isLoading && <div className="text-muted-foreground">Loading…</div>}
        {itemsQ.data?.items.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground sm:col-span-2 lg:col-span-3">Nothing here yet.</Card>
        )}
        {itemsQ.data?.items.map((it: any) => (
          <Card key={it.id} className="overflow-hidden flex flex-col">
            <div className="aspect-square bg-muted relative">
              {it.url ? (
                it.media_type === "video" ? (
                  <video src={it.url} controls className="w-full h-full object-cover" />
                ) : (
                  <img src={it.url} alt={it.title ?? ""} className="w-full h-full object-cover" />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="w-12 h-12" />
                </div>
              )}
            </div>
            <div className="p-4 flex-1 flex flex-col gap-2">
              {it.title && <h3 className="font-display text-base leading-snug line-clamp-2">{it.title}</h3>}
              {it.description && <p className="text-sm text-muted-foreground line-clamp-3">{it.description}</p>}
              <div className="mt-auto flex items-center justify-between">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => likeMut.mutate({ id: it.id, liked: it.liked_by_me })}
                  className="gap-1"
                >
                  <Heart className={cn("w-4 h-4", it.liked_by_me && "fill-red-500 text-red-500")} />
                  <span className="text-sm">{it.likes}</span>
                </Button>
                {isStaff && (
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this item?")) removeMut.mutate(it.id); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}