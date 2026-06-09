import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense, useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getMyProfile, updateMyProfile, saveMyPhoto } from "@/lib/members.functions";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "My Profile — Sanctuary" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <AppShell title="My Profile">
      <Suspense fallback={<div className="text-muted-foreground">Loading…</div>}>
        <ProfileBody />
      </Suspense>
    </AppShell>
  );
}

function ProfileBody() {
  const fetchMe = useServerFn(getMyProfile);
  const save = useServerFn(updateMyProfile);
  const savePhoto = useServerFn(saveMyPhoto);
  const qc = useQueryClient();
  const { data: me } = useSuspenseQuery(queryOptions({ queryKey: ["me"], queryFn: () => fetchMe() }));

  const [form, setForm] = useState({
    first_name: me.profile?.first_name ?? "",
    last_name: me.profile?.last_name ?? "",
    phone: me.profile?.phone ?? "",
    ministry: me.profile?.ministry ?? "",
    address: me.profile?.address ?? "",
  });
  useEffect(() => {
    if (me.profile) setForm({
      first_name: me.profile.first_name ?? "",
      last_name: me.profile.last_name ?? "",
      phone: me.profile.phone ?? "",
      ministry: me.profile.ministry ?? "",
      address: me.profile.address ?? "",
    });
  }, [me.profile]);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !me.profile) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${me.profile.id}/photo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("member-photos").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      await savePhoto({ data: { path } });
      toast.success("Photo updated");
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Card className="p-8 border-border">
        <div className="flex items-start gap-6 mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center font-display text-3xl text-ink" style={{ background: "var(--gradient-gold)" }}>
              {me.photo_signed_url ? (
                <img src={me.photo_signed_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{(form.first_name?.[0] ?? "") + (form.last_name?.[0] ?? "")}</span>
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity" title="Upload photo">
              <Upload className="w-4 h-4" />
              <input type="file" accept="image/*" className="hidden" onChange={onPhotoChange} disabled={uploading} />
            </label>
          </div>
          <div>
            <div className="font-display text-2xl">{form.first_name} {form.last_name}</div>
            <div className="text-sm text-muted-foreground">{me.profile?.email}</div>
            <div className="mt-2 flex gap-2 flex-wrap">
              <Badge variant="secondary" className="font-mono">{me.profile?.membership_id}</Badge>
              <Badge variant="secondary" className="capitalize">{me.profile?.status}</Badge>
            </div>
            {uploading && <p className="text-xs text-muted-foreground mt-2">Uploading photo…</p>}
          </div>
        </div>

        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          try {
            await save({ data: form });
            toast.success("Profile updated");
            qc.invalidateQueries({ queryKey: ["me"] });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save");
          } finally { setSaving(false); }
        }}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>First name</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Last name</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="space-y-2"><Label>Ministry</Label><Input value={form.ministry} onChange={(e) => setForm({ ...form, ministry: e.target.value })} placeholder="e.g. Worship, Hospitality" /></div>
          <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground">{saving ? "Saving…" : "Save changes"}</Button>
        </form>
      </Card>
    </div>
  );
}