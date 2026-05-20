import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CURRENT_USER_ID,
  STATUS_COLOR,
  STATUS_LABEL,
  computeStats,
  updateRecoStatus,
  useRecos,
  type RecoStatus,
} from "@/lib/recos-store";
import { getMember } from "@/lib/mock-data";

export const Route = createFileRoute("/recos")({
  component: RecosPage,
  head: () => ({
    meta: [
      { title: "Suivi des recos — COOPERNIK" },
      { name: "description", content: "Pilotage des recommandations envoyées, reçues, deals signés et ROI individuel." },
    ],
  }),
});

type Tab = "all" | "sent" | "received";

function RecosPage() {
  const recos = useRecos();
  const stats = useMemo(() => computeStats(), [recos]);
  const [tab, setTab] = useState<Tab>("all");

  const filtered = useMemo(() => {
    return recos.filter((r) => {
      if (tab === "sent") return r.fromMemberId === CURRENT_USER_ID;
      if (tab === "received") return r.toMemberId === CURRENT_USER_ID;
      return true;
    });
  }, [recos, tab]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Business tracking</div>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Suivi des recommandations
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            Toutes les recos envoyées et reçues, leur statut et le CA généré.
            Envoie une nouvelle reco directement depuis une conversation.
          </p>
        </div>
        <Link to="/messages" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5">
          + Envoyer une reco
        </Link>
      </header>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Recos envoyées" value={stats.sentCount} hint={`${stats.wonCount} gagnées`} />
        <Kpi label="Recos reçues" value={stats.receivedCount} />
        <Kpi label="Taux conversion" value={`${stats.conversionRate}%`} hint="recos envoyées → gagnées" />
        <Kpi
          label="CA généré (envoyé)"
          value={fmtEuro(stats.caGenerated)}
          hint={`CA reçu : ${fmtEuro(stats.caReceived)}`}
          accent
        />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {/* Table */}
        <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-card lg:col-span-2">
          <div className="flex items-center gap-1 border-b border-border/70 p-2">
            {([
              { id: "all", label: "Toutes" },
              { id: "sent", label: "Envoyées" },
              { id: "received", label: "Reçues" },
            ] as { id: Tab; label: string }[]).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors " +
                  (tab === t.id ? "bg-primary text-primary-foreground" : "text-ink-muted hover:bg-secondary")
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-ink-muted">
              Aucune reco pour l'instant. Va dans une conversation pour en envoyer une.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-background/40 text-[10px] uppercase tracking-wider text-ink-muted">
                  <tr>
                    <Th>Prospect</Th>
                    <Th>De → Vers</Th>
                    <Th>Montant</Th>
                    <Th>Statut</Th>
                    <Th>Date</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {filtered.map((r) => {
                    const from = getMember(r.fromMemberId);
                    const to = getMember(r.toMemberId);
                    return (
                      <tr key={r.id} className="hover:bg-secondary/40">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{r.prospectName}</div>
                          <div className="text-xs text-ink-muted">{r.prospectCompany}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs">
                            <span className="font-medium text-foreground">{from?.firstName ?? "?"}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium text-foreground">{to?.firstName ?? "?"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-foreground">
                          {r.estimatedAmount ? fmtEuro(r.estimatedAmount) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={r.status}
                            onChange={(e) => updateRecoStatus(r.id, e.target.value as RecoStatus)}
                            className={
                              "rounded-full border px-2.5 py-1 text-[11px] font-semibold outline-none focus:ring-2 focus:ring-ring/40 " +
                              STATUS_COLOR[r.status]
                            }
                          >
                            {(Object.keys(STATUS_LABEL) as RecoStatus[]).map((s) => (
                              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {fmtDate(r.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <aside className="rounded-3xl border border-border bg-gradient-to-br from-primary to-[oklch(0.3_0.08_265)] p-6 text-primary-foreground shadow-elevated">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">Top contributeurs</div>
          <h3 className="mt-2 font-display text-xl font-bold">Leaderboard club</h3>
          <ol className="mt-5 space-y-2.5">
            {stats.leaderboard.map((row, i) => (
              <li key={row.member.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 backdrop-blur">
                <span className="font-display text-lg font-black text-accent">#{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">
                    {row.member.firstName} {row.member.lastName}
                  </div>
                  <div className="text-[11px] text-white/60">
                    {row.sent} reco{row.sent > 1 ? "s" : ""} · {row.won} gagnée{row.won > 1 ? "s" : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs font-bold text-accent">{fmtEuro(row.ca)}</div>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
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
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}
