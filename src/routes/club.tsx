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
} from "@/lib/members.functions";
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
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Aucun club sélectionné</h1>
        <p className="mt-2 text-muted-foreground">
          {isSuper ? (
            <>
              Va dans{" "}
              <Link to="/admin" className="text-accent underline">
                Super Admin
              </Link>{" "}
              pour en choisir un.
            </>
          ) : (
            "Aucun club n'est rattaché à ton compte."
          )}
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
        .select("id, name, city, gestionnaire_id, open_to_network")
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

  const club = clubQ.data;
  const members = membersQ.data ?? [];

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
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <MemberRowUI
                  key={m.id}
                  member={m}
                  clubId={club.id}
                  isGest={m.id === club.gestionnaire_id}
                />
              ))}
              {members.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
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

function MemberRowUI({
  member,
  clubId,
  isGest,
}: {
  member: MemberRow;
  clubId: string;
  isGest: boolean;
}) {
  const qc = useQueryClient();
  const resend = useServerFn(resendInvite);
  const remove = useServerFn(removeMemberFromClub);
  const [busy, setBusy] = useState(false);

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
    city: CITIES[0],
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));
  const invite = useServerFn(inviteMember);

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
                city: CITIES[0],
                email: "",
                phone: "",
              });
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
          <Select value={form.city} onValueChange={set("city")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CITIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
