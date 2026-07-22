import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";
import { Globe2, Users, Lock, Loader2, Search, ChevronLeft, MapPin, Building2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/annuaire")({
  component: AnnuairePage,
  head: () => ({
    meta: [
      { title: "Annuaire — Coopernic" },
      { name: "description", content: "Membres de ton club business, et si ton club est ouvert, du réseau Coopernic." },
    ],
  }),
});

type MemberRow = {
  id: string;
  club_id: string | null;
  first_name: string;
  last_name: string;
  role: string | null;
  company: string | null;
  sector: string | null;
  city: string | null;
  bio: string | null;
  tags: string[] | null;
};
type ClubRow = {
  id: string;
  name: string;
  city: string;
  bio: string | null;
  open_to_network: boolean;
};

type Scope = "club" | "network";

function AnnuairePage() {
  const session = useSession();

  if (session.loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!session.user) return <Navigate to="/auth" />;

  return <Inner userClubId={session.memberClubId ?? null} />;
}

function Inner({ userClubId }: { userClubId: string | null }) {
  const [scope, setScope] = useState<Scope>("club");
  const [query, setQuery] = useState("");
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);

  // My club
  const myClubQ = useQuery({
    queryKey: ["annuaire", "myClub", userClubId],
    enabled: !!userClubId,
    queryFn: async (): Promise<ClubRow | null> => {
      const { data, error } = await supabase
        .from("clubs")
        .select("id, name, city, bio, open_to_network")
        .eq("id", userClubId!)
        .maybeSingle();
      if (error) throw error;
      return (data as ClubRow) ?? null;
    },
  });
  const myClub = myClubQ.data ?? null;
  const canSeeNetwork = !!myClub?.open_to_network;

  // Members (RLS scopes automatically). We fetch all we can see, then filter client-side by scope.
  const membersQ = useQuery({
    queryKey: ["annuaire", "members", scope, canSeeNetwork],
    queryFn: async (): Promise<MemberRow[]> => {
      const { data, error } = await supabase
        .from("members")
        .select("id, club_id, first_name, last_name, role, company, sector, city, bio, tags")
        .order("first_name");
      if (error) throw error;
      return (data ?? []) as MemberRow[];
    },
  });
  const allMembers = membersQ.data ?? [];

  // Other clubs (for network browsing)
  const otherClubsQ = useQuery({
    queryKey: ["annuaire", "otherClubs"],
    enabled: scope === "network" && canSeeNetwork,
    queryFn: async (): Promise<ClubRow[]> => {
      const { data, error } = await supabase
        .from("clubs")
        .select("id, name, city, bio, open_to_network")
        .eq("open_to_network", true)
        .order("name");
      if (error) throw error;
      return ((data ?? []) as ClubRow[]).filter((c) => c.id !== userClubId);
    },
  });

  const effectiveScope: Scope = scope === "network" && !canSeeNetwork ? "club" : scope;

  const filtered = useMemo(() => {
    let base = allMembers;
    if (effectiveScope === "club") {
      base = myClub ? allMembers.filter((m) => m.club_id === myClub.id) : [];
    } else if (selectedClubId) {
      base = allMembers.filter((m) => m.club_id === selectedClubId);
    } else {
      base = myClub ? allMembers.filter((m) => m.club_id !== myClub.id) : allMembers;
    }
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((m) => {
      return (
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
        (m.company ?? "").toLowerCase().includes(q) ||
        (m.role ?? "").toLowerCase().includes(q) ||
        (m.sector ?? "").toLowerCase().includes(q) ||
        (m.city ?? "").toLowerCase().includes(q) ||
        (m.tags ?? []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [allMembers, effectiveScope, selectedClubId, query, myClub?.id]);

  const selectedClub = otherClubsQ.data?.find((c) => c.id === selectedClubId) ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-5 py-8 md:px-6 md:py-10">
      {/* Header */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Annuaire</div>
        <h1 className="mt-1 font-display text-3xl font-bold text-foreground md:text-4xl">
          {effectiveScope === "club" && myClub
            ? myClub.name
            : selectedClub
            ? selectedClub.name
            : "Réseau Coopernic"}
        </h1>
        {effectiveScope === "club" && myClub && (
          <p className="mt-1 text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {myClub.city}
            </span>
            {" · "}
            {filtered.length} membre{filtered.length > 1 ? "s" : ""}
          </p>
        )}
        {effectiveScope === "club" && myClub?.bio && (
          <p className="mt-3 max-w-2xl whitespace-pre-line rounded-xl border border-border/60 bg-secondary/30 p-3 text-sm text-foreground">
            {myClub.bio}
          </p>
        )}
      </div>

      {/* Scope switch */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-border bg-card p-1">
          {myClub && (
            <ScopeBtn
              active={effectiveScope === "club"}
              onClick={() => {
                setScope("club");
                setSelectedClubId(null);
              }}
              icon={<Users className="h-4 w-4" />}
              label={`Mon club`}
            />
          )}
          <ScopeBtn
            active={effectiveScope === "network"}
            disabled={!canSeeNetwork}
            onClick={() => canSeeNetwork && setScope("network")}
            icon={canSeeNetwork ? <Globe2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            label="Voir les autres clubs"
          />
        </div>
      </div>

      {!canSeeNetwork && myClub && (
        <p className="text-xs text-muted-foreground">
          Ton club est privé. Pour voir les membres du réseau Coopernic, le gestionnaire doit ouvrir
          l'annuaire inter-clubs depuis <Link to="/club" className="font-semibold text-accent underline">la page du club</Link>.
          La visibilité est réciproque.
        </p>
      )}

      {/* Network — club selection */}
      {effectiveScope === "network" && canSeeNetwork && !selectedClubId && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Clubs ouverts au réseau
          </h2>
          {otherClubsQ.isLoading ? (
            <div className="rounded-xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
              Chargement des clubs…
            </div>
          ) : (otherClubsQ.data?.length ?? 0) === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Aucun autre club n'est actuellement ouvert au réseau.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {otherClubsQ.data!.map((c) => {
                const count = allMembers.filter((m) => m.club_id === c.id).length;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedClubId(c.id)}
                    className="group flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-card"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-display text-base font-bold text-foreground">
                          {c.name}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {c.city} · {count} membre{count > 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                    {c.bio && (
                      <p className="line-clamp-3 text-xs text-ink-muted">{c.bio}</p>
                    )}
                    <span className="mt-auto text-xs font-semibold text-accent opacity-0 transition-opacity group-hover:opacity-100">
                      Voir les membres →
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Members grid (club or selected external club) */}
      {(effectiveScope === "club" || selectedClubId) && (
        <>
          {selectedClub && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedClubId(null)}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Retour aux clubs
              </Button>
              <div className="text-sm text-muted-foreground">
                {selectedClub.city} · {filtered.length} membre{filtered.length > 1 ? "s" : ""}
              </div>
            </div>
          )}

          {selectedClub?.bio && (
            <p className="max-w-2xl whitespace-pre-line rounded-xl border border-border/60 bg-secondary/30 p-3 text-sm text-foreground">
              {selectedClub.bio}
            </p>
          )}

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un nom, société, expertise…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {membersQ.isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <div className="font-display text-lg font-semibold text-foreground">
                Aucun membre trouvé
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Essaie une autre recherche.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((m) => (
                <MemberCardReal key={m.id} member={m} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function initialsFrom(f: string, l: string) {
  return `${(f[0] ?? "").toUpperCase()}${(l[0] ?? "").toUpperCase()}` || "??";
}

function MemberCardReal({ member }: { member: MemberRow }) {
  return (
    <Link
      to="/membres/$id"
      params={{ id: member.id }}
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-card"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary font-display text-sm font-bold text-primary-foreground">
          {initialsFrom(member.first_name, member.last_name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-base font-bold text-foreground">
            {member.first_name} {member.last_name}
          </div>
          {member.role && (
            <div className="truncate text-sm text-ink-muted">{member.role}</div>
          )}
          {member.company && (
            <div className="truncate text-xs font-medium text-accent">{member.company}</div>
          )}
        </div>
      </div>

      {member.bio && (
        <p className="line-clamp-2 text-sm leading-relaxed text-ink-muted">{member.bio}</p>
      )}

      {(member.tags?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {member.tags!.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-semibold text-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {member.city ?? "—"}
        </span>
        <span className="inline-flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Mail className="h-3 w-3" /> Voir la fiche →
        </span>
      </div>
    </Link>
  );
}

function ScopeBtn({
  active,
  onClick,
  icon,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors " +
        (disabled
          ? "cursor-not-allowed text-muted-foreground opacity-60"
          : active
          ? "bg-accent text-accent-foreground"
          : "text-ink-muted hover:text-foreground")
      }
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
