import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { addWeeks, addMonths } from "date-fns";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------------------------------------------------------------------------
// Contexte club de l'utilisateur (gestionnaire ou membre).
// ---------------------------------------------------------------------------
export const getEventsContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: role } = await supabase
      .from("user_roles")
      .select("club_id, role")
      .eq("user_id", userId)
      .maybeSingle();
    const isManager = role?.role === "gestionnaire" || role?.role === "superadmin";
    let clubId: string | null = role?.club_id ?? null;
    if (!clubId) {
      const { data: m } = await supabase
        .from("members")
        .select("club_id")
        .eq("id", userId)
        .maybeSingle();
      clubId = m?.club_id ?? null;
    }
    return { clubId, isManager };
  });

type Counts = {
  registeredCount: number;
  waitlistCount: number;
  checkedInCount: number;
  myStatus: string | null;
};

const EMPTY_COUNTS: Omit<Counts, "myStatus"> = {
  registeredCount: 0,
  waitlistCount: 0,
  checkedInCount: 0,
};

// ---------------------------------------------------------------------------
// Liste des évènements du club (membres : publiés ; gestionnaire : tous).
// ---------------------------------------------------------------------------
export const listClubEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clubId: string }) =>
    z.object({ clubId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: events, error } = await supabase
      .from("club_events")
      .select("*")
      .eq("club_id", data.clubId)
      .order("starts_at", { ascending: true });
    if (error) throw new Error(error.message);

    // Totaux agrégés via la fonction SECURITY DEFINER (la RLS ne laisse au
    // membre voir que sa propre inscription).
    const { data: countRows } = await supabase.rpc("club_event_counts_for_club", {
      _club_id: data.clubId,
    });
    const countsById = new Map(
      (countRows ?? []).map((c) => [
        c.event_id,
        {
          registeredCount: c.registered,
          waitlistCount: c.waitlist,
          checkedInCount: c.checked_in,
        },
      ]),
    );

    // Mon propre statut (lisible via RLS : member_id = auth.uid()).
    const ids = (events ?? []).map((e) => e.id);
    const myStatusById = new Map<string, string>();
    if (ids.length) {
      const { data: mine } = await supabase
        .from("club_event_registrations")
        .select("event_id, status")
        .eq("member_id", userId)
        .in("event_id", ids);
      for (const m of mine ?? []) myStatusById.set(m.event_id, m.status);
    }

    const tallies: Record<string, Counts> = {};
    for (const e of events ?? []) {
      tallies[e.id] = {
        ...(countsById.get(e.id) ?? EMPTY_COUNTS),
        myStatus: myStatusById.get(e.id) ?? null,
      };
    }
    return { events: events ?? [], tallies };
  });

// ---------------------------------------------------------------------------
// Détail d'un évènement + mon inscription (+ liste des inscrits si gestionnaire).
// ---------------------------------------------------------------------------
export const getClubEvent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { eventId: string }) =>
    z.object({ eventId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: event, error } = await supabase
      .from("club_events")
      .select("*")
      .eq("id", data.eventId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!event) throw new Error("Évènement introuvable");

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("club_id, role")
      .eq("user_id", userId)
      .in("role", ["gestionnaire", "superadmin"])
      .maybeSingle();
    const isManager =
      roleRow?.role === "superadmin" || (!!roleRow?.club_id && event.club_id === roleRow.club_id);

    // Totaux agrégés (voir listClubEvents), filtrés sur cet évènement.
    const { data: countRows } = await supabase.rpc("club_event_counts_for_club", {
      _club_id: event.club_id,
    });
    const row = (countRows ?? []).find((c) => c.event_id === data.eventId);
    const counts: Counts = {
      registeredCount: row?.registered ?? 0,
      waitlistCount: row?.waitlist ?? 0,
      checkedInCount: row?.checked_in ?? 0,
      myStatus: null,
    };

    // Le membre ne lit que sa propre inscription ; le gestionnaire lit tout.
    const { data: r } = await supabase
      .from("club_event_registrations")
      .select(
        "id, event_id, member_id, guest_name, guest_email, status, checked_in_at, registered_at",
      )
      .eq("event_id", data.eventId)
      .order("registered_at", { ascending: true });
    const regs = r ?? [];

    const myRegistration = regs.find((x) => x.member_id === userId) ?? null;
    counts.myStatus = myRegistration?.status ?? null;

    return {
      event,
      counts,
      myRegistration,
      isManager,
      // La liste nominative n'est renvoyée qu'au gestionnaire (la RLS renvoie
      // sinon uniquement la propre inscription du membre).
      registrations: isManager ? regs : [],
    };
  });

// ---------------------------------------------------------------------------
// Création (avec récurrence simple hebdo/mensuel, max 52 occurrences).
// ---------------------------------------------------------------------------
export const createClubEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        clubId: z.string().uuid(),
        title: z.string().min(1).max(200),
        description: z.string().max(4000).optional().nullable(),
        eventType: z.string().max(80).optional().nullable(),
        format: z.enum(["in_person", "online", "hybrid"]).default("in_person"),
        locationName: z.string().max(200).optional().nullable(),
        locationAddress: z.string().max(500).optional().nullable(),
        onlineUrl: z.string().max(500).optional().nullable(),
        startsAt: z.string().datetime(),
        endsAt: z.string().datetime().optional().nullable(),
        capacity: z.number().int().min(1).max(100000).optional().nullable(),
        status: z.enum(["draft", "published"]).default("draft"),
        recurrenceFrequency: z.enum(["none", "weekly", "monthly"]).default("none"),
        recurrenceCount: z.number().int().min(1).max(52).default(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const occurrences =
      data.recurrenceFrequency === "none" ? 1 : Math.min(data.recurrenceCount, 52);
    const groupId = occurrences > 1 ? crypto.randomUUID() : null;

    const start = new Date(data.startsAt);
    const end = data.endsAt ? new Date(data.endsAt) : null;

    const rows = [];
    for (let i = 0; i < occurrences; i++) {
      let s = start;
      let e = end;
      if (i > 0) {
        if (data.recurrenceFrequency === "weekly") {
          s = addWeeks(start, i);
          e = end ? addWeeks(end, i) : null;
        } else if (data.recurrenceFrequency === "monthly") {
          s = addMonths(start, i);
          e = end ? addMonths(end, i) : null;
        }
      }
      rows.push({
        club_id: data.clubId,
        created_by: userId,
        title: data.title,
        description: data.description ?? null,
        event_type: data.eventType ?? null,
        format: data.format,
        location_name: data.locationName ?? null,
        location_address: data.locationAddress ?? null,
        online_url: data.onlineUrl ?? null,
        starts_at: s.toISOString(),
        ends_at: e ? e.toISOString() : null,
        capacity: data.capacity ?? null,
        status: data.status,
        recurrence_group_id: groupId,
      });
    }

    const { data: inserted, error } = await supabase.from("club_events").insert(rows).select("id");
    if (error) throw new Error(error.message);

    // Un token de check-in par occurrence (généré par défaut côté base).
    const tokenRows = (inserted ?? []).map((ev) => ({ event_id: ev.id }));
    if (tokenRows.length) {
      const { error: tErr } = await supabase.from("club_event_checkin_tokens").insert(tokenRows);
      if (tErr) throw new Error(tErr.message);
    }

    return { ids: (inserted ?? []).map((e) => e.id), count: inserted?.length ?? 0 };
  });

// ---------------------------------------------------------------------------
// Mise à jour (édition, publication, annulation).
// ---------------------------------------------------------------------------
export const updateClubEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(4000).optional().nullable(),
        eventType: z.string().max(80).optional().nullable(),
        format: z.enum(["in_person", "online", "hybrid"]).optional(),
        locationName: z.string().max(200).optional().nullable(),
        locationAddress: z.string().max(500).optional().nullable(),
        onlineUrl: z.string().max(500).optional().nullable(),
        startsAt: z.string().datetime().optional(),
        endsAt: z.string().datetime().optional().nullable(),
        capacity: z.number().int().min(1).max(100000).optional().nullable(),
        status: z.enum(["draft", "published", "cancelled"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.eventType !== undefined) patch.event_type = data.eventType;
    if (data.format !== undefined) patch.format = data.format;
    if (data.locationName !== undefined) patch.location_name = data.locationName;
    if (data.locationAddress !== undefined) patch.location_address = data.locationAddress;
    if (data.onlineUrl !== undefined) patch.online_url = data.onlineUrl;
    if (data.startsAt !== undefined) patch.starts_at = data.startsAt;
    if (data.endsAt !== undefined) patch.ends_at = data.endsAt;
    if (data.capacity !== undefined) patch.capacity = data.capacity;
    if (data.status !== undefined) patch.status = data.status;

    const { error } = await supabase.from("club_events").update(patch).eq("id", data.eventId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteClubEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ eventId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("club_events").delete().eq("id", data.eventId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Inscriptions membres.
// ---------------------------------------------------------------------------
export const registerForEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ eventId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: reg, error } = await supabase
      .from("club_event_registrations")
      .insert({ event_id: data.eventId, member_id: userId, created_by: userId })
      .select("status")
      .single();
    if (error) throw new Error(error.message);
    // Le trigger a pu basculer l'inscription en 'waitlist' si la capacité est atteinte.
    return { status: reg.status as string };
  });

export const unregisterFromEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ eventId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ev, error: evErr } = await supabase
      .from("club_events")
      .select("starts_at")
      .eq("id", data.eventId)
      .maybeSingle();
    if (evErr) throw new Error(evErr.message);
    if (!ev) throw new Error("Évènement introuvable");

    // Désinscription bloquée à moins de 2h du début.
    const startsMs = new Date(ev.starts_at).getTime();
    if (startsMs - Date.now() < 2 * 60 * 60 * 1000) {
      throw new Error("Désinscription impossible à moins de 2h du début de l'évènement.");
    }

    const { error } = await supabase
      .from("club_event_registrations")
      .delete()
      .eq("event_id", data.eventId)
      .eq("member_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Invités externes (sans compte) — gestionnaire.
// ---------------------------------------------------------------------------
export const addGuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        guestName: z.string().min(1).max(200),
        guestEmail: z.string().email().max(200).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: reg, error } = await supabase
      .from("club_event_registrations")
      .insert({
        event_id: data.eventId,
        member_id: null,
        guest_name: data.guestName,
        guest_email: data.guestEmail ?? null,
        created_by: userId,
      })
      .select("status")
      .single();
    if (error) throw new Error(error.message);
    return { status: reg.status as string };
  });

export const removeRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ registrationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("club_event_registrations")
      .delete()
      .eq("id", data.registrationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Check-in : données organisateur (token + inscrits) et actions.
// ---------------------------------------------------------------------------
export const getCheckinData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { eventId: string }) =>
    z.object({ eventId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: event, error } = await supabase
      .from("club_events")
      .select("*")
      .eq("id", data.eventId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!event) throw new Error("Évènement introuvable");

    // Lisible uniquement par le gestionnaire du club (RLS sur la table token).
    const { data: tok, error: tErr } = await supabase
      .from("club_event_checkin_tokens")
      .select("token")
      .eq("event_id", data.eventId)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);

    const { data: r } = await supabase
      .from("club_event_registrations")
      .select(
        "id, event_id, member_id, guest_name, guest_email, status, checked_in_at, registered_at",
      )
      .eq("event_id", data.eventId)
      .order("registered_at", { ascending: true });
    const regs = r ?? [];

    return {
      event,
      token: tok?.token ?? null,
      registrations: regs,
      registeredCount: regs.filter((x) => x.status === "registered").length,
      checkedInCount: regs.filter((x) => x.checked_in_at != null).length,
    };
  });

export const rotateCheckinToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ eventId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const token = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
    const { error } = await supabase
      .from("club_event_checkin_tokens")
      .update({ token, rotated_at: new Date().toISOString() })
      .eq("event_id", data.eventId);
    if (error) throw new Error(error.message);
    return { token };
  });

export const selfCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ eventId: z.string().uuid(), token: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: res, error } = await supabase.rpc("self_checkin", {
      _event_id: data.eventId,
      _token: data.token,
    });
    if (error) throw new Error(error.message);
    return res as { ok: boolean; error?: string; already?: boolean };
  });

export const setCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ registrationId: z.string().uuid(), present: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: res, error } = await supabase.rpc("club_event_set_checkin", {
      _registration_id: data.registrationId,
      _present: data.present,
    });
    if (error) throw new Error(error.message);
    return res as { ok: boolean; error?: string };
  });
