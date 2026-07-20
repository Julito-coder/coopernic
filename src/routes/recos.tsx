import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CURRENT_USER_ID,
  STATUS_COLOR,
  STATUS_LABEL,
  STATUS_ORDER,
  computeStats,
  updateReco,
  useRecos,
  type Reco,
  type RecoStatus,
} from "@/lib/recos-store";
import { getMember } from "@/lib/mock-data";

export const Route = createFileRoute("/recos")({
  component: StatsPage,
  head: () => ({
    meta: [
      { title: "Stats — Coopernic" },
      { name: "description", content: "Stats des recommandations envoyées et reçues, commissions et factures." },
    ],
  }),
});

function StatsPage() {
  const recos = useRecos();
  const stats = useMemo(() => computeStats(), [recos]);

  const sent = recos.filter((r) => r.fromMemberId === CURRENT_USER_ID);
  const received = recos.filter((r) => r.toMemberId === CURRENT_USER_ID);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Business tracking</div>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Stats
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            Tes recos envoyées et reçues, les statuts, les commissions dues et les factures Stripe.
          </p>
        </div>
        <Link to="/messages" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5">
          + Envoyer une reco
        </Link>
      </header>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Recos envoyées" value={stats.sentCount} hint={`${stats.wonCount} converties en deal`} />
        <Kpi label="Recos reçues" value={stats.receivedCount} hint={`${stats.wonReceivedCount} closées`} />
        <Kpi label="Commissions à recevoir" value={fmtEuro(stats.commissionsToReceive)} hint="sur recos envoyées" accent />
        <Kpi label="Commissions à payer" value={fmtEuro(stats.commissionsDue)} hint="sur recos reçues" />
      </div>

      {/* Two sections */}
      <div className="mt-10 space-y-10">
        <RecoSection
          title="Recos envoyées"
          subtitle="Suis l'avancement et les commissions qui te reviennent."
          recos={sent}
          mode="sent"
        />
        <RecoSection
          title="Recos reçues"
          subtitle="Mets à jour le statut, génère la facture de commission à payer à l'apporteur."
          recos={received}
          mode="received"
        />
      </div>

      {/* Leaderboard */}
      {stats.leaderboard.length > 0 && (
        <div className="mt-10 rounded-3xl border border-border bg-primary p-6 text-primary-foreground shadow-elevated">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">Top contributeurs</div>
          <h3 className="mt-2 font-display text-xl font-bold">Leaderboard club</h3>
          <ol className="mt-5 grid gap-2.5 md:grid-cols-2 lg:grid-cols-5">
            {stats.leaderboard.map((row, i) => (
              <li key={row.memberId} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 backdrop-blur">
                <span className="font-display text-lg font-black text-accent">#{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{row.memberId}</div>
                  <div className="text-[11px] text-white/60">
                    {row.sent} reco{row.sent > 1 ? "s" : ""} · {row.won} deal{row.won > 1 ? "s" : ""}
                  </div>
                </div>
                <div className="font-mono text-xs font-bold text-accent">{fmtEuro(row.ca)}</div>
              </li>
            ))}
          </ol>
        </div>
      )}

    </div>
  );
}

function RecoSection({
  title, subtitle, recos, mode,
}: { title: string; subtitle: string; recos: Reco[]; mode: "sent" | "received" }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-card">
      <header className="flex items-center justify-between gap-4 border-b border-border/70 px-6 py-4">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
          <p className="text-xs text-ink-muted">{subtitle}</p>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-bold text-foreground">
          {recos.length}
        </span>
      </header>

      {recos.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-ink-muted">
          Aucune reco pour l'instant.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/40 text-[10px] uppercase tracking-wider text-ink-muted">
              <tr>
                <Th>Prospect</Th>
                <Th>{mode === "sent" ? "Bénéficiaire" : "Apporteur"}</Th>
                <Th>Montant</Th>
                <Th>Comm.</Th>
                <Th>Statut</Th>
                <Th>{mode === "received" ? "Facture" : "Commission due"}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {recos.map((r) => (
                <RecoRow key={r.id} reco={r} mode={mode} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RecoRow({ reco, mode }: { reco: Reco; mode: "sent" | "received" }) {
  const counterpart = getMember(mode === "sent" ? reco.toMemberId : reco.fromMemberId);
  const commissionAmount = ((reco.estimatedAmount ?? 0) * (reco.commissionRate ?? 0)) / 100;
  const canInvoice = mode === "received" && reco.status === "deal" && commissionAmount > 0;

  return (
    <tr className="hover:bg-secondary/40">
      <td className="px-4 py-3">
        <div className="font-semibold text-foreground">{reco.prospectName}</div>
        <div className="text-xs text-ink-muted">{reco.prospectCompany}</div>
      </td>
      <td className="px-4 py-3">
        <div className="text-xs font-medium text-foreground">
          {counterpart ? `${counterpart.firstName} ${counterpart.lastName}` : "—"}
        </div>
        <div className="text-[11px] text-muted-foreground">{counterpart?.company}</div>
      </td>
      <td className="px-4 py-3 font-mono text-xs text-foreground">
        {reco.estimatedAmount ? fmtEuro(reco.estimatedAmount) : "—"}
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          min={0}
          max={100}
          value={reco.commissionRate ?? ""}
          onChange={(e) =>
            updateReco(reco.id, {
              commissionRate: e.target.value === "" ? undefined : Number(e.target.value),
            })
          }
          className="w-16 rounded-md border border-input bg-background px-2 py-1 text-xs font-mono text-foreground outline-none focus:ring-2 focus:ring-ring/40"
          placeholder="0"
        />
        <span className="ml-1 text-[11px] text-muted-foreground">%</span>
      </td>
      <td className="px-4 py-3">
        <select
          value={reco.status}
          onChange={(e) => updateReco(reco.id, { status: e.target.value as RecoStatus })}
          className={
            "rounded-full border px-2.5 py-1 text-[11px] font-semibold outline-none focus:ring-2 focus:ring-ring/40 " +
            STATUS_COLOR[reco.status]
          }
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        {mode === "received" ? (
          <InvoiceCell reco={reco} commissionAmount={commissionAmount} canInvoice={canInvoice} />
        ) : (
          <span className="font-mono text-xs font-bold text-accent">
            {commissionAmount > 0 ? fmtEuro(commissionAmount) : "—"}
          </span>
        )}
      </td>
    </tr>
  );
}

function InvoiceCell({ reco, commissionAmount, canInvoice }: { reco: Reco; commissionAmount: number; canInvoice: boolean }) {
  const [busy, setBusy] = useState(false);

  if (reco.invoiceId) {
    const badge =
      reco.invoiceStatus === "paid"
        ? "bg-success/15 text-success border-success/30"
        : "bg-accent/15 text-accent border-accent/30";
    return (
      <div className="flex flex-col gap-0.5">
        <span className={"inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold " + badge}>
          Facture · {fmtEuro(commissionAmount)}
        </span>
        <span className="text-[10px] text-muted-foreground">{reco.invoiceStatus ?? "draft"} (mock)</span>
      </div>
    );
  }

  if (!canInvoice) {
    return <span className="text-[11px] text-muted-foreground">—</span>;
  }

  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        // Mock — sera remplacé par un appel server function vers Stripe Invoices.
        await new Promise((r) => setTimeout(r, 600));
        updateReco(reco.id, {
          invoiceId: `inv_mock_${Date.now()}`,
          invoiceStatus: "draft",
        });
        setBusy(false);
      }}
      className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[11px] font-bold text-accent-foreground transition-all hover:-translate-y-0.5 disabled:opacity-50"
    >
      {busy ? "…" : `Générer facture · ${fmtEuro(commissionAmount)}`}
    </button>
  );
}

function Kpi({ label, value, hint, accent }: { label: string; value: string | number; hint?: string; accent?: boolean }) {
  return (
    <div className={"rounded-2xl border p-5 shadow-card " + (accent ? "border-accent/40 bg-accent/10" : "border-border bg-surface")}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">{label}</div>
      <div className={"mt-2 font-display text-3xl font-extrabold tracking-tight " + (accent ? "text-accent" : "text-foreground")}>{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 text-left font-bold">{children}</th>;
}

function fmtEuro(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}
