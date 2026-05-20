import { createFileRoute, Link } from "@tanstack/react-router";
import { MEMBERS, CONVERSATIONS, getMember } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Accueil — COOPERNIK" },
      { name: "description", content: "Tableau de bord membre : annuaire, messagerie, business tracking." },
    ],
  }),
});

function Index() {
  const recent = MEMBERS.slice(0, 4);
  const convos = CONVERSATIONS.slice(0, 3);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60 bg-primary text-primary-foreground">
        <div className="absolute inset-0 bg-mesh opacity-90" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-white/80 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Sprint 1 · Phase 1
            </div>
            <h1 className="mt-6 font-display text-5xl font-black leading-[1.05] tracking-tight text-balance md:text-7xl">
              Le réseau qui<br />
              <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                travaille pour vous.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">
              COOPERNIK donne aux clubs business une plateforme moderne pour activer
              leurs membres, mesurer l'impact des recommandations et faire grandir
              le chiffre d'affaires collectif.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/annuaire"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-primary shadow-glow transition-transform hover:-translate-y-0.5"
              >
                Explorer l'annuaire →
              </Link>
              <Link
                to="/messages"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
              >
                Voir mes messages
              </Link>
            </div>

            <dl className="mt-14 grid max-w-2xl grid-cols-3 gap-8">
              {[
                { k: MEMBERS.length, l: "membres actifs" },
                { k: 12, l: "secteurs représentés" },
                { k: "47", l: "recos en cours" },
              ].map((s) => (
                <div key={s.l}>
                  <dt className="font-display text-4xl font-extrabold tracking-tight">{s.k}</dt>
                  <dd className="mt-1 text-sm uppercase tracking-wider text-white/60">{s.l}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Recent members */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
              Nouveaux membres
            </div>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground">
              Rencontrez votre cercle
            </h2>
          </div>
          <Link to="/annuaire" className="text-sm font-semibold text-accent hover:underline">
            Voir tout l'annuaire →
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {recent.map((m) => (
            <Link
              key={m.id}
              to="/membres/$id"
              params={{ id: m.id }}
              className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-elevated"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent font-display text-lg font-black text-primary-foreground">
                {m.initials}
              </div>
              <div className="mt-4 font-display text-lg font-bold text-foreground">
                {m.firstName} {m.lastName}
              </div>
              <div className="text-sm text-ink-muted">{m.role}</div>
              <div className="mt-1 text-xs font-medium text-accent">{m.company}</div>
              <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="h-1 w-1 rounded-full bg-success" />
                {m.city} · {m.sector}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Two-column: conversations + modules */}
      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-20 lg:grid-cols-3">
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-card lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-bold text-foreground">Conversations récentes</h3>
            <Link to="/messages" className="text-xs font-semibold text-accent hover:underline">
              Boîte de réception
            </Link>
          </div>
          <ul className="mt-5 divide-y divide-border/70">
            {convos.map((c) => {
              const m = getMember(c.memberId)!;
              return (
                <li key={c.id}>
                  <Link
                    to="/messages"
                    className="flex items-center gap-4 py-4 transition-colors hover:bg-secondary/40 -mx-3 px-3 rounded-lg"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground">
                      {m.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-semibold text-foreground">
                          {m.firstName} {m.lastName}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">{c.lastAt}</span>
                      </div>
                      <p className="truncate text-sm text-ink-muted">{c.lastMessage}</p>
                    </div>
                    {c.unread > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-foreground">
                        {c.unread}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-3xl border border-border bg-gradient-to-br from-primary to-[oklch(0.3_0.08_265)] p-6 text-primary-foreground shadow-elevated">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">
            Roadmap V1
          </div>
          <h3 className="mt-2 font-display text-xl font-bold">Bientôt sur COOPERNIK</h3>
          <ul className="mt-5 space-y-3 text-sm">
            {[
              { p: "Phase 2", t: "Page publique du club" },
              { p: "Phase 3", t: "Évènements & check-in QR" },
              { p: "Phase 4", t: "Business tracking · le module clé" },
              { p: "Phase 5", t: "Cotisations & Stripe Connect" },
            ].map((x) => (
              <li key={x.t} className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3 backdrop-blur">
                <span className="mt-0.5 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  {x.p}
                </span>
                <span className="font-medium">{x.t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
