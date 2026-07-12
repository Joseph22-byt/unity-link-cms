import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listEvents, createEvent, registerVolunteer, DEPARTMENT_OPTIONS } from "@/lib/events.functions";
import { getMyProfile } from "@/lib/members.functions";
import { CalendarDays, MapPin, Plus, ImagePlus, HandHeart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({ meta: [{ title: "Events — Jessa Thetraravalar Ministries" }] }),
  component: EventsPage,
  errorComponent: ({ error }) => <div className="p-6">Error: {error.message}</div>,
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

const STAFF_ROLES = ["super_admin", "admin", "pastor"];

const DEPARTMENT_LABELS: Record<string, string> = {
  food: "Food",
  parking: "Parking",
  helper: "Helper",
  children_management: "Children Management",
  water_keeper: "Water Keeper",
  pastor_assistant: "Pastor Assistant",
  chair_arrangement: "Chair Arrangement",
};

function EventsPage() {
  const fetchEvents = useServerFn(listEvents);
  const fetchMe = useServerFn(getMyProfile);
  const create = useServerFn(createEvent);
  const register = useServerFn(registerVolunteer);

  const meQ = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });
  const eventsQ = useQuery({ queryKey: ["events"], queryFn: () => fetchEvents() });

  const isStaff = (meQ.data?.roles ?? []).some((r: string) => STAFF_ROLES.includes(r));

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", location: "", event_date: "" });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<{ id: string; title: string } | null>(null);
  const [volunteerForm, setVolunteerForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    department: "" as "" | (typeof DEPARTMENT_OPTIONS)[number],
    notes: "",
  });

  useEffect(() => {
    const profile = meQ.data?.profile;
    if (!profile) return;
    const fullName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
    setVolunteerForm((current) => ({
      ...current,
      full_name: current.full_name || fullName,
      email: current.email || profile.email || "",
      phone: current.phone || profile.phone || "",
    }));
  }, [meQ.data?.profile]);

  const registerMut = useMutation({
    mutationFn: () => {
      if (!selectedEvent) throw new Error("Choose an event first");
      if (!volunteerForm.full_name.trim()) throw new Error("Please enter your name");
      if (!volunteerForm.phone.trim()) throw new Error("Please enter your phone number");
      if (!volunteerForm.email.trim()) throw new Error("Please enter your email");
      return register({
        data: {
          event_id: selectedEvent.id,
          full_name: volunteerForm.full_name,
          phone: volunteerForm.phone,
          email: volunteerForm.email,
          department: volunteerForm.department as (typeof DEPARTMENT_OPTIONS)[number],
          notes: volunteerForm.notes,
        },
      });
    },
    onSuccess: () => {
      toast.success("Volunteer registration submitted. Admins can now see it.");
      setVolunteerForm((current) => ({ ...current, department: "", notes: "" }));
      setSelectedEvent(null);
    },
    onError: (error: Error) => {
      const message = error.message || "Registration failed. Please try again.";
      toast.error(
        message.includes("event_volunteers_event_id_user_id_department_key") || message.includes("duplicate key")
          ? "You are already registered for this event department."
          : message,
      );
    },
  });

  async function uploadOne(file: File, prefix: string): Promise<string> {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("event-photos").upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return path;
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.event_date) {
      toast.error("Title and date are required");
      return;
    }
    setSubmitting(true);
    try {
      const prefix = `events/${Date.now()}`;
      const cover_photo_url = coverFile ? await uploadOne(coverFile, prefix) : null;
      const photo_urls: string[] = [];
      for (const f of photoFiles) photo_urls.push(await uploadOne(f, prefix));
      await create({
        data: {
          title: form.title,
          description: form.description,
          location: form.location,
          event_date: new Date(form.event_date).toISOString(),
          cover_photo_url,
          photo_urls,
        },
      });
      toast.success("Event created");
      setShowForm(false);
      setForm({ title: "", description: "", location: "", event_date: "" });
      setCoverFile(null);
      setPhotoFiles([]);
      eventsQ.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setSubmitting(false);
    }
  }

  function openVolunteerForm(event: { id: string; title: string }) {
    setSelectedEvent(event);
  }

  function submitVolunteer(e: React.FormEvent) {
    e.preventDefault();
    if (registerMut.isPending) return;
    if (!volunteerForm.department) {
      toast.error("Please choose a department");
      return;
    }
    registerMut.mutate();
  }

  return (
    <AppShell title="Events">
      {isStaff && (
        <div className="mb-6 flex justify-end">
          <Button onClick={() => setShowForm((s) => !s)}>
            <Plus className="w-4 h-4 mr-1" /> {showForm ? "Cancel" : "Create Event"}
          </Button>
        </div>
      )}

      {isStaff && showForm && (
        <Card className="p-6 mb-6">
          <form onSubmit={onCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={200} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date & time</Label>
                <Input type="datetime-local" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={5000} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cover photo</Label>
                <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
              </div>
              <div className="space-y-2">
                <Label>Additional photos</Label>
                <Input type="file" accept="image/*" multiple onChange={(e) => setPhotoFiles(Array.from(e.target.files ?? []))} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                <ImagePlus className="w-4 h-4 mr-1" />
                {submitting ? "Saving…" : "Publish event"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {eventsQ.isLoading && <div className="text-muted-foreground">Loading events…</div>}
        {eventsQ.data?.events.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground md:col-span-2 lg:col-span-3">
            No events yet.
          </Card>
        )}
        {eventsQ.data?.events.map((ev) => {
          const date = new Date(ev.event_date);
          const upcoming = date.getTime() > Date.now();
          return (
            <Card key={ev.id} className="overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
              <Link to="/events/$id" params={{ id: ev.id }} className="block">
                <div className="aspect-video bg-muted relative">
                  {ev.cover_signed_url ? (
                    <img src={ev.cover_signed_url} alt={ev.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <CalendarDays className="w-10 h-10" />
                    </div>
                  )}
                  <Badge className="absolute top-2 right-2" variant={upcoming ? "default" : "secondary"}>
                    {upcoming ? "Upcoming" : "Past"}
                  </Badge>
                </div>
              </Link>
                <div className="p-4 flex-1 flex flex-col">
                  <Link to="/events/$id" params={{ id: ev.id }} className="hover:underline">
                    <h3 className="font-display text-lg leading-snug mb-1 line-clamp-2">{ev.title}</h3>
                  </Link>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {date.toLocaleString()}
                  </div>
                  {ev.location && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {ev.location}
                    </div>
                  )}
                  {ev.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{ev.description}</p>
                  )}
                  {!isStaff && (
                    <div className="mt-4 pt-3 border-t border-border">
                      <Button
                        type="button"
                        size="sm"
                        className="w-full"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openVolunteerForm({ id: ev.id, title: ev.title });
                        }}
                      >
                        <HandHeart className="w-4 h-4 mr-1" /> Click to register as volunteer
                      </Button>
                    </div>
                  )}
                </div>
            </Card>
          );
        })}
      </div>

      {!isStaff && (
        <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Volunteer Registration</DialogTitle>
              <DialogDescription>
                {selectedEvent ? `Register for ${selectedEvent.title}` : "Choose the department where you want to serve."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submitVolunteer} className="space-y-4 pt-2">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full name</Label>
                  <Input value={volunteerForm.full_name} onChange={(e) => setVolunteerForm({ ...volunteerForm, full_name: e.target.value })} required maxLength={120} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={volunteerForm.phone} onChange={(e) => setVolunteerForm({ ...volunteerForm, phone: e.target.value })} required maxLength={30} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={volunteerForm.email} onChange={(e) => setVolunteerForm({ ...volunteerForm, email: e.target.value })} required maxLength={255} />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select
                    value={volunteerForm.department}
                    onValueChange={(value) => setVolunteerForm({ ...volunteerForm, department: value as (typeof DEPARTMENT_OPTIONS)[number] })}
                  >
                    <SelectTrigger><SelectValue placeholder="Choose a department" /></SelectTrigger>
                    <SelectContent>
                      {DEPARTMENT_OPTIONS.map((department) => (
                        <SelectItem key={department} value={department}>{DEPARTMENT_LABELS[department]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea rows={3} value={volunteerForm.notes} onChange={(e) => setVolunteerForm({ ...volunteerForm, notes: e.target.value })} maxLength={1000} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setSelectedEvent(null)}>Cancel</Button>
                <Button type="submit" disabled={registerMut.isPending}>
                  {registerMut.isPending ? "Submitting…" : "Submit registration"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </AppShell>
  );
}