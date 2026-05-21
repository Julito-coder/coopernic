import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createStripeClient, type StripeEnv } from "@/lib/stripe.server";

// ---------- LIST pots for a club ----------
export const listPots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clubId: string }) =>
    z.object({ clubId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: pots, error } = await supabase
      .from("pots")
      .select("*")
      .eq("club_id", data.clubId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    // Aggregate participants + paid per pot
    const ids = (pots ?? []).map((p) => p.id);
    if (ids.length === 0) return { pots: [], stats: {} as Record<string, { participants: number; collected: number; payers: number }> };

    const [participantsRes, paymentsRes] = await Promise.all([
      supabase.from("pot_participants").select("pot_id").in("pot_id", ids),
      supabase.from("pot_payments").select("pot_id, amount_cents, status").in("pot_id", ids),
    ]);

    const stats: Record<string, { participants: number; collected: number; payers: number }> = {};
    for (const id of ids) stats[id] = { participants: 0, collected: 0, payers: 0 };
    for (const row of participantsRes.data ?? []) stats[row.pot_id].participants++;
    for (const row of paymentsRes.data ?? []) {
      if (row.status === "paid") {
        stats[row.pot_id].collected += row.amount_cents;
        stats[row.pot_id].payers++;
      }
    }

    return { pots, stats };
  });

// ---------- CREATE pot ----------
export const createPot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        clubId: z.string().uuid(),
        title: z.string().min(1).max(200),
        description: z.string().max(2000).optional().nullable(),
        goalEuros: z.number().positive().max(1_000_000),
        deadline: z.string().datetime().optional().nullable(),
        eventId: z.string().uuid().optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: pot, error } = await supabase
      .from("pots")
      .insert({
        club_id: data.clubId,
        title: data.title,
        description: data.description ?? null,
        goal_cents: Math.round(data.goalEuros * 100),
        deadline: data.deadline ?? null,
        event_id: data.eventId ?? null,
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { pot };
  });

// ---------- UPDATE status ----------
export const setPotStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        potId: z.string().uuid(),
        status: z.enum(["open", "closed", "cancelled"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("pots")
      .update({ status: data.status })
      .eq("id", data.potId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- DELETE pot ----------
export const deletePot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ potId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("pots").delete().eq("id", data.potId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- JOIN as participant (member) ----------
export const joinPot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ potId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("pot_participants")
      .insert({ pot_id: data.potId, member_id: userId });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

// ---------- LEAVE pot ----------
export const leavePot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ potId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("pot_participants")
      .delete()
      .eq("pot_id", data.potId)
      .eq("member_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- POT detail with participants + payments (gestionnaire & member views) ----------
export const getPotDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { potId: string }) =>
    z.object({ potId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [potRes, participantsRes, paymentsRes] = await Promise.all([
      supabase.from("pots").select("*").eq("id", data.potId).single(),
      supabase.from("pot_participants").select("member_id, joined_at").eq("pot_id", data.potId),
      supabase.from("pot_payments").select("member_id, amount_cents, status, paid_at").eq("pot_id", data.potId),
    ]);
    if (potRes.error) throw new Error(potRes.error.message);

    const participants = participantsRes.data ?? [];
    const payments = paymentsRes.data ?? [];

    const memberIds = Array.from(
      new Set([...participants.map((p) => p.member_id), ...payments.map((p) => p.member_id)]),
    );
    let memberRows: Array<{ id: string; first_name: string; last_name: string; email: string }> = [];
    if (memberIds.length > 0) {
      const { data: m } = await supabase
        .from("members")
        .select("id, first_name, last_name, email")
        .in("id", memberIds);
      memberRows = m ?? [];
    }

    const collected = payments
      .filter((p) => p.status === "paid")
      .reduce((s, p) => s + p.amount_cents, 0);
    const currentShareCents =
      participants.length > 0 ? Math.ceil(potRes.data.goal_cents / participants.length) : 0;

    return {
      pot: potRes.data,
      participants,
      payments,
      members: memberRows,
      collected,
      currentShareCents,
      isParticipant: participants.some((p) => p.member_id === userId),
      hasPaid: payments.some((p) => p.member_id === userId && p.status === "paid"),
    };
  });

// ---------- CREATE Stripe Checkout session for a pot share ----------
export const createPotCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        potId: z.string().uuid(),
        returnUrl: z.string().url(),
        environment: z.enum(["sandbox", "live"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Load pot + participant set
    const [potRes, partRes, payRes, memberRes] = await Promise.all([
      supabase.from("pots").select("*").eq("id", data.potId).single(),
      supabase.from("pot_participants").select("member_id").eq("pot_id", data.potId),
      supabase
        .from("pot_payments")
        .select("member_id, status")
        .eq("pot_id", data.potId),
      supabase.from("members").select("email, first_name, last_name").eq("id", userId).maybeSingle(),
    ]);
    if (potRes.error) throw new Error(potRes.error.message);
    const pot = potRes.data;
    if (pot.status !== "open") throw new Error("Cette cagnotte n'est plus ouverte.");

    const participants = partRes.data ?? [];
    const isParticipant = participants.some((p) => p.member_id === userId);
    if (!isParticipant) throw new Error("Inscris-toi d'abord à la cagnotte.");

    const existing = (payRes.data ?? []).find((p) => p.member_id === userId);
    if (existing?.status === "paid") throw new Error("Tu as déjà payé ta part.");

    const shareCents = Math.ceil(pot.goal_cents / Math.max(participants.length, 1));
    if (shareCents < 50) throw new Error("Le montant par part doit être ≥ 0,50 €.");

    const stripe = createStripeClient(data.environment as StripeEnv);

    // Resolve or create Stripe customer with userId metadata (searchable)
    let customerId: string | undefined;
    if (/^[a-zA-Z0-9-]+$/.test(userId)) {
      const found = await stripe.customers.search({
        query: `metadata['userId']:'${userId}'`,
        limit: 1,
      });
      if (found.data.length) customerId = found.data[0].id;
    }
    const email = memberRes.data?.email;
    if (!customerId && email) {
      const list = await stripe.customers.list({ email, limit: 1 });
      if (list.data.length) {
        customerId = list.data[0].id;
        await stripe.customers.update(customerId, {
          metadata: { ...list.data[0].metadata, userId },
        });
      }
    }
    if (!customerId) {
      const created = await stripe.customers.create({
        ...(email && { email }),
        metadata: { userId },
      });
      customerId = created.id;
    }

    const description = `Cagnotte: ${pot.title}`;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: data.returnUrl,
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: description },
            unit_amount: shareCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: { description },
      metadata: {
        userId,
        pot_id: pot.id,
        club_id: pot.club_id,
      },
      // Full Stripe compliance handling (+3.5%) — not yet typed in SDK 22
      managed_payments: { enabled: true },
    } as any);

    // Upsert pending pot_payment with session id
    await supabase.from("pot_payments").upsert(
      {
        pot_id: pot.id,
        member_id: userId,
        amount_cents: shareCents,
        stripe_session_id: session.id,
        status: "pending",
      },
      { onConflict: "pot_id,member_id" },
    );

    return { clientSecret: session.client_secret };
  });
