import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DEPARTMENTS = [
  "food",
  "parking",
  "helper",
  "children_management",
  "water_keeper",
  "pastor_assistant",
  "chair_arrangement",
] as const;
type Department = (typeof DEPARTMENTS)[number];

async function signMany(supabase: any, paths: string[]) {
  if (!paths.length) return [] as string[];
  const out: string[] = [];
  for (const p of paths) {
    const { data } = await supabase.storage.from("event-photos").createSignedUrl(p, 60 * 60);
    if (data?.signedUrl) out.push(data.signedUrl);
  }
  return out;
}

async function signOne(supabase: any, path: string | null | undefined) {
  if (!path) return null;
  const { data } = await supabase.storage.from("event-photos").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export const listEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("events")
      .select("id, title, description, location, event_date, cover_photo_url, photo_urls, created_at")
      .order("event_date", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const events = await Promise.all(
      (data ?? []).map(async (e) => ({
        ...e,
        cover_signed_url: await signOne(supabase, e.cover_photo_url),
      })),
    );
    return { events };
  });

export const getEvent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: event, error } = await supabase
      .from("events")
      .select("id, title, description, location, event_date, cover_photo_url, photo_urls, created_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!event) throw new Error("Event not found");
    const cover_signed_url = await signOne(supabase, event.cover_photo_url);
    const photo_signed_urls = await signMany(supabase, event.photo_urls ?? []);
    const { data: myRegs } = await supabase
      .from("event_volunteers")
      .select("id, department, created_at")
      .eq("event_id", data.id)
      .eq("user_id", userId);
    return { event, cover_signed_url, photo_signed_urls, my_registrations: myRegs ?? [] };
  });

export const createEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    title: string;
    description?: string;
    location?: string;
    event_date: string;
    cover_photo_url?: string | null;
    photo_urls?: string[];
  }) => {
    if (!d.title?.trim()) throw new Error("Title is required");
    if (!d.event_date) throw new Error("Event date is required");
    if (d.title.length > 200) throw new Error("Title too long");
    return d;
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: userId });
    if (!isStaff) throw new Error("Forbidden");
    const { data: row, error } = await supabase
      .from("events")
      .insert({
        title: data.title.trim(),
        description: data.description?.trim() ?? "",
        location: data.location?.trim() || null,
        event_date: data.event_date,
        cover_photo_url: data.cover_photo_url ?? null,
        photo_urls: data.photo_urls ?? [],
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const updateEventPhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; cover_photo_url?: string | null; photo_urls?: string[] }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: userId });
    if (!isStaff) throw new Error("Forbidden");
    const patch: { cover_photo_url?: string | null; photo_urls?: string[] } = {};
    if (data.cover_photo_url !== undefined) patch.cover_photo_url = data.cover_photo_url;
    if (data.photo_urls !== undefined) patch.photo_urls = data.photo_urls;
    const { error } = await supabase.from("events").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: userId });
    if (!isStaff) throw new Error("Forbidden");
    const { error } = await supabase.from("events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const registerVolunteer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    event_id: string;
    full_name: string;
    phone: string;
    email: string;
    department: Department;
    notes?: string;
  }) => {
    if (!d.event_id) throw new Error("Event is required");
    if (!d.full_name?.trim()) throw new Error("Name is required");
    if (!d.phone?.trim()) throw new Error("Phone is required");
    if (!d.email?.trim()) throw new Error("Email is required");
    if (!DEPARTMENTS.includes(d.department)) throw new Error("Invalid department");
    return d;
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("event_volunteers").insert({
      event_id: data.event_id,
      user_id: userId,
      full_name: data.full_name.trim(),
      phone: data.phone.trim(),
      email: data.email.trim(),
      department: data.department,
      notes: data.notes?.trim() || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listEventVolunteers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { event_id: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: userId });
    if (!isStaff) throw new Error("Forbidden");
    const { data: rows, error } = await supabase
      .from("event_volunteers")
      .select("id, full_name, phone, email, department, notes, created_at, user_id")
      .eq("event_id", data.event_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { volunteers: rows ?? [] };
  });

export const DEPARTMENT_OPTIONS = DEPARTMENTS;