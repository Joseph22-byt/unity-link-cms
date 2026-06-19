import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { listEbooks, createEbook, deleteEbook, getEbookFileUrl } from "@/lib/ebooks.functions";
import { getMyProfile } from "@/lib/members.functions";
import { BookOpen, Plus, Trash2, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ebooks")({
  head: () => ({ meta: [{ title: "Ebooks — Jessa Thetraravalar Ministries" }] }),
  component: EbooksPage,
  errorComponent: ({ error }) => <div className="p-6">Error: {error.message}</div>,
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

const STAFF_ROLES = ["super_admin", "admin", "pastor"];

function EbooksPage() {
  const fetchEbooks = useServerFn(listEbooks);
  const fetchMe = useServerFn(getMyProfile);
  const create = useServerFn(createEbook);
  const remove = useServerFn(deleteEbook);
  const fetchUrl = useServerFn(getEbookFileUrl);

  const meQ = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });
  const ebooksQ = useQuery({ queryKey: ["ebooks"], queryFn: () => fetchEbooks() });
  const isStaff = (meQ.data?.roles ?? []).some((r: string) => STAFF_ROLES.includes(r));

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", author: "", description: "" });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [bookFile, setBookFile] = useState<File | null>(null);

  async function uploadOne(file: File, prefix: string): Promise<string> {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("ebooks").upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return path;
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !bookFile) {
      toast.error("Title and book file are required");
      return;
    }
    setSubmitting(true);
    try {
      const prefix = `book-${Date.now()}`;
      const file_path = await uploadOne(bookFile, prefix);
      const cover_path = coverFile ? await uploadOne(coverFile, prefix) : null;
      await create({ data: { title: form.title, author: form.author, description: form.description, file_path, cover_path } });
      toast.success("Ebook uploaded");
      setShowForm(false);
      setForm({ title: "", author: "", description: "" });
      setCoverFile(null);
      setBookFile(null);
      ebooksQ.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  const removeMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); ebooksQ.refetch(); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function readBook(id: string) {
    try {
      const { url } = await fetchUrl({ data: { id } });
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else toast.error("Could not open book");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open");
    }
  }

  return (
    <AppShell title="Ebooks">
      {isStaff && (
        <div className="mb-6 flex justify-end">
          <Button onClick={() => setShowForm((s) => !s)}>
            <Plus className="w-4 h-4 mr-1" /> {showForm ? "Cancel" : "Upload Ebook"}
          </Button>
        </div>
      )}

      {isStaff && showForm && (
        <Card className="p-6 mb-6">
          <form onSubmit={onCreate} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={200} />
              </div>
              <div className="space-y-2">
                <Label>Author</Label>
                <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} maxLength={120} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={2000} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cover image</Label>
                <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
              </div>
              <div className="space-y-2">
                <Label>Book file (PDF, EPUB)</Label>
                <Input type="file" accept=".pdf,.epub,application/pdf,application/epub+zip" onChange={(e) => setBookFile(e.target.files?.[0] ?? null)} required />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>{submitting ? "Uploading…" : "Publish"}</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {ebooksQ.isLoading && <div className="text-muted-foreground">Loading…</div>}
        {ebooksQ.data?.ebooks.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground sm:col-span-2 lg:col-span-3">No ebooks yet.</Card>
        )}
        {ebooksQ.data?.ebooks.map((b) => (
          <Card key={b.id} className="overflow-hidden flex flex-col">
            <div className="aspect-[3/4] bg-muted relative">
              {b.cover_url ? (
                <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <BookOpen className="w-12 h-12" />
                </div>
              )}
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-display text-lg leading-snug line-clamp-2">{b.title}</h3>
              {b.author && <div className="text-xs text-muted-foreground mt-1">by {b.author}</div>}
              {b.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{b.description}</p>}
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={() => readBook(b.id)} className="flex-1">
                  <ExternalLink className="w-4 h-4 mr-1" /> Read
                </Button>
                {isStaff && (
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this ebook?")) removeMut.mutate(b.id); }}>
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