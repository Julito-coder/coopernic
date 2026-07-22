import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useSession } from "@/lib/use-session";
import {
  listCotisationPlans,
  createCotisationPlan,
  togglePlanActive,
  deleteCotisationPlan,
  listMySubscriptions,
  subscribeToPlan,
  listClubCotisations,
  markPaymentReceived,
} from "@/lib/cotisations.functions";
import { getMyEventsContext } from "@/lib/events.functions";
import { Wallet, Plus, Check, Trash2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/cotisations")({
  component: CotisationsPage,
  head: () => ({
    meta: [
      { title: "Cotisations — Coopernic" },
      { name: "description", content: "Plans de cotisation et paiements du club." },
    ],
  }),
});

const INTERVAL_LABEL: Record<string, string> = {
  monthly: "Mensuel",
  quarterly: "Trimestriel",
  yearly: "Annuel",
};

function euros(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function CotisationsPage() {
  const { user, roles, managedClubId, loading } = useSession();
  const ctxFn = useServerFn(getMyEventsContext);
  const ctx = useQuery({
    queryKey: ["events-ctx", user?.id ?? "signed-out"],
    enabled: !!user,
    queryFn: () => ctxFn(),
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8 text-sm text-muted-foreground">
        Chargement des cotisations…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8">
        <Link to="/auth" className="underline">
          Connecte-toi
        </Link>{" "}
        pour accéder aux cotisations.
      </div>
    );
  }

  const isManager =
    roles.includes("superadmin") || roles.includes("gestionnaire");
  const clubId = managedClubId ?? ctx.data?.clubId ?? null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6 pb-24">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Cotisations</h1>
            <p className="text-sm text-muted-foreground">
              Plans de cotisation du club et suivi des paiements.
            </p>
          </div>
        </div>

        {ctx.isError && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            Impossible de charger le club associé à ton compte.
          </div>
        )}
        {clubId && <PlansSection clubId={clubId} isManager={isManager} />}
        {!clubId && !ctx.isLoading && !ctx.isError && (
          <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">
            Aucun club n'est associé à ton compte pour le moment.
          </div>
        )}
        <MySubscriptionsSection />
        {clubId && isManager && <ClubOverviewSection clubId={clubId} />}
      </div>
    </div>
  );
}

function PlansSection({ clubId, isManager }: { clubId: string; isManager: boolean }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listCotisationPlans);
  const createFn = useServerFn(createCotisationPlan);
  const toggleFn = useServerFn(togglePlanActive);
  const delFn = useServerFn(deleteCotisationPlan);
  const subFn = useServerFn(subscribeToPlan);
  const q = useQuery({
    queryKey: ["cotis-plans", clubId],
    queryFn: () => listFn({ data: { clubId } }),
  });

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [interval, setInterval] = useState<"monthly" | "quarterly" | "yearly">("yearly");
  const [durationMonths, setDurationMonths] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          clubId,
          name,
          amountEuros: Number(amount),
          interval,
          durationMonths: durationMonths ? Number(durationMonths) : null,
        },
      }),
    onSuccess: () => {
      setName("");
      setAmount("");
      setDurationMonths("");
      qc.invalidateQueries({ queryKey: ["cotis-plans", clubId] });
    },
    onError: (e: any) => setErr(e.message ?? "Erreur"),
  });

  const subscribe = useMutation({
    mutationFn: (planId: string) => subFn({ data: { planId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-subs"] }),
  });

  const plans = q.data?.plans ?? [];

  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="font-semibold mb-3">Plans disponibles</h2>
      <div className="space-y-2">
        {plans.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun plan pour le moment.</p>
        )}
        {plans.map((p: any) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-md border p-3 text-sm"
          >
            <div>
              <div className="font-semibold">
                {p.name}{" "}
                {!p.active && (
                  <span className="ml-2 text-xs text-muted-foreground">(désactivé)</span>
                )}
              </div>
              <div className="text-muted-foreground text-xs">
                {euros(p.amount_cents)} · {INTERVAL_LABEL[p.interval]}
                {p.duration_months ? ` · ${p.duration_months} mois` : ""}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {p.active && (
                <button
                  onClick={() => subscribe.mutate(p.id)}
                  className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold"
                >
                  Souscrire
                </button>
              )}
              {isManager && (
                <>
                  <button
                    onClick={() =>
                      toggleFn({ data: { planId: p.id, active: !p.active } }).then(() =>
                        qc.invalidateQueries({ queryKey: ["cotis-plans", clubId] }),
                      )
                    }
                    className="px-2 py-1 rounded-md border text-xs"
                  >
                    {p.active ? "Désactiver" : "Activer"}
                  </button>
                  <button
                    onClick={() =>
                      delFn({ data: { planId: p.id } }).then(() =>
                        qc.invalidateQueries({ queryKey: ["cotis-plans", clubId] }),
                      )
                    }
                    className="p-1.5 rounded-md border text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {isManager && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setErr(null);
            create.mutate();
          }}
          className="mt-4 grid grid-cols-1 sm:grid-cols-5 gap-2 border-t pt-4"
        >
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom (ex: Annuelle 2 ans)"
            className="input sm:col-span-2"
          />
          <input
            required
            type="number"
            min="0"
            step="0.5"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Montant €"
            className="input"
          />
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value as any)}
            className="input"
          >
            <option value="monthly">Mensuel</option>
            <option value="quarterly">Trimestriel</option>
            <option value="yearly">Annuel</option>
          </select>
          <input
            type="number"
            min="1"
            max="240"
            value={durationMonths}
            onChange={(e) => setDurationMonths(e.target.value)}
            placeholder="Durée en mois (opt.)"
            className="input"
          />
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-md bg-primary text-primary-foreground text-sm font-semibold py-2 flex items-center justify-center gap-1 sm:col-span-5"
          >
            <Plus className="h-4 w-4" /> Ajouter le plan
          </button>
          {err && <div className="sm:col-span-5 text-xs text-destructive">{err}</div>}
        </form>
      )}
      <style>{`.input { border:1px solid hsl(var(--border)); border-radius:6px; padding:8px 10px; background:hsl(var(--background)); font-size:14px; }`}</style>
    </section>
  );
}

function MySubscriptionsSection() {
  const listFn = useServerFn(listMySubscriptions);
  const q = useQuery({ queryKey: ["my-subs"], queryFn: () => listFn() });
  const subs = q.data?.subscriptions ?? [];
  const payments = q.data?.payments ?? [];

  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="font-semibold mb-3">Mes cotisations</h2>
      {subs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune souscription.</p>
      ) : (
        <div className="space-y-2">
          {subs.map((s: any) => (
            <div key={s.id} className="rounded-md border p-3 text-sm">
              <div className="flex justify-between">
                <div>
                  <div className="font-semibold">
                    {s.cotisation_plans?.name} · {s.clubs?.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {euros(s.cotisation_plans?.amount_cents ?? 0)} ·{" "}
                    {INTERVAL_LABEL[s.cotisation_plans?.interval ?? ""]} · échéance{" "}
                    {s.next_due_at
                      ? new Date(s.next_due_at).toLocaleDateString("fr-FR")
                      : "—"}
                  </div>
                </div>
                <StatusBadge status={s.status} />
              </div>
            </div>
          ))}
        </div>
      )}
      {payments.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            Historique des paiements
          </div>
          <ul className="text-xs space-y-1">
            {payments.map((p: any) => (
              <li key={p.id} className="flex justify-between border-b pb-1">
                <span>
                  {p.paid_at ? new Date(p.paid_at).toLocaleDateString("fr-FR") : "—"} ·{" "}
                  {euros(p.amount_cents)}
                </span>
                <span className="text-muted-foreground">{p.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ClubOverviewSection({ clubId }: { clubId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listClubCotisations);
  const markFn = useServerFn(markPaymentReceived);
  const q = useQuery({
    queryKey: ["club-cotis", clubId],
    queryFn: () => listFn({ data: { clubId } }),
  });
  const subs = q.data?.subscriptions ?? [];
  const members = q.data?.members ?? [];
  const byId: Record<string, any> = {};
  for (const m of members) byId[m.id] = m;

  const mark = useMutation({
    mutationFn: (subscriptionId: string) => markFn({ data: { subscriptionId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["club-cotis", clubId] }),
  });

  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="font-semibold mb-3">Cotisations du club</h2>
      {subs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune souscription pour le moment.</p>
      ) : (
        <div className="space-y-2">
          {subs.map((s: any) => {
            const m = byId[s.user_id];
            return (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-md border p-3 text-sm"
              >
                <div>
                  <div className="font-semibold">
                    {m ? `${m.first_name} ${m.last_name}` : s.user_id}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.cotisation_plans?.name} · {euros(s.cotisation_plans?.amount_cents ?? 0)} ·{" "}
                    échéance{" "}
                    {s.next_due_at
                      ? new Date(s.next_due_at).toLocaleDateString("fr-FR")
                      : "—"}
                    {s.last_reminder_step > 0 && (
                      <span className="ml-2 inline-flex items-center gap-1 text-orange-600">
                        <AlertTriangle className="h-3 w-3" /> {s.last_reminder_step} relance(s)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={s.status} />
                  <button
                    onClick={() => mark.mutate(s.id)}
                    className="px-2 py-1 rounded-md border text-xs flex items-center gap-1"
                  >
                    <Check className="h-3 w-3" /> Marquer payé
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    active: "bg-green-100 text-green-800",
    overdue: "bg-orange-100 text-orange-800",
    cancelled: "bg-muted text-muted-foreground",
  };
  const label: Record<string, string> = {
    pending: "En attente",
    active: "À jour",
    overdue: "En retard",
    cancelled: "Annulé",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[status] ?? ""}`}>
      {label[status] ?? status}
    </span>
  );
}
