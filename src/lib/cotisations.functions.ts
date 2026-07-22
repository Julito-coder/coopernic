import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const IntervalEnum = z.enum(["monthly", "quarterly", "yearly"]);

function addInterval(from: Date, interval: "monthly" | "quarterly" | "yearly"): Date {
  const d = new Date(from);
  if (interval === "monthly") d.setMonth(d.getMonth() + 1);
  else if (interval === "quarterly") d.setMonth(d.getMonth() + 3);
  else d.setFullYear(d.getFullYear() + 1);
  return d;
}

async function assertManagerOfClub(supabase: any, userId: string, clubId: string) {
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role, club_id")
    .eq("user_id", userId);
  const rows = roles ?? [];
  if (rows.some((r: any) => r.role === "superadmin")) return;
  if (rows.some((r: any) => r.role === "gestionnaire" && r.club_id === clubId)) return;
  const { data: perm } = await supabase
    .from("user_module_permissions")
    .select("id")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .eq("module", "cotisations")
    .maybeSingle();
  if (perm) return;
  throw new Error("Accès refusé.");
}

export const listCotisationPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clubId: string }) =>
    z.object({ clubId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: plans, error } = await context.supabase
      .from("cotisation_plans")
      .select("*")
      .eq("club_id", data.clubId)
      .order("amount_cents", { ascending: true });
    if (error) throw new Error(error.message);
    return { plans: plans ?? [] };
  });

export const createCotisationPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        clubId: z.string().uuid(),
        name: z.string().min(1).max(120),
        amountEuros: z.number().min(0).max(100000),
        interval: IntervalEnum,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertManagerOfClub(context.supabase, context.userId, data.clubId);
    const { error } = await context.supabase.from("cotisation_plans").insert({
      club_id: data.clubId,
      name: data.name,
      amount_cents: Math.round(data.amountEuros * 100),
      interval: data.interval,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const togglePlanActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ planId: z.string().uuid(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: plan } = await context.supabase
      .from("cotisation_plans")
      .select("club_id")
      .eq("id", data.planId)
      .maybeSingle();
    if (!plan) throw new Error("Plan introuvable.");
    await assertManagerOfClub(context.supabase, context.userId, plan.club_id);
    const { error } = await context.supabase
      .from("cotisation_plans")
      .update({ active: data.active })
      .eq("id", data.planId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCotisationPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ planId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: plan } = await context.supabase
      .from("cotisation_plans")
      .select("club_id")
      .eq("id", data.planId)
      .maybeSingle();
    if (!plan) throw new Error("Plan introuvable.");
    await assertManagerOfClub(context.supabase, context.userId, plan.club_id);
    const { error } = await context.supabase
      .from("cotisation_plans")
      .delete()
      .eq("id", data.planId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Member-facing: my subscriptions across all my clubs
export const listMySubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: subs, error } = await context.supabase
      .from("cotisation_subscriptions")
      .select("*, cotisation_plans(name, amount_cents, interval), clubs(name)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: payments } = await context.supabase
      .from("cotisation_payments")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    return { subscriptions: subs ?? [], payments: payments ?? [] };
  });

export const subscribeToPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ planId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: plan, error: pErr } = await context.supabase
      .from("cotisation_plans")
      .select("id, club_id, interval, active")
      .eq("id", data.planId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!plan || !plan.active) throw new Error("Plan indisponible.");
    const now = new Date();
    const end = addInterval(now, plan.interval as any);
    const { error } = await context.supabase
      .from("cotisation_subscriptions")
      .upsert(
        {
          user_id: context.userId,
          plan_id: plan.id,
          club_id: plan.club_id,
          status: "pending",
          current_period_start: now.toISOString(),
          current_period_end: end.toISOString(),
          next_due_at: end.toISOString(),
          last_reminder_step: 0,
        },
        { onConflict: "user_id,plan_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Manager view: full club overview
export const listClubCotisations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clubId: string }) =>
    z.object({ clubId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertManagerOfClub(context.supabase, context.userId, data.clubId);
    const { data: subs } = await context.supabase
      .from("cotisation_subscriptions")
      .select("*, cotisation_plans(name, amount_cents, interval)")
      .eq("club_id", data.clubId)
      .order("created_at", { ascending: false });
    const { data: members } = await context.supabase
      .from("members")
      .select("id, first_name, last_name, email")
      .eq("club_id", data.clubId);
    return { subscriptions: subs ?? [], members: members ?? [] };
  });

// Manager marks a payment as received (offline payment)
export const markPaymentReceived = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ subscriptionId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: sub } = await context.supabase
      .from("cotisation_subscriptions")
      .select("*, cotisation_plans(amount_cents, interval)")
      .eq("id", data.subscriptionId)
      .maybeSingle();
    if (!sub) throw new Error("Introuvable.");
    await assertManagerOfClub(context.supabase, context.userId, sub.club_id);
    const now = new Date();
    const end = addInterval(now, (sub as any).cotisation_plans.interval);
    const { error: pErr } = await context.supabase.from("cotisation_payments").insert({
      subscription_id: sub.id,
      club_id: sub.club_id,
      user_id: sub.user_id,
      amount_cents: (sub as any).cotisation_plans.amount_cents,
      status: "paid",
      paid_at: now.toISOString(),
      period_start: now.toISOString(),
      period_end: end.toISOString(),
    });
    if (pErr) throw new Error(pErr.message);
    const { error } = await context.supabase
      .from("cotisation_subscriptions")
      .update({
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: end.toISOString(),
        next_due_at: end.toISOString(),
        last_reminder_step: 0,
        last_reminded_at: null,
      })
      .eq("id", sub.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
