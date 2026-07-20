import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession, hasRole, type AppRole } from "@/lib/use-session";
import {
  resendInvite,
  setMemberRole,
  revokeMemberRole,
  removeMemberFromClub,
} from "@/lib/members.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Users,
  Plus,
  ShieldCheck,
  Crown,
  Send,
  Loader2,
  Shield,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Super Admin — Coopernic" }] }),
  component: AdminPage,
});

type ClubRow = {
  id: string;
  name: string;
  city: string;
  gestionnaire_id: string | null;
  open_to_network: boolean;
};
type MemberRow = {
  id: string;
  club_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  company: string | null;
  role: string | null;
};
type RoleRow = { user_id: string; role: AppRole; club_id: string | null };

function AdminPage() {
  const session = useSession();

  if (session.loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!session.user) return <Navigate to="/auth" />;
  if (!hasRole(session, "superadmin")) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl font-bold">Accès réservé</h1>
        <p className="mt-2 text-muted-foreground">
          Cet espace est réservé au super administrateur.
        </p>
      </div>
    );
  }

  return <AdminInner />;
}

function AdminInner() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");

  const clubsQ = useQuery({
    queryKey: ["admin", "clubs"],
    queryFn: async (): Promise<ClubRow[]> => {
      const { data, error } = await supabase
        .from("clubs")
        .select("id, name, city, gestionnaire_id, open_to_network")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClubRow[];
    },
  });

  const membersQ = useQuery({
    queryKey: ["admin", "members"],
    queryFn: async (): Promise<MemberRow[]> => {
      const { data, error } = await supabase
        .from("members")
        .select("id, club_id, first_name, last_name, email, company, role")
        .order("first_name");
      if (error) throw error;
      return (data ?? []) as MemberRow[];
    },
  });

  const rolesQ = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: async (): Promise<RoleRow[]> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role, club_id");
      if (error) throw error;
      return (data ?? []) as RoleRow[];
    },
  });

  const createClubMut = useMutation({
    mutationFn: async (input: { name: string; city: string }) => {
      const { error } = await supabase.from("clubs").insert({
        name: input.name,
        city: input.city || "—",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Club créé.");
      setName("");
      setCity("");
      qc.invalidateQueries({ queryKey: ["admin", "clubs"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const deleteClubMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clubs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Club supprimé.");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const clubs = clubsQ.data ?? [];
  const members = membersQ.data ?? [];
  const roles = rolesQ.data ?? [];

  const rolesByUser = useMemo(() => {
    const map = new Map<string, RoleRow[]>();
    for (const r of roles) {
      const arr = map.get(r.user_id) ?? [];
      arr.push(r);
      map.set(r.user_id, arr);
    }
    return map;
  }, [roles]);

  const clubsMissingGest = clubs.filter((c) => !c.gestionnaire_id).length;
  const loading = clubsQ.isLoading || membersQ.isLoading || rolesQ.isLoading;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-10">
      <header>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Back-office plateforme
        </div>
        <h1 className="mt-1 font-display text-3xl font-bold text-foreground">
          Super Admin Coopernic
        </h1>
        <p className="mt-1 text-muted-foreground">
          Tu vois tous les clubs, tous les membres, et tu pilotes leurs rôles et accès.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Clubs actifs" value={clubs.length} />
        <Kpi label="Membres totaux" value={members.length} />
        <Kpi label="Clubs sans gestionnaire" value={clubsMissingGest} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">Créer un club</CardTitle>
          <CardDescription>
            Crée un club business, puis invite un membre et promeus-le gestionnaire.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              createClubMut.mutate({ name: name.trim(), city: city.trim() });
            }}
          >
            <Input
              placeholder="Nom du club"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="sm:max-w-xs"
            />
            <Input
              placeholder="Ville"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="sm:max-w-[180px]"
            />
            <Button type="submit" className="gap-2" disabled={createClubMut.isPending}>
              <Plus className="h-4 w-4" /> Créer le club
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      )}

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Tous les clubs</h2>
        {clubs.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">
            Aucun club pour l'instant. Crée-en un ci-dessus.
          </p>
        )}
        <div className="space-y-4">
          {clubs.map((club) => (
            <ClubBackOfficeCard
              key={club.id}
              club={club}
              members={members.filter((m) => m.club_id === club.id)}
              rolesByUser={rolesByUser}
              onDeleted={() => deleteClubMut.mutate(club.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function ClubBackOfficeCard({
  club,
  members,
  rolesByUser,
  onDeleted,
}: {
  club: ClubRow;
  members: MemberRow[];
  rolesByUser: Map<string, RoleRow[]>;
  onDeleted: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="font-display">{club.name}</CardTitle>
          <CardDescription>
            {club.city} · {members.length} membre{members.length > 1 ? "s" : ""}
            {club.open_to_network && " · Annuaire ouvert"}
          </CardDescription>
        </div>
        <div className="flex items-center gap-1">
          <Link
            to="/club"
            search={{ id: club.id }}
            className="rounded-md border border-border/60 px-3 py-1.5 text-sm font-semibold text-primary hover:bg-secondary"
          >
            Ouvrir l'espace club →
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm(`Supprimer ${club.name} ?`)) onDeleted();
            }}
            title="Supprimer le club"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {members.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" /> Aucun membre. Invite-les depuis « Ouvrir
            l'espace club ».
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Membre</th>
                  <th className="px-3 py-2 text-left font-semibold">Email</th>
                  <th className="px-3 py-2 text-left font-semibold">Rôle</th>
                  <th className="px-3 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <MemberBackOfficeRow
                    key={m.id}
                    club={club}
                    member={m}
                    userRoles={rolesByUser.get(m.id) ?? []}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MemberBackOfficeRow({
  club,
  member,
  userRoles,
}: {
  club: ClubRow;
  member: MemberRow;
  userRoles: RoleRow[];
}) {
  const qc = useQueryClient();
  const setRole = useServerFn(setMemberRole);
  const revokeRole = useServerFn(revokeMemberRole);
  const resend = useServerFn(resendInvite);
  const remove = useServerFn(removeMemberFromClub);
  const [busy, setBusy] = useState(false);

  const isSuper = userRoles.some((r) => r.role === "superadmin");
  const isGest = userRoles.some(
    (r) => r.role === "gestionnaire" && r.club_id === club.id,
  );
  const currentRole: AppRole = isSuper ? "superadmin" : isGest ? "gestionnaire" : "membre";

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });

  async function changeRole(next: AppRole) {
    if (next === currentRole) return;
    setBusy(true);
    try {
      // Retirer l'ancien rôle "élevé" si présent
      if (isSuper && next !== "superadmin") {
        await revokeRole({ data: { userId: member.id, clubId: null, role: "superadmin" } });
      }
      if (isGest && next !== "gestionnaire") {
        await revokeRole({
          data: { userId: member.id, clubId: club.id, role: "gestionnaire" },
        });
      }
      await setRole({
        data: {
          userId: member.id,
          clubId: next === "superadmin" ? null : club.id,
          role: next,
        },
      });
      toast.success("Rôle mis à jour.");
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function doResend() {
    setBusy(true);
    try {
      await resend({
        data: {
          email: member.email,
          memberClubId: club.id,
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
      await remove({ data: { userId: member.id, clubId: club.id } });
      toast.success("Membre retiré.");
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="border-t border-border/60">
      <td className="px-3 py-2">
        <div className="font-medium">
          {member.first_name} {member.last_name}
        </div>
        {member.company && (
          <div className="text-xs text-muted-foreground">{member.company}</div>
        )}
      </td>
      <td className="px-3 py-2 text-muted-foreground">{member.email}</td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <RoleBadge role={currentRole} />
          <Select
            value={currentRole}
            onValueChange={(v) => changeRole(v as AppRole)}
            disabled={busy}
          >
            <SelectTrigger className="h-8 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="membre">Membre</SelectItem>
              <SelectItem value="gestionnaire">Gestionnaire</SelectItem>
              <SelectItem value="superadmin">Super Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </td>
      <td className="px-3 py-2 text-right">
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

function RoleBadge({ role }: { role: AppRole }) {
  if (role === "superadmin")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
        <Shield className="h-3 w-3" /> Super
      </span>
    );
  if (role === "gestionnaire")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-accent">
        <Crown className="h-3 w-3" /> Gest.
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
      Membre
    </span>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-display text-3xl font-bold text-primary">{value}</div>
    </div>
  );
}
