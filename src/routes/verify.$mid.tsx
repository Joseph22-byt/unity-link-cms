import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { MemberIdCard } from "@/components/MemberIdCard";
import { verifyMembership } from "@/lib/members.functions";
import { ShieldCheck, ShieldAlert, Church } from "lucide-react";

export const Route = createFileRoute("/verify/$mid")({
  head: ({ params }) => ({
    meta: [
      { title: `Verify ${params.mid} — Sanctuary` },
      { name: "description", content: "Membership verification for Sanctuary Church." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifyPage,
  errorComponent: () => <Shell><Failed /></Shell>,
  notFoundComponent: () => <Shell><Failed /></Shell>,
});

function VerifyPage() {
  return (
    <Shell>
      <Suspense fallback={<p className="text-muted-foreground">Verifying…</p>}>
        <Body />
      </Suspense>
    </Shell>
  );
}

function Body() {
  const { mid } = Route.useParams();
  const verify = useServerFn(verifyMembership);
  const { data } = useSuspenseQuery(queryOptions({
    queryKey: ["verify", mid],
    queryFn: () => verify({ data: { membership_id: mid } }),
  }));

  if (!data.found) return <Failed />;
  const m = data.member;
  const active = m.status === "active";

  return (
    <div className="space-y-6 w-full max-w-md">
      <Card className={`p-5 border-border flex items-center gap-3 ${active ? "bg-gold/10" : "bg-muted"}`}>
        {active ? <ShieldCheck className="w-6 h-6 text-gold" /> : <ShieldAlert className="w-6 h-6 text-muted-foreground" />}
        <div>
          <div className="font-display text-lg leading-none">{active ? "Verified member" : "Membership inactive"}</div>
          <div className="text-xs text-muted-foreground mt-1 capitalize">Status: {m.status}</div>
        </div>
      </Card>

      <div className="flex justify-center">
        <MemberIdCard member={m} verifyUrl={typeof window !== "undefined" ? window.location.href : ""} />
      </div>

      <p className="text-xs text-center text-muted-foreground">Verified by Sanctuary Church Management.</p>
    </div>
  );
}

function Failed() {
  return (
    <Card className="p-8 border-border text-center max-w-md">
      <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
      <h2 className="font-display text-2xl">Not found</h2>
      <p className="text-sm text-muted-foreground mt-2">This membership ID could not be verified.</p>
    </Card>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Link to="/" className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: "var(--gradient-gold)" }}>
          <Church className="w-5 h-5 text-ink" />
        </div>
        <div className="font-display text-xl">Sanctuary</div>
      </Link>
      {children}
    </div>
  );
}