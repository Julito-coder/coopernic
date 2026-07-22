import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession, hasRole, type AppRole } from "@/lib/use-session";
import {
  inviteMember,
  resendInvite,
  removeMemberFromClub,
  setMemberRole,
} from "@/lib/members.functions";
import {
  ALL_MODULES,
  type ModuleKey,
  createClubAsGestionnaire,
  updateClubModules,
} from "@/lib/clubs.functions";
import {
  listClubModulePermissions,
  setUserModulePermissions,
} from "@/lib/module-perms.functions";
import { Checkbox } from "@/components/ui/checkbox";
import { SECTORS, CITIES } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Trash2,
  UserPlus,
  Crown,
  ShieldCheck,
  Globe2,
  Send,
  Loader2,
} from "lucide-react";
import { ClubPotsSection } from "@/components/ClubPotsSection";

type Search = { id?: string };

export const Route = createFileRoute("/club")({
  head: () => ({ meta: [{ title: "Gestion du club — Coopernic" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    id: typeof s.id === "string" ? s.id : undefined,
  }),
  component: ClubPage,
});

type ClubRow = {
  id: string;
  name: string;
  city: string;
  gestionnaire_id: string | null;
  open_to_network: boolean;
  modules: string[] | null;
};
type MemberRow = {
  id: string;
  club_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  role: string | null;
  company: string | null;
  sector: string | null;
  city: string | null;
};

function ClubPage() {
  const session = useSession();
  const search = Route.useSearch();

  if (session.loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!session.user) return <Navigate to="/auth" />;

  const isSuper = hasRole(session, "superadmin");
  const isGest = hasRole(session, "gestionnaire");
  if (!isSuper && !isGest) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl font-bold">Accès réservé</h1>
        <p className="mt-2 text-muted-foreground">
          Seuls le gestionnaire du club et le super admin peuvent gérer les membres.
        </p>
      </div>
    );
  }

  const clubId = search.id ?? session.managedClubId ?? "";
  if (!clubId) {
    if (isGest && !isSuper) {
      return <CreateClubForm />;
    }
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Aucun club sélectionné</h1>
        <p className="mt-2 text-muted-foreground">
          Va dans{" "}
          <Link to="/admin" className="text-accent underline">
            Super Admin
          </Link>{" "}
          pour en choisir un.
        </p>
      </div>
    );
  }

  return <ClubInner clubId={clubId} isSuper={isSuper} />;
}

function ClubInner({ clubId, isSuper }: { clubId: string; isSuper: boolean }) {
  const qc = useQueryClient();

  const clubQ = useQuery({
    queryKey: ["club", clubId],
    queryFn: async (): Promise<ClubRow | null> => {
      const { data, error } = await supabase
        .from("clubs")
        .select("id, name, city, gestionnaire_id, open_to_network, modules")
        .eq("id", clubId)
        .maybeSingle();
      if (error) throw error;
      return (data as ClubRow) ?? null;
    },
  });

  const membersQ = useQuery({
    queryKey: ["club", clubId, "members"],
    queryFn: async (): Promise<MemberRow[]> => {
      const { data, error } = await supabase
        .from("members")
        .select("id, club_id, first_name, last_name, email, role, company, sector, city")
        .eq("club_id", clubId)
        .order("first_name");
      if (error) throw error;
      return (data ?? []) as MemberRow[];
    },
  });

  const rolesQ = useQuery({
    queryKey: ["club", clubId, "roles"],
    queryFn: async (): Promise<Record<string, AppRole>> => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id, role, club_id");
      const map: Record<string, AppRole> = {};
      const rank: Record<string, number> = { superadmin: 3, gestionnaire: 2, membre: 1 };
      (data ?? []).forEach((r: any) => {
        if (r.role === "superadmin") {
          if ((rank[map[r.user_id] ?? ""] ?? 0) < 3) map[r.user_id] = "superadmin";
        } else if (r.club_id === clubId) {
          const current = rank[map[r.user_id] ?? ""] ?? 0;
          if ((rank[r.role] ?? 0) > current) map[r.user_id] = r.role;
        }
      });
      return map;
    },
  });

  const listPermsFn = useServerFn(listClubModulePermissions);
  const permsQ = useQuery({
    queryKey: ["club", clubId, "module-perms"],
    queryFn: () => listPermsFn({ data: { clubId } }),
  });
  const permsByUser: Record<string, Set<string>> = {};
  for (const p of permsQ.data?.permissions ?? []) {
    const s = permsByUser[p.user_id] ?? new Set<string>();
    s.add(p.module);
    permsByUser[p.user_id] = s;
  }

  const club = clubQ.data;
  const members = membersQ.data ?? [];
  const rolesMap = rolesQ.data ?? {};

  if (clubQ.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!club) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Club introuvable</h1>
      </div>
    );
  }

  const gest = members.find((m) => m.id === club.gestionnaire_id);

  async function toggleOpen(v: boolean) {
    const { error } = await supabase
      .from("clubs")
      .update({ open_to_network: v })
      .eq("id", clubId);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["club", clubId] });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-10">
      <header>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Espace gestionnaire
        </div>
        <h1 className="mt-1 font-display text-3xl font-bold text-foreground">
          {club.name}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {club.city} · {members.length} membre{members.length > 1 ? "s" : ""}
          {gest && (
            <>
              {" "}
              · Gestionnaire : {gest.first_name} {gest.last_name}
            </>
          )}
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Globe2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="font-display">
                Annuaire Coopernic inter-clubs
              </CardTitle>
              <CardDescription className="mt-1 max-w-xl">
                Active pour rendre ton club visible dans l'annuaire global. Les membres
                d'autres clubs pourront trouver et contacter les tiens — et inversement.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <span
              className={
                "text-xs font-bold uppercase tracking-wider " +
                (club.open_to_network ? "text-accent" : "text-muted-foreground")
              }
            >
              {club.open_to_network ? "Ouvert" : "Privé"}
            </span>
            <Switch
              checked={club.open_to_network}
              onCheckedChange={(v) => toggleOpen(v)}
            />
          </div>
        </CardHeader>
      </Card>

      <ClubModulesCard club={club} />

      <ResponsablesCard club={club} members={members} rolesMap={rolesMap} />




      <AddMemberForm clubId={club.id} clubName={club.name} />

      <ClubPotsSection clubId={club.id} />

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Membres du club</h2>
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Membre</th>
                <th className="px-4 py-3 text-left font-semibold">Société</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Rôle</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <MemberRowUI
                  key={m.id}
                  member={m}
                  clubId={club.id}
                  isGest={(rolesMap[m.id] ?? "membre") === "gestionnaire"}
                  currentRole={rolesMap[m.id] ?? "membre"}
                  hasPerms={(permsByUser[m.id]?.size ?? 0) > 0}
                  isSuper={isSuper}
                />
              ))}

              {members.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Aucun membre. Invite le premier ci-dessus.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {isSuper && (
          <p className="text-xs text-muted-foreground">
            Astuce : depuis{" "}
            <Link to="/admin" className="text-accent underline">
              Super Admin
            </Link>
            , tu peux changer le rôle d'un membre (gestionnaire, super admin).
          </p>
        )}
      </section>
    </div>
  );
}

type StatusKey = "membre" | "responsable" | "gestionnaire" | "superadmin";

function MemberRowUI({
  member,
  clubId,
  isGest,
  currentRole,
  hasPerms,
  isSuper,
}: {
  member: MemberRow;
  clubId: string;
  isGest: boolean;
  currentRole: AppRole;
  hasPerms: boolean;
  isSuper: boolean;
}) {
  const qc = useQueryClient();
  const resend = useServerFn(resendInvite);
  const remove = useServerFn(removeMemberFromClub);
  const changeRole = useServerFn(setMemberRole);
  const setPerms = useServerFn(setUserModulePermissions);
  const [busy, setBusy] = useState(false);

  const status: StatusKey =
    currentRole === "superadmin"
      ? "superadmin"
      : currentRole === "gestionnaire"
        ? "gestionnaire"
        : hasPerms
          ? "responsable"
          : "membre";

  async function doResend() {
    setBusy(true);
    try {
      await resend({
        data: {
          email: member.email,
          memberClubId: clubId,
          redirectTo: `${window.location.origin}/auth/set-password`,
        },
      });
      toast.success("Email d'accès renvoyé.");
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function doRemove() {
    if (!confirm(`Retirer ${member.first_name} du club ?`)) return;
    setBusy(true);
    try {
      await remove({ data: { userId: member.id, clubId } });
      toast.success("Membre retiré.");
      qc.invalidateQueries({ queryKey: ["club", clubId] });
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function doChangeStatus(next: StatusKey) {
    if (next === status) return;
    if (next === "superadmin" && !isSuper) return;
    setBusy(true);
    try {
      if (next === "superadmin") {
        await changeRole({
          data: { userId: member.id, clubId: null, role: "superadmin" },
        });
      } else if (next === "gestionnaire") {
        if (hasPerms) await setPerms({ data: { clubId, userId: member.id, modules: [] } });
        await changeRole({
          data: { userId: member.id, clubId, role: "gestionnaire" },
        });
      } else if (next === "membre") {
        if (currentRole === "gestionnaire") {
          await changeRole({ data: { userId: member.id, clubId, role: "membre" } });
        }
        if (hasPerms) {
          await setPerms({ data: { clubId, userId: member.id, modules: [] } });
        }
      } else if (next === "responsable") {
        if (currentRole === "gestionnaire") {
          await changeRole({ data: { userId: member.id, clubId, role: "membre" } });
        }
        toast.info(
          "Sélectionne ses modules dans la carte « Responsables de modules » ci-dessus.",
        );
      }
      toast.success("Rôle mis à jour.");
      qc.invalidateQueries({ queryKey: ["club", clubId] });
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="border-t border-border/60">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 font-medium">
          {member.first_name} {member.last_name}
          {isGest && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-accent">
              <Crown className="h-3 w-3" /> Gestionnaire
            </span>
          )}
        </div>
        {member.role && (
          <div className="text-xs text-muted-foreground">{member.role}</div>
        )}
      </td>
      <td className="px-4 py-3">{member.company ?? "—"}</td>
      <td className="px-4 py-3 text-muted-foreground">{member.email}</td>
      <td className="px-4 py-3">
        <Select
          value={status}
          onValueChange={(v) => doChangeStatus(v as StatusKey)}
          disabled={busy || (status === "superadmin" && !isSuper)}
        >
          <SelectTrigger className="h-9 w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="membre">Membre</SelectItem>
            <SelectItem value="responsable">Responsable</SelectItem>
            <SelectItem value="gestionnaire">Gestionnaire</SelectItem>
            {isSuper && <SelectItem value="superadmin">Super admin</SelectItem>}
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={doResend}
            disabled={busy}
            title="Renvoyer l'email d'accès"
          >
            <Send className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={doRemove}
            disabled={busy}
            title="Retirer du club"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function AddMemberForm({ clubId, clubName }: { clubId: string; clubName: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    role: "",
    company: "",
    sector: SECTORS[0],
    city: "",
    email: "",
    phone: "",
  });
  const [appRole, setAppRole] = useState<"membre" | "responsable" | "gestionnaire">(
    "membre",
  );
  const [respModules, setRespModules] = useState<Set<ModuleKey>>(new Set());
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));
  const invite = useServerFn(inviteMember);
  const changeRole = useServerFn(setMemberRole);
  const setPerms = useServerFn(setUserModulePermissions);

  function toggleRespModule(key: ModuleKey, on: boolean) {
    setRespModules((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Ajouter un membre</CardTitle>
        <CardDescription>
          Un email d'invitation sera envoyé pour créer son compte.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
              toast.error("Prénom, nom et email sont requis.");
              return;
            }
            if (appRole === "responsable" && respModules.size === 0) {
              toast.error("Sélectionne au moins un module pour le responsable.");
              return;
            }
            setLoading(true);
            try {
              const res = await invite({
                data: {
                  clubId,
                  clubName,
                  email: form.email.trim(),
                  firstName: form.firstName.trim(),
                  lastName: form.lastName.trim(),
                  role: form.role,
                  company: form.company,
                  sector: form.sector,
                  city: form.city,
                  phone: form.phone,
                  redirectTo: `${window.location.origin}/auth/set-password`,
                },
              });
              if (appRole === "gestionnaire") {
                await changeRole({
                  data: { userId: res.memberId, clubId, role: "gestionnaire" },
                });
              } else if (appRole === "responsable") {
                await setPerms({
                  data: {
                    clubId,
                    userId: res.memberId,
                    modules: [...respModules],
                  },
                });
              }
              toast.success(
                res.reinvited
                  ? "Compte existant — email de réinitialisation envoyé."
                  : "Invitation envoyée par email.",
              );
              setForm({
                firstName: "",
                lastName: "",
                role: "",
                company: "",
                sector: SECTORS[0],
                city: "",
                email: "",
                phone: "",
              });
              setAppRole("membre");
              setRespModules(new Set());
              qc.invalidateQueries({ queryKey: ["club", clubId] });
              qc.invalidateQueries({ queryKey: ["admin"] });
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Échec de l'invitation");
            } finally {
              setLoading(false);
            }
          }}
        >
          <Input
            placeholder="Prénom"
            value={form.firstName}
            onChange={(e) => set("firstName")(e.target.value)}
          />
          <Input
            placeholder="Nom"
            value={form.lastName}
            onChange={(e) => set("lastName")(e.target.value)}
          />
          <Input
            placeholder="Fonction"
            value={form.role}
            onChange={(e) => set("role")(e.target.value)}
          />
          <Input
            placeholder="Société"
            value={form.company}
            onChange={(e) => set("company")(e.target.value)}
          />
          <Select value={form.sector} onValueChange={set("sector")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SECTORS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Ville"
            value={form.city}
            onChange={(e) => set("city")(e.target.value)}
          />
          <Input
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => set("email")(e.target.value)}
          />
          <Input
            placeholder="Téléphone"
            value={form.phone}
            onChange={(e) => set("phone")(e.target.value)}
          />

          <div className="sm:col-span-2 lg:col-span-4 space-y-3 rounded-lg border border-border/60 bg-secondary/30 p-4">
            <div>
              <div className="text-sm font-semibold">Rôle dans le club</div>
              <div className="text-xs text-muted-foreground">
                Tu pourras le modifier à tout moment ensuite.
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  { key: "membre", label: "Membre", desc: "Accès standard aux modules." },
                  {
                    key: "responsable",
                    label: "Responsable",
                    desc: "Gère certains modules choisis ci-dessous.",
                  },
                  {
                    key: "gestionnaire",
                    label: "Gestionnaire",
                    desc: "Tous les droits sur le club.",
                  },
                ] as const
              ).map((opt) => {
                const active = appRole === opt.key;
                return (
                  <button
                    type="button"
                    key={opt.key}
                    onClick={() => setAppRole(opt.key)}
                    className={
                      "rounded-lg border p-3 text-left transition " +
                      (active
                        ? "border-accent bg-accent/10"
                        : "border-border/60 hover:bg-secondary/60")
                    }
                  >
                    <div className="text-sm font-semibold">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.desc}</div>
                  </button>
                );
              })}
            </div>

            {appRole === "responsable" && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Modules à gérer
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ALL_MODULES.map((key) => {
                    const meta = MODULE_META[key];
                    const checked = respModules.has(key);
                    return (
                      <label
                        key={key}
                        className="flex cursor-pointer items-start gap-3 rounded-md border border-border/60 bg-background p-2"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => toggleRespModule(key, v === true)}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">{meta.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {meta.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" className="gap-2" disabled={loading}>
              <UserPlus className="h-4 w-4" /> {loading ? "Envoi…" : "Inviter au club"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const MODULE_META: Record<ModuleKey, { label: string; description: string }> = {
  annuaire: {
    label: "Annuaire",
    description: "Fiches des membres du club, recherche et filtres.",
  },
  messages: {
    label: "Messagerie",
    description: "Conversations 1-to-1 entre membres.",
  },
  evenements: {
    label: "Évènements",
    description: "Création d'évènements, sondages de présence.",
  },
  cagnottes: {
    label: "Paiements",
    description: "Paiements partagés (liés ou non à un évènement), encaissés via Stripe.",
  },
  cotisations: {
    label: "Cotisations",
    description: "Plans mensuel / trimestriel / annuel, relances automatiques.",
  },
  carte: {
    label: "Carte",
    description: "Géolocalisation des membres et proposition de café.",
  },
  recos: {
    label: "Stats & Recos",
    description: "Suivi des recommandations et statistiques business.",
  },
};

function ClubModulesCard({ club }: { club: ClubRow }) {
  const qc = useQueryClient();
  const update = useServerFn(updateClubModules);
  const current = new Set<ModuleKey>(
    ((club.modules ?? ALL_MODULES) as ModuleKey[]).filter((m) =>
      (ALL_MODULES as readonly string[]).includes(m),
    ),
  );
  const [selected, setSelected] = useState<Set<ModuleKey>>(current);
  const [saving, setSaving] = useState(false);

  const dirty =
    selected.size !== current.size ||
    [...selected].some((m) => !current.has(m));

  function toggle(key: ModuleKey, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  async function save() {
    if (selected.size === 0) {
      toast.error("Sélectionne au moins un module.");
      return;
    }
    setSaving(true);
    try {
      await update({ data: { clubId: club.id, modules: [...selected] } });
      toast.success("Modules mis à jour.");
      qc.invalidateQueries({ queryKey: ["club", club.id] });
      qc.invalidateQueries({ queryKey: ["user-modules"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Modules activés</CardTitle>
        <CardDescription>
          Coche les outils disponibles pour les membres de ton club. Tu peux en ajouter
          ou en retirer à tout moment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          {ALL_MODULES.map((key) => {
            const meta = MODULE_META[key];
            const checked = selected.has(key);
            return (
              <label
                key={key}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3 hover:bg-secondary/40"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => toggle(key, v === true)}
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{meta.label}</div>
                  <div className="text-xs text-muted-foreground">{meta.description}</div>
                </div>
              </label>
            );
          })}
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={!dirty || saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateClubForm() {
  const qc = useQueryClient();
  const create = useServerFn(createClubAsGestionnaire);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [modules, setModules] = useState<Set<ModuleKey>>(new Set(ALL_MODULES));
  const [loading, setLoading] = useState(false);

  function toggle(key: ModuleKey, on: boolean) {
    setModules((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !city.trim()) {
      toast.error("Nom et ville sont requis.");
      return;
    }
    if (modules.size === 0) {
      toast.error("Sélectionne au moins un module.");
      return;
    }
    setLoading(true);
    try {
      await create({
        data: { name: name.trim(), city: city.trim(), modules: [...modules] },
      });
      toast.success("Club créé !");
      qc.invalidateQueries();
      window.location.reload();
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <header>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Bienvenue
        </div>
        <h1 className="mt-1 font-display text-3xl font-bold text-foreground">
          Crée ton club business
        </h1>
        <p className="mt-1 text-muted-foreground">
          Donne un nom à ton groupe, choisis les modules et invite tes membres ensuite.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">Informations du club</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Nom du club"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                placeholder="Ville"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold">Modules à activer</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {ALL_MODULES.map((key) => {
                  const meta = MODULE_META[key];
                  const checked = modules.has(key);
                  return (
                    <label
                      key={key}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3 hover:bg-secondary/40"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => toggle(key, v === true)}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{meta.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {meta.description}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? "Création…" : "Créer mon club"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ResponsablesCard({
  club,
  members,
  rolesMap,
}: {
  club: ClubRow;
  members: MemberRow[];
  rolesMap: Record<string, AppRole>;
}) {
  const qc = useQueryClient();
  const listFn = useServerFn(listClubModulePermissions);
  const setFn = useServerFn(setUserModulePermissions);
  const q = useQuery({
    queryKey: ["club", club.id, "module-perms"],
    queryFn: () => listFn({ data: { clubId: club.id } }),
  });
  const perms = q.data?.permissions ?? [];
  const byUser: Record<string, Set<string>> = {};
  for (const p of perms) {
    const set = byUser[p.user_id] ?? new Set();
    set.add(p.module);
    byUser[p.user_id] = set;
  }
  const enabledModules = (club.modules ?? []) as string[];
  const [openUser, setOpenUser] = useState<string | null>(null);

  async function save(userId: string, modules: string[]) {
    try {
      await setFn({ data: { clubId: club.id, userId, modules } });
      toast.success("Droits mis à jour.");
      qc.invalidateQueries({ queryKey: ["club", club.id, "module-perms"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Responsables de modules</CardTitle>
        <CardDescription>
          Délègue la gestion d'un module (évènements, cotisations…) à un membre. Il
          pourra créer et modifier ce module uniquement.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {members.map((m) => {
          const userPerms = byUser[m.id] ?? new Set<string>();
          const isOpen = openUser === m.id;
          const isGest = (rolesMap[m.id] ?? "membre") === "gestionnaire";
          return (
            <div key={m.id} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">
                    {m.first_name} {m.last_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isGest
                      ? "Gestionnaire — tous les droits"
                      : userPerms.size > 0
                        ? `Responsable de : ${[...userPerms].join(", ")}`
                        : "Aucun droit de gestion"}
                  </div>
                </div>
                <button
                  onClick={() => setOpenUser(isOpen ? null : m.id)}
                  className="px-2 py-1 rounded-md border text-xs"
                >
                  {isOpen ? "Fermer" : "Configurer"}
                </button>
              </div>
              {isOpen && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {enabledModules.map((mod) => {
                    const meta = (MODULE_META as any)[mod];
                    const checked = userPerms.has(mod);
                    return (
                      <label
                        key={mod}
                        className="flex items-center gap-2 rounded-md border p-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = new Set(userPerms);
                            if (e.target.checked) next.add(mod);
                            else next.delete(mod);
                            save(m.id, [...next]);
                          }}
                        />
                        <span className="text-xs font-medium">
                          {meta?.label ?? mod}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {members.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun membre à déléguer.</p>
        )}
      </CardContent>
    </Card>
  );
}
