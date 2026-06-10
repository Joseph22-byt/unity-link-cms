import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { listMessages, createMessage, deleteMessage } from "@/lib/messages.functions";
import { getMyProfile } from "@/lib/members.functions";
import { Megaphone, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/messages")({
  component: MessagesPage,
  errorComponent: ({ error }) => <div className="p-6">Error: {error.message}</div>,
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

const STAFF_ROLES = ["super_admin", "admin"];

function MessagesPage() {
  const router = useRouter();
  const list = useServerFn(listMessages);
  const create = useServerFn(createMessage);
  const remove = useServerFn(deleteMessage);
  const me = useServerFn(getMyProfile);

  const meQ = useQuery({ queryKey: ["me"], queryFn: () => me() });
  const msgsQ = useQuery({ queryKey: ["messages"], queryFn: () => list() });

  const isStaff = (meQ.data?.roles ?? []).some((r: string) => STAFF_ROLES.includes(r));

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const createMut = useMutation({
    mutationFn: () => create({ data: { title, body } }),
    onSuccess: () => {
      toast.success("Message sent to all members");
      setTitle("");
      setBody("");
      msgsQ.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Message deleted");
      msgsQ.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Announcements">
      {isStaff && (
        <Card className="p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone className="w-5 h-5 text-gold" />
            <h2 className="font-display text-xl">Send a message to all members</h2>
          </div>
          <div className="space-y-3">
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
            <Textarea placeholder="Write your message…" value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={5000} />
            <div className="flex justify-end">
              <Button onClick={() => createMut.mutate()} disabled={!title.trim() || !body.trim() || createMut.isPending}>
                {createMut.isPending ? "Sending…" : "Send to all members"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {msgsQ.isLoading && <div className="text-muted-foreground">Loading messages…</div>}
        {msgsQ.data?.messages.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">No announcements yet.</Card>
        )}
        {msgsQ.data?.messages.map((m) => (
          <Card key={m.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-display text-lg">{m.title}</h3>
                  <Badge variant="secondary">Announcement</Badge>
                </div>
                <div className="text-xs text-muted-foreground mb-3">
                  From {m.author_name} · {new Date(m.created_at).toLocaleString()}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
              </div>
              {isStaff && (
                <Button variant="ghost" size="sm" onClick={() => delMut.mutate(m.id)} disabled={delMut.isPending}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}