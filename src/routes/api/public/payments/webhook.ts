import { createFileRoute } from "@tanstack/react-router";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

async function handleCheckoutCompleted(session: any) {
  const sb = getSupabase();
  const potId = session.metadata?.pot_id;
  const userId = session.metadata?.userId;
  if (!potId || !userId) {
    console.warn("checkout.session.completed without pot_id/userId", session.id);
    return;
  }
  const paid =
    session.payment_status === "paid" || session.payment_status === "no_payment_required";
  if (!paid) return;

  await sb
    .from("pot_payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
    })
    .eq("stripe_session_id", session.id);

  // Auto-close pot if collected >= goal
  const { data: pot } = await sb
    .from("pots")
    .select("id, goal_cents, status")
    .eq("id", potId)
    .single();
  if (pot && pot.status === "open") {
    const { data: pays } = await sb
      .from("pot_payments")
      .select("amount_cents, status")
      .eq("pot_id", potId);
    const collected = (pays ?? [])
      .filter((p) => p.status === "paid")
      .reduce((s, p) => s + p.amount_cents, 0);
    if (collected >= pot.goal_cents) {
      await sb.from("pots").update({ status: "closed" }).eq("id", potId);
    }
  }
}

async function handlePaymentFailed(intent: any) {
  const sb = getSupabase();
  await sb
    .from("pot_payments")
    .update({ status: "failed" })
    .eq("stripe_payment_intent", intent.id);
}

async function handleChargeRefunded(charge: any) {
  const sb = getSupabase();
  const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
  if (!piId) return;
  await sb.from("pot_payments").update({ status: "refunded" }).eq("stripe_payment_intent", piId);
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          switch (event.type) {
            case "checkout.session.completed":
            case "checkout.session.async_payment_succeeded":
              await handleCheckoutCompleted(event.data.object);
              break;
            case "payment_intent.payment_failed":
            case "checkout.session.async_payment_failed":
              await handlePaymentFailed(event.data.object);
              break;
            case "charge.refunded":
              await handleChargeRefunded(event.data.object);
              break;
            default:
              console.log("Unhandled event:", event.type);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
