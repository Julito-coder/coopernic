import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MEMBERS, SECTORS, CITIES } from "@/lib/mock-data";
import { MemberCard } from "@/components/MemberCard";

export const Route = createFileRoute("/annuaire")({
  component: AnnuaireePage,
  head: () => ({
    meta: [
      { title: "Annuaire des membres — COOPERNIK" },
      { name: "description", content: "Explorez l'annuaire des membres du club : recherche, filtres par secteur et ville, vue carte." },
    ],
  }),
});

type View = "grid" | "map";

function AnnuaireePage() {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [view, setView] = useState<View>("grid");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MEMBERS.filter((m) => {
      if (sector && m.sector !== sector) return false;
      if (city && m.city !== city) return false;
      if (!q) return true;
      return (
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
        m.company.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, sector, city]);

  const reset = () => { setQuery(""); setSector(""); setCity(""); };
  const hasFilters = query || sector || city;

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Annuaire</div>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
            {MEMBERS.length} membres à activer
          </h1>
          <p className="mt-2 max-w-2xl text-ink-muted">
            Cherchez par nom, entreprise, secteur ou expertise. Filtrez et passez en vue carte
            pour repérer qui est proche de vous.
          </p>
        </div>

        <div className="flex rounded-xl border border-border bg-surface p-1 shadow-card">
          {(["grid", "map"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={
                "rounded-lg px-4 py-2 text-sm font-semibold transition-colors " +
                (view === v
                  ? "bg-primary text-primary-foreground"
                  : "text-ink-muted hover:text-foreground")
              }
            >
              {v === "grid" ? "Liste" : "Carte"}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="mt-8 grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card md:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <input
            type="search"
            placeholder="Rechercher un membre, une entreprise, une compétence…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 pl-11 text-sm text-foreground outline-none ring-ring/50 placeholder:text-muted-foreground focus:ring-2"
          />
          <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        </div>

        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring/50"
        >
          <option value="">Tous secteurs</option>
          {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring/50"
        >
          <option value="">Toutes villes</option>
          {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <button
          onClick={reset}
          disabled={!hasFilters}
          className="rounded-xl border border-border px-4 py-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
        >
          Réinitialiser
        </button>
      </div>

      <div className="mt-4 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{filtered.length}</span> résultat{filtered.length > 1 ? "s" : ""}
      </div>

      {view === "grid" ? (
        filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-surface p-16 text-center">
            <div className="font-display text-lg font-semibold text-foreground">Aucun membre trouvé</div>
            <p className="mt-1 text-sm text-muted-foreground">Essayez d'élargir vos filtres.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m) => <MemberCard key={m.id} member={m} />)}
          </div>
        )
      ) : (
        <MapView members={filtered} />
      )}
    </div>
  );
}

function MapView({ members }: { members: typeof MEMBERS }) {
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary to-[oklch(0.3_0.08_265)] p-6 shadow-elevated">
        <div className="absolute inset-0 bg-mesh opacity-30" />
        <div className="relative aspect-[4/5] w-full md:aspect-[5/4]">
          {/* Simplified France silhouette */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
            <path
              d="M30,15 Q40,8 52,12 L70,10 Q82,18 85,28 L88,42 Q86,55 80,68 L72,82 Q60,90 50,88 L38,90 Q26,86 22,75 L18,60 Q15,48 18,35 Q22,22 30,15 Z"
              fill="oklch(1 0 0 / 0.06)"
              stroke="oklch(1 0 0 / 0.18)"
              strokeWidth="0.4"
            />
          </svg>

          {members.map((m) => (
            <button
              key={m.id}
              onMouseEnter={() => setHover(m.id)}
              onMouseLeave={() => setHover(null)}
              style={{ left: `${m.coords.x}%`, top: `${m.coords.y}%` }}
              className="group absolute -translate-x-1/2 -translate-y-1/2"
            >
              <span className="relative flex h-3.5 w-3.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-accent shadow-lg" />
              </span>
              {hover === m.id && (
                <span className="absolute left-1/2 top-5 z-10 w-44 -translate-x-1/2 rounded-lg bg-white p-2.5 text-left shadow-elevated">
                  <span className="block font-display text-xs font-bold text-primary">
                    {m.firstName} {m.lastName}
                  </span>
                  <span className="block text-[11px] text-ink-muted">{m.company}</span>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-accent">
                    {m.city}
                  </span>
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative mt-4 flex items-center justify-between text-xs text-white/70">
          <span>{members.length} membres géolocalisés</span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent" />
            Cliquez sur une épingle
          </span>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-surface p-5 shadow-card">
        <h3 className="font-display text-lg font-bold text-foreground">Membres sur la carte</h3>
        <ul className="mt-4 max-h-[520px] space-y-2 overflow-y-auto pr-1">
          {members.map((m) => (
            <li key={m.id}>
              <Link
                to="/membres/$id"
                params={{ id: m.id }}
                onMouseEnter={() => setHover(m.id)}
                onMouseLeave={() => setHover(null)}
                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-xs font-bold text-primary-foreground">
                  {m.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-foreground">
                    {m.firstName} {m.lastName}
                  </div>
                  <div className="truncate text-xs text-ink-muted">{m.city} · {m.sector}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
