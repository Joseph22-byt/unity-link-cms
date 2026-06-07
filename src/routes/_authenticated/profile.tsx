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
import { getMyProfile, updateMyProfile } from "@/lib/members.functions";
import { toast } from "sonner";

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

  return (
    <div className="max-w-3xl space-y-6">
      <Card className="p-8 border-border">
        <div className="flex items-start gap-6 mb-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center font-display text-3xl text-ink" style={{ background: "var(--gradient-gold)" }}>
            {(form.first_name?.[0] ?? "") + (form.last_name?.[0] ?? "")}
          </div>
          <div>
            <div className="font-display text-2xl">{form.first_name} {form.last_name}</div>
            <div className="text-sm text-muted-foreground">{me.profile?.email}</div>
            <div className="mt-2 flex gap-2 flex-wrap">
              <Badge variant="secondary" className="font-mono">{me.profile?.membership_id}</Badge>
              <Badge variant="secondary" className="capitalize">{me.profile?.status}</Badge>
            </div>
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