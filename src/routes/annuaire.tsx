import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SECTORS, CITIES, type Member } from "@/lib/mock-data";
import { MemberCard } from "@/components/MemberCard";
import {
  useAuth,
  allMembers,
  membersOfClub,
  networkMembers,
  getClub,
  listClubs,
} from "@/lib/auth-store";
import { Globe2, Users, Lock } from "lucide-react";

export const Route = createFileRoute("/annuaire")({
  component: AnnuaireePage,
  head: () => ({
    meta: [
      { title: "Annuaire des membres — Coopernic" },
      { name: "description", content: "Explorez les membres de votre club et trouvez quelqu'un dans l'annuaire Coopernic inter-clubs." },
    ],
  }),
});

type View = "grid" | "map";
type Scope = "club" | "network";

function AnnuaireePage() {
  const { session } = useAuth();
  const myClub = session.clubId ? getClub(session.clubId) : null;

  const [query, setQuery] = useState("");
  const [sector, setSector] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [view, setView] = useState<View>("grid");

  // Règle : réciprocité. Un club privé ne voit pas le réseau et n'y figure pas.
  const canSeeNetwork = !myClub || myClub.openToNetwork || session.role === "superadmin";
  const [scope, setScope] = useState<Scope>(myClub ? "club" : "network");
  const effectiveScope: Scope = scope === "network" && !canSeeNetwork ? "club" : scope;

  const base = useMemo<Member[]>(() => {
    if (effectiveScope === "club" && myClub) {
      return membersOfClub(myClub.name);
    }
    // Réseau : tous les membres dont le club a opté pour l'annuaire global
    const net = networkMembers();
    // si l'utilisateur a un club, inclure aussi ses propres membres
    if (myClub) {
      const own = membersOfClub(myClub.name);
      const seen = new Set(net.map((m) => m.id));
      return [...own.filter((m) => !seen.has(m.id)), ...net];
    }
    return effectiveScope === "network" ? net : allMembers();
  }, [effectiveScope, myClub?.id, myClub?.openToNetwork]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return base.filter((m) => {
      if (sector && m.sector !== sector) return false;
      if (city && m.city !== city) return false;
      if (!q) return true;
      return (
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
        m.company.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.club.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [base, query, sector, city]);

  const reset = () => { setQuery(""); setSector(""); setCity(""); };
  const hasFilters = query || sector || city;
  const openClubsCount = listClubs().filter((c) => c.openToNetwork).length;

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Annuaire</div>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
            {effectiveScope === "club" && myClub
              ? `${filtered.length} membre${filtered.length > 1 ? "s" : ""} dans ${myClub.name}`
              : `Trouver quelqu'un dans l'annuaire Coopernic`}
          </h1>
          <p className="mt-2 max-w-2xl text-ink-muted">
            {effectiveScope === "club"
              ? "Cherchez par nom, entreprise, secteur ou expertise au sein de votre club."
              : `Découvrez les membres des ${openClubsCount} club${openClubsCount > 1 ? "s" : ""} ouverts au réseau Coopernic.`}
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

      {/* Scope switch */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-border bg-surface p-1 shadow-card">
          {myClub && (
            <ScopeBtn
              active={effectiveScope === "club"}
              onClick={() => setScope("club")}
              icon={<Users className="h-4 w-4" />}
              label={`Mon club · ${myClub.name}`}
            />
          )}
          <ScopeBtn
            active={effectiveScope === "network"}
            disabled={!canSeeNetwork}
            onClick={() => canSeeNetwork && setScope("network")}
            icon={canSeeNetwork ? <Globe2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            label="Réseau Coopernic"
            badge={canSeeNetwork ? `${openClubsCount} clubs` : undefined}
          />
        </div>
        {!canSeeNetwork && myClub && (
          <p className="text-xs text-ink-muted">
            Club privé : pour voir les autres membres du réseau, active l'annuaire inter-clubs depuis{" "}
            <Link to="/club" className="font-semibold text-accent underline">la page de ton club</Link>.
            La visibilité est réciproque.
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="mt-6 grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card md:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <input
            type="search"
            placeholder="Rechercher un membre, une entreprise, un club, une compétence…"
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
            {filtered.map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                clubBadge={effectiveScope === "network" ? m.club : undefined}
                isExternal={effectiveScope === "network" && (!myClub || m.club !== myClub.name)}
              />
            ))}
          </div>
        )
      ) : (
        <MapView members={filtered} />
      )}
    </div>
  );
}

function ScopeBtn({
  active, onClick, icon, label, badge, disabled,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors " +
        (disabled
          ? "cursor-not-allowed text-muted-foreground opacity-60"
          : active
          ? "bg-accent text-accent-foreground"
          : "text-ink-muted hover:text-foreground")
      }
    >
      {icon}
      <span>{label}</span>
      {badge && (
        <span className={
          "rounded-full px-1.5 py-0.5 text-[10px] font-bold " +
          (active ? "bg-accent-foreground/20" : "bg-secondary text-foreground")
        }>{badge}</span>
      )}
    </button>
  );
}

function MapView({ members }: { members: Member[] }) {
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary to-[oklch(0.3_0.08_265)] p-6 shadow-elevated">
        <div className="absolute inset-0 bg-mesh opacity-30" />
        <div className="relative aspect-[4/5] w-full md:aspect-[5/4]">
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
                    {m.city} · {m.club}
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
                  <div className="truncate text-xs text-ink-muted">{m.club} · {m.city}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
