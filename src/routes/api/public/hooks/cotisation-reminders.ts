import { createFileRoute } from "@tanstack/react-router";

// Steps: J+7 -> step 1, J+15 -> step 2, J+30 -> step 3
const STEPS = [
  { step: 1, minDays: 7 },
  { step: 2, minDays: 15 },
  { step: 3, minDays: 30 },
];

export const Route = createFileRoute("/api/public/hooks/cotisation-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        if (apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const nowIso = new Date().toISOString();
        // Subscriptions overdue (next_due_at < now) that are not cancelled
        const { data: subs, error } = await supabaseAdmin
          .from("cotisation_subscriptions")
          .select("id, user_id, club_id, next_due_at, last_reminder_step, cotisation_plans(name)")
          .lt("next_due_at", nowIso)
          .neq("status", "cancelled");
        if (error) return new Response(error.message, { status: 500 });

        let sent = 0;
        for (const s of subs ?? []) {
          const due = new Date(s.next_due_at!).getTime();
          const daysLate = Math.floor((Date.now() - due) / 86400000);
          const nextStep = STEPS.find(
            (st) => daysLate >= st.minDays && st.step > (s.last_reminder_step ?? 0),
          );
          if (!nextStep) continue;
          await supabaseAdmin.from("notifications").insert({
            user_id: s.user_id,
            club_id: s.club_id,
            type: "cotisation_reminder",
            title: `Cotisation en retard (${daysLate} j)`,
            body: `Relance n°${nextStep.step} — merci de régler ta cotisation « ${
              (s as any).cotisation_plans?.name ?? ""
            } ».`,
            link: "/cotisations",
          });
          await supabaseAdmin
            .from("cotisation_subscriptions")
            .update({
              status: "overdue",
              last_reminder_step: nextStep.step,
              last_reminded_at: nowIso,
            })
            .eq("id", s.id);
          sent++;
        }

        return Response.json({ ok: true, checked: subs?.length ?? 0, sent });
      },
    },
  },
});
