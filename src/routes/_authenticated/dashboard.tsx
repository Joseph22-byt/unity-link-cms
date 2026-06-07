import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMyProfile, getStats } from "@/lib/members.functions";
import { Users, UserCheck, UserPlus, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Sanctuary" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <AppShell title="Dashboard">
      <Suspense fallback={<div className="text-muted-foreground">Loading…</div>}>
        <DashboardBody />
      </Suspense>
    </AppShell>
  );
}

function DashboardBody() {
  const fetchProfile = useServerFn(getMyProfile);
  const fetchStats = useServerFn(getStats);
  const { data: me } = useSuspenseQuery(queryOptions({ queryKey: ["me"], queryFn: () => fetchProfile() }));
  const isStaff = me.roles.some((r) => ["admin", "super_admin", "pastor"].includes(r));
  const { data: stats } = useSuspenseQuery(queryOptions({ queryKey: ["stats"], queryFn: () => fetchStats() }));

  return (
    <div className="space-y-8">
      <Card className="p-8 border-border" style={{ background: "var(--gradient-sacred)" }}>
        <div className="text-background">
          <p className="text-gold text-xs uppercase tracking-[0.2em] mb-3">Peace be with you</p>
          <h2 className="font-display text-4xl">{me.profile?.first_name ? `Welcome, ${me.profile.first_name}` : "Welcome"}</h2>
          <p className="mt-3 text-background/70">Membership ID · <span className="font-mono text-gold">{me.profile?.membership_id}</span></p>
          <div className="mt-5 flex flex-wrap gap-2">
            {me.roles.map((r) => <Badge key={r} variant="secondary" className="bg-background/10 text-background border-0 capitalize">{r.replace("_", " ")}</Badge>)}
            <Badge variant="secondary" className="bg-gold/20 text-gold border-0 capitalize">{me.profile?.status}</Badge>
          </div>
        </div>
      </Card>

      {isStaff && (
        <>
          <h3 className="font-display text-2xl">Congregation at a glance</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Total members" value={stats.total} />
            <StatCard icon={UserCheck} label="Active" value={stats.active} />
            <StatCard icon={Clock} label="Pending approval" value={stats.pending} accent />
            <StatCard icon={UserPlus} label="New (30 days)" value={stats.recent} />
          </div>
        </>
      )}

      {!isStaff && (
        <Card className="p-8 border-border">
          <h3 className="font-display text-2xl mb-2">Your membership</h3>
          <p className="text-muted-foreground text-sm">More features — giving history, event registrations, your digital ID card — are arriving soon. For now, please ensure your profile is up to date.</p>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: number; accent?: boolean }) {
  return (
    <Card className="p-5 border-border">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="font-display text-3xl mt-2">{value}</div>
        </div>
        <div className={`w-10 h-10 rounded-md flex items-center justify-center ${accent ? "bg-gold/20 text-gold" : "bg-secondary text-primary"}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}