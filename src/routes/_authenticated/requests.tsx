import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { listMembershipRequests, updateRequestStatus } from "@/lib/membership-requests.functions";
import { getMyProfile } from "@/lib/members.functions";
import { CheckCircle, XCircle, Clock, Mail, Phone, User, MessageSquare, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/requests")({
  component: RequestsPage,
  errorComponent: ({ error }) => <div className="p-6">Error: {error.message}</div>,
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

const STAFF_ROLES = ["super_admin", "admin", "pastor"];

function RequestsPage() {
  const list = useServerFn(listMembershipRequests);
  const update = useServerFn(updateRequestStatus);
  const me = useServerFn(getMyProfile);

  const meQ = useQuery({ queryKey: ["me"], queryFn: () => me() });
  const isStaff = (meQ.data?.roles ?? []).some((r: string) => STAFF_ROLES.includes(r));

  const reqQ = useQuery({ queryKey: ["membership-requests"], queryFn: () => list() });

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" }) =>
      update({ data: { id, status } }),
    onSuccess: () => {
      toast.success("Request updated");
      reqQ.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pending = (reqQ.data?.requests ?? []).filter((r) => r.status === "pending");
  const reviewed = (reqQ.data?.requests ?? []).filter((r) => r.status !== "pending");

  if (!isStaff) {
    return (
      <AppShell title="Join Requests">
        <div className="text-muted-foreground">You do not have permission to view this page.</div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Join Requests">
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-xl mb-1">Pending Requests</h2>
          <p className="text-sm text-muted-foreground">Review and approve new membership requests.</p>
        </div>

        {pending.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">No pending requests.</Card>
        )}

        <div className="space-y-3">
          {pending.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-lg">{r.full_name}</h3>
                    <Badge variant="outline" className="capitalize">{r.requested_role}</Badge>
                    <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {r.email}</span>
                    {r.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {r.phone}</span>}
                  </div>
                  {r.message && (
                    <div className="flex items-start gap-1.5 text-sm text-foreground/80 pt-1">
                      <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <p className="leading-relaxed">{r.message}</p>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground pt-1">
                    Submitted {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-green-600 border-green-200 hover:bg-green-50"
                    onClick={() => updateMut.mutate({ id: r.id, status: "approved" })}
                    disabled={updateMut.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => updateMut.mutate({ id: r.id, status: "rejected" })}
                    disabled={updateMut.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {reviewed.length > 0 && (
          <>
            <div className="pt-4 border-t border-border">
              <h2 className="font-display text-xl mb-1">Reviewed</h2>
              <p className="text-sm text-muted-foreground">Previously handled requests.</p>
            </div>
            <div className="space-y-3">
              {reviewed.map((r) => (
                <Card key={r.id} className="p-5 opacity-70">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display text-lg">{r.full_name}</h3>
                        <Badge variant="outline" className="capitalize">{r.requested_role}</Badge>
                        {r.status === "approved" ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>
                        ) : (
                          <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {r.email}</span>
                        {r.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {r.phone}</span>}
                      </div>
                      {r.reviewed_at && (
                        <div className="text-xs text-muted-foreground pt-1">
                          Reviewed {new Date(r.reviewed_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                    {r.status !== "approved" && (
                      <div className="shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => updateMut.mutate({ id: r.id, status: "approved" })}
                          disabled={updateMut.isPending}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> Approve
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
