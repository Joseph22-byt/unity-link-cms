import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense, useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MemberIdCard } from "@/components/MemberIdCard";
import { getMyProfile } from "@/lib/members.functions";
import { Download, Printer } from "lucide-react";
import html2canvas from "html2canvas";

export const Route = createFileRoute("/_authenticated/id-card")({
  head: () => ({ meta: [{ title: "My ID Card — Sanctuary" }] }),
  component: () => (
    <AppShell title="My Digital ID Card">
      <Suspense fallback={<div className="text-muted-foreground">Loading…</div>}>
        <Body />
      </Suspense>
    </AppShell>
  ),
});

function Body() {
  const fetchMe = useServerFn(getMyProfile);
  const { data: me } = useSuspenseQuery(queryOptions({ queryKey: ["me"], queryFn: () => fetchMe() }));
  const cardRef = useRef<HTMLDivElement>(null);

  if (!me.profile) return <p>No profile.</p>;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const verifyUrl = `${origin}/verify/${me.profile.membership_id}`;

  async function download() {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, { scale: 3, backgroundColor: null, useCORS: true });
    const link = document.createElement("a");
    link.download = `${me.profile?.membership_id ?? "id-card"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div ref={cardRef} className="inline-block">
        <MemberIdCard
          member={{
            first_name: me.profile.first_name,
            last_name: me.profile.last_name,
            membership_id: me.profile.membership_id,
            ministry: me.profile.ministry,
            status: me.profile.status,
            member_since: me.profile.created_at,
            photo_signed_url: me.photo_signed_url,
          }}
          verifyUrl={verifyUrl}
        />
      </div>

      <div className="flex gap-3">
        <Button onClick={download} className="bg-primary text-primary-foreground"><Download className="w-4 h-4 mr-2" /> Download PNG</Button>
        <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" /> Print</Button>
      </div>

      <Card className="p-6 border-border">
        <h3 className="font-display text-xl mb-2">How verification works</h3>
        <p className="text-sm text-muted-foreground">Anyone can scan the QR code on your card to confirm your membership status. The verification page reveals only your name, ministry, membership ID, and active status — no contact details.</p>
        <p className="text-xs text-muted-foreground mt-3 font-mono break-all">{verifyUrl}</p>
      </Card>
    </div>
  );
}