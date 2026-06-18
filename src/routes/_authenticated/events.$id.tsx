import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getEvent,
  registerVolunteer,
  listEventVolunteers,
  deleteEvent,
  DEPARTMENT_OPTIONS,
} from "@/lib/events.functions";
import { getMyProfile } from "@/lib/members.functions";
import { ArrowLeft, CalendarDays, MapPin, Trash2, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/events/$id")({
  component: EventDetailPage,
  errorComponent: ({ error }) => <div className="p-6">Error: {error.message}</div>,
  notFoundComponent: () => <div className="p-6">Event not found</div>,
});

const STAFF_ROLES = ["super_admin", "admin", "pastor"];

const DEPARTMENT_LABELS: Record<string, string> = {
  food: "Food",
  parking: "Parking",
  helper: "Helper",
  children_management: "Children Management",
  water_keeper: "Water Keeper",
  pastor_assistant: "Pastor Assistant",
};

function EventDetailPage() {
  const { id } = Route.useParams();
  const fetchEvent = useServerFn(getEvent);
  const fetchMe = useServerFn(getMyProfile);
  const register = useServerFn(registerVolunteer);
  const fetchVolunteers = useServerFn(listEventVolunteers);
  const remove = useServerFn(deleteEvent);
  const navigate = Route.useNavigate();

  const meQ = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });
  const eventQ = useQuery({ queryKey: ["event", id], queryFn: () => fetchEvent({ data: { id } }) });
  const isStaff = (meQ.data?.roles ?? []).some((r: string) => STAFF_ROLES.includes(r));

  const volunteersQ = useQuery({
    queryKey: ["event-volunteers", id],
    queryFn: () => fetchVolunteers({ data: { event_id: id } }),
    enabled: isStaff,
  });

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    department: "" as "" | (typeof DEPARTMENT_OPTIONS)[number],
    notes: "",
  });

  // Prefill from profile
  const profile = meQ.data?.profile;
  if (profile && !form.full_name && !form.email) {
    const fn = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
    if (fn || profile.email || profile.phone) {
      setForm((f) => ({
        ...f,
        full_name: f.full_name || fn,
        email: f.email || profile.email || "",
        phone: f.phone || profile.phone || "",
      }));
    }
  }

  const registerMut = useMutation({
    mutationFn: () =>
      register({
        data: {
          event_id: id,
          full_name: form.full_name,
          phone: form.phone,
          email: form.email,
          department: form.department as (typeof DEPARTMENT_OPTIONS)[number],
          notes: form.notes,
        },
      }),
    onSuccess: () => {
      toast.success("Registered as volunteer. The team will reach out!");
      setForm({ ...form, notes: "", department: "" });
      eventQ.refetch();
      volunteersQ.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: () => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Event deleted");
      navigate({ to: "/events" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (eventQ.isLoading) {
    return <AppShell title="Event"><div className="text-muted-foreground">Loading…</div></AppShell>;
  }
  if (!eventQ.data) {
    return <AppShell title="Event"><div className="text-muted-foreground">Not found.</div></AppShell>;
  }

  const { event, cover_signed_url, photo_signed_urls, my_registrations } = eventQ.data;
  const date = new Date(event.event_date);

  return (
    <AppShell title={event.title}>
      <div className="max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/events" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> All events
          </Link>
          {isStaff && (
            <Button variant="ghost" size="sm" onClick={() => {
              if (confirm("Delete this event? This cannot be undone.")) deleteMut.mutate();
            }}>
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          )}
        </div>

        {cover_signed_url && (
          <div className="aspect-[21/9] rounded-xl overflow-hidden bg-muted">
            <img src={cover_signed_url} alt={event.title} className="w-full h-full object-cover" />
          </div>
        )}

        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
            <span className="inline-flex items-center gap-1"><CalendarDays className="w-4 h-4" /> {date.toLocaleString()}</span>
            {event.location && <span className="inline-flex items-center gap-1"><MapPin className="w-4 h-4" /> {event.location}</span>}
          </div>
          {event.description && (
            <p className="whitespace-pre-wrap text-base leading-relaxed">{event.description}</p>
          )}
        </Card>

        {photo_signed_urls.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {photo_signed_urls.map((url, i) => (
              <div key={i} className="aspect-square rounded-lg overflow-hidden bg-muted">
                <img src={url} alt={`Event photo ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        {!isStaff && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-gold" />
              <h2 className="font-display text-xl">Volunteer for this event</h2>
            </div>
            {my_registrations.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">You're signed up as:</span>
                {my_registrations.map((r) => (
                  <Badge key={r.id} variant="secondary">{DEPARTMENT_LABELS[r.department] ?? r.department}</Badge>
                ))}
              </div>
            )}
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!form.department) {
                  toast.error("Please choose a department");
                  return;
                }
                registerMut.mutate();
              }}
            >
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full name</Label>
                  <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required maxLength={120} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required maxLength={30} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required maxLength={255} />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v as (typeof DEPARTMENT_OPTIONS)[number] })}>
                    <SelectTrigger><SelectValue placeholder="Choose a department" /></SelectTrigger>
                    <SelectContent>
                      {DEPARTMENT_OPTIONS.map((d) => (
                        <SelectItem key={d} value={d}>{DEPARTMENT_LABELS[d]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={1000} />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={registerMut.isPending}>
                  {registerMut.isPending ? "Submitting…" : "Register as volunteer"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {isStaff && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-gold" />
              <h2 className="font-display text-xl">Volunteers ({volunteersQ.data?.volunteers.length ?? 0})</h2>
            </div>
            {volunteersQ.isLoading && <div className="text-muted-foreground text-sm">Loading…</div>}
            {volunteersQ.data?.volunteers.length === 0 && (
              <div className="text-muted-foreground text-sm">No volunteers yet.</div>
            )}
            <div className="space-y-2">
              {volunteersQ.data?.volunteers.map((v) => (
                <div key={v.id} className="border border-border rounded-md p-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{v.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      <a href={`mailto:${v.email}`} className="hover:underline">{v.email}</a>
                      {" · "}
                      <a href={`tel:${v.phone}`} className="hover:underline">{v.phone}</a>
                    </div>
                    {v.notes && <div className="text-xs mt-1 whitespace-pre-wrap">{v.notes}</div>}
                  </div>
                  <Badge variant="secondary">{DEPARTMENT_LABELS[v.department] ?? v.department}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}