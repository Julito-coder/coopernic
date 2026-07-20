import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Resolve the current user's club context (as manager or member).
export const getMyEventsContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: role } = await supabase
      .from("user_roles")
      .select("club_id, role")
      .eq("user_id", userId)
      .maybeSingle();
    const isSuperadmin = role?.role === "superadmin";
    const isManager = role?.role === "gestionnaire" || isSuperadmin;
    let clubId: string | null = role?.club_id ?? null;
    if (!clubId) {
      const { data: m } = await supabase
        .from("members")
        .select("club_id")
        .eq("id", userId)
        .maybeSingle();
      clubId = m?.club_id ?? null;
    }
    let clubs: Array<{ id: string; name: string }> = [];
    if (isSuperadmin) {
      const { data: c } = await supabase.from("clubs").select("id, name").order("name");
      clubs = c ?? [];
      if (!clubId && clubs.length) clubId = clubs[0].id;
    }
    return { clubId, isManager, isSuperadmin, clubs };
  });

export const listEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clubId: string }) =>
    z.object({ clubId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: events, error } = await supabase
      .from("events")
      .select("*")
      .eq("club_id", data.clubId)
      .order("starts_at", { ascending: true });
    if (error) throw new Error(error.message);
    const ids = (events ?? []).map((e) => e.id);
    let responses: Array<{ event_id: string; user_id: string; option_index: number }> = [];
    if (ids.length) {
      const { data: r } = await supabase
        .from("event_responses")
        .select("event_id, user_id, option_index")
        .in("event_id", ids);
      responses = r ?? [];
    }
    const tallies: Record<string, { counts: number[]; myChoice: number | null; total: number }> = {};
    for (const e of events ?? []) {
      const opts = Array.isArray(e.poll_options) ? e.poll_options.length : 0;
      const counts = new Array(opts).fill(0) as number[];
      let mine: number | null = null;
      let total = 0;
      for (const r of responses.filter((r) => r.event_id === e.id)) {
        if (r.option_index >= 0 && r.option_index < counts.length) counts[r.option_index]++;
        if (r.user_id === userId) mine = r.option_index;
        total++;
      }
      tallies[e.id] = { counts, myChoice: mine, total };
    }
    return { events: events ?? [], tallies };
  });

export const createEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        clubId: z.string().uuid(),
        title: z.string().min(1).max(200),
        description: z.string().max(4000).optional().nullable(),
        startsAt: z.string().datetime(),
        endsAt: z.string().datetime().optional().nullable(),
        locationName: z.string().max(200).optional().nullable(),
        locationAddress: z.string().max(500).optional().nullable(),
        locationLat: z.number().optional().nullable(),
        locationLng: z.number().optional().nullable(),
        practicalInfo: z.string().max(4000).optional().nullable(),
        pollQuestion: z.string().max(300).optional().nullable(),
        pollOptions: z.array(z.string().min(1).max(120)).max(10).default([]),
        pollResultsVisible: z.boolean().default(true),
        isPaid: z.boolean().default(false),
        priceEuros: z.number().min(0).max(100000).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ev, error } = await supabase
      .from("events")
      .insert({
        club_id: data.clubId,
        created_by: userId,
        title: data.title,
        description: data.description ?? null,
        starts_at: data.startsAt,
        ends_at: data.endsAt ?? null,
        location_name: data.locationName ?? null,
        location_address: data.locationAddress ?? null,
        location_lat: data.locationLat ?? null,
        location_lng: data.locationLng ?? null,
        practical_info: data.practicalInfo ?? null,
        poll_question: data.pollQuestion ?? null,
        poll_options: data.pollOptions,
        poll_results_visible: data.pollResultsVisible,
        is_paid: data.isPaid,
        price_cents: data.isPaid && data.priceEuros ? Math.round(data.priceEuros * 100) : null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { event: ev };
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ eventId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("events").delete().eq("id", data.eventId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const respondToPoll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        optionIndex: z.number().int().min(0).max(20),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("event_responses")
      .upsert(
        { event_id: data.eventId, user_id: userId, option_index: data.optionIndex },
        { onConflict: "event_id,user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
