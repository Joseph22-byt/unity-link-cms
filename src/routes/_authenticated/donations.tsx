import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDonationQr, setDonationQr, clearDonationQr } from "@/lib/donations.functions";
import { getMyProfile } from "@/lib/members.functions";
import { Heart, Upload, Trash2, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/donations")({
  component: DonationsPage,
  errorComponent: ({ error }) => <div className="p-6">Error: {error.message}</div>,
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

const STAFF_ROLES = ["super_admin", "admin", "pastor"];

function DonationsPage() {
  const me = useServerFn(getMyProfile);
  const getQr = useServerFn(getDonationQr);
  const setQr = useServerFn(setDonationQr);
  const clearQr = useServerFn(clearDonationQr);

  const meQ = useQuery({ queryKey: ["me"], queryFn: () => me() });
  const qrQ = useQuery({ queryKey: ["donation-qr"], queryFn: () => getQr() });
  const isStaff = (meQ.data?.roles ?? []).some((r: string) => STAFF_ROLES.includes(r));

  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [method, setMethod] = useState("");
  const [uploading, setUploading] = useState(false);

  // Hydrate inputs when data loads
  if (qrQ.data && caption === "" && method === "" && (qrQ.data.caption || qrQ.data.method)) {
    if (qrQ.data.caption) setCaption(qrQ.data.caption);
    if (qrQ.data.method) setMethod(qrQ.data.method);
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `qr-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("donation-qr").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw upErr;
      await setQr({ data: { path, caption: caption || undefined, method: method || undefined } });
      toast.success("Donation QR updated — all members can now see it");
      qrQ.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const saveMeta = useMutation({
    mutationFn: () => setQr({ data: { path: qrQ.data!.path!, caption: caption || undefined, method: method || undefined } }),
    onSuccess: () => {
      toast.success("Saved");
      qrQ.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clearMut = useMutation({
    mutationFn: () => clearQr(),
    onSuccess: () => {
      toast.success("Donation QR cleared");
      setCaption("");
      setMethod("");
      qrQ.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Donations">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Member view — QR display */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-gold" />
            <h2 className="font-display text-xl">Give via QR Code</h2>
          </div>

          {qrQ.isLoading && <div className="text-muted-foreground text-sm">Loading…</div>}

          {!qrQ.isLoading && !qrQ.data?.public_url && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No donation QR has been set yet.
              {isStaff && <div className="mt-1">Upload one below to share with all members.</div>}
            </div>
          )}

          {qrQ.data?.public_url && (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <img src={qrQ.data.public_url} alt="Donation QR code" className="w-64 h-64 object-contain" />
              </div>
              {qrQ.data.method && <Badge variant="secondary">{qrQ.data.method}</Badge>}
              {qrQ.data.caption && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap max-w-md">{qrQ.data.caption}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Scan with your banking or payment app to donate.
              </p>
              <a href={qrQ.data.public_url} download className="inline-flex">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" /> Save QR image
                </Button>
              </a>
            </div>
          )}
        </Card>

        {/* Staff controls */}
        {isStaff && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="w-5 h-5 text-gold" />
              <h2 className="font-display text-xl">Manage Donation QR</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Only pastors and admins can set the QR. Once uploaded, it appears for every registered member.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Payment method (optional)</label>
                <Input
                  placeholder="e.g. UPI, PayPal, Bank transfer"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Caption / instructions (optional)</label>
                <Input
                  placeholder="e.g. Tithes & offerings — God bless you"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={500}
                />
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Uploading…" : qrQ.data?.public_url ? "Replace QR image" : "Upload QR image"}
                </Button>
                {qrQ.data?.public_url && (
                  <>
                    <Button variant="outline" onClick={() => saveMeta.mutate()} disabled={saveMeta.isPending}>
                      Save details
                    </Button>
                    <Button variant="ghost" onClick={() => clearMut.mutate()} disabled={clearMut.isPending}>
                      <Trash2 className="w-4 h-4 mr-2" /> Remove
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}