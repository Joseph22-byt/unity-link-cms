import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listMembers, setMemberStatus, getMyProfile } from "@/lib/members.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/members")({
  head: () => ({ meta: [{ title: "Members — Sanctuary" }] }),
  component: MembersPage,
});

function MembersPage() {
  return (
    <AppShell title="Members">
      <Suspense fallback={<div className="text-muted-foreground">Loading…</div>}>
        <MembersBody />
      </Suspense>
    </AppShell>
  );
}

function MembersBody() {
  const fetchMe = useServerFn(getMyProfile);
  const fetchMembers = useServerFn(listMembers);
  const updateStatus = useServerFn(setMemberStatus);
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data: me } = useSuspenseQuery(queryOptions({ queryKey: ["me"], queryFn: () => fetchMe() }));
  const isStaff = me.roles.some((r) => ["admin", "super_admin", "pastor"].includes(r));

  const { data } = useSuspenseQuery(queryOptions({ queryKey: ["members"], queryFn: () => fetchMembers() }));

  if (!isStaff) {
    return (
      <Card className="p-8 border-border">
        <h3 className="font-display text-2xl mb-2">Restricted</h3>
        <p className="text-muted-foreground">The member directory is available to pastors and administrators only.</p>
      </Card>
    );
  }

  const filtered = data.members.filter((m) =>
    !q ||
    `${m.first_name ?? ""} ${m.last_name ?? ""} ${m.email ?? ""} ${m.membership_id ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <Input placeholder="Search members…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        <p className="text-sm text-muted-foreground">{filtered.length} of {data.members.length}</p>
      </div>
      <Card className="border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left">
              <tr>
                <th className="px-5 py-3 font-medium">Member</th>
                <th className="px-5 py-3 font-medium">ID</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="px-5 py-3">
                    <div className="font-medium">{m.first_name} {m.last_name}</div>
                    {m.ministry && <div className="text-xs text-muted-foreground">{m.ministry}</div>}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs">{m.membership_id}</td>
                  <td className="px-5 py-3">
                    <div>{m.email}</div>
                    <div className="text-xs text-muted-foreground">{m.phone}</div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant="secondary" className={
                      m.status === "active" ? "bg-gold/20 text-ink" :
                      m.status === "pending" ? "bg-secondary" : "bg-muted"
                    }>{m.status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {m.status !== "active" && (
                      <Button size="sm" variant="outline" onClick={async () => {
                        await updateStatus({ data: { id: m.id, status: "active" } });
                        toast.success("Member approved");
                        qc.invalidateQueries({ queryKey: ["members"] });
                        qc.invalidateQueries({ queryKey: ["stats"] });
                      }}>Approve</Button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">No members found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}