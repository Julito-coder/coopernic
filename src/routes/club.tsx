import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { inviteMember } from "@/lib/members.functions";
import {
  useAuth,
  getClub,
  membersOfClub,
  addMember,
  removeMember,
  setGestionnaire,
  setClubOpenToNetwork,
} from "@/lib/auth-store";

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
import { Trash2, UserPlus, Crown, ShieldCheck, Globe2 } from "lucide-react";
import { ClubPotsSection } from "@/components/ClubPotsSection";

type Search = { id?: string };

export const Route = createFileRoute("/club")({
  head: () => ({ meta: [{ title: "Gestion du club — Coopernic" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    id: typeof s.id === "string" ? s.id : undefined,
  }),
  component: ClubPage,
});

function ClubPage() {
  const { session } = useAuth();
  const search = Route.useSearch();
  const clubId = search.id ?? session.clubId ?? "";
  const club = getClub(clubId);

  if (session.role === "membre") {
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

  if (!club) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Aucun club sélectionné</h1>
        <p className="mt-2 text-muted-foreground">
          {session.role === "superadmin" ? (
            <>Va dans <Link to="/admin" className="text-accent underline">Super Admin</Link> pour en choisir un.</>
          ) : (
            "Aucun club n'est rattaché à ton compte."
          )}
        </p>
      </div>
    );
  }

  const members = membersOfClub(club.name);
  const gest = members.find((m) => m.id === club.gestionnaireId);
  const canEditGestionnaire = session.role === "superadmin";

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
          {gest && <> · Gestionnaire : {gest.firstName} {gest.lastName}</>}
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Globe2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="font-display">Annuaire Coopernic inter-clubs</CardTitle>
              <CardDescription className="mt-1 max-w-xl">
                Active pour rendre ton club visible dans l'annuaire global. Les membres
                d'autres clubs pourront trouver et contacter les tiens — et inversement.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <span className={"text-xs font-bold uppercase tracking-wider " + (club.openToNetwork ? "text-accent" : "text-muted-foreground")}>
              {club.openToNetwork ? "Ouvert" : "Privé"}
            </span>
            <Switch
              checked={club.openToNetwork}
              onCheckedChange={(v) => setClubOpenToNetwork(club.id, v)}
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
                <th className="px-4 py-3 text-left font-semibold">Secteur</th>
                <th className="px-4 py-3 text-left font-semibold">Ville</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const isGest = m.id === club.gestionnaireId;
                return (
                  <tr key={m.id} className="border-t border-border/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-medium">
                        {m.firstName} {m.lastName}
                        {isGest && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-accent">
                            <Crown className="h-3 w-3" /> Gestionnaire
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{m.role}</div>
                    </td>
                    <td className="px-4 py-3">{m.company}</td>
                    <td className="px-4 py-3">{m.sector}</td>
                    <td className="px-4 py-3">{m.city}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEditGestionnaire && !isGest && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setGestionnaire(club.id, m.id)}
                            title="Définir comme gestionnaire"
                          >
                            <Crown className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`Retirer ${m.firstName} du club ?`))
                              removeMember(m.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {members.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Aucun membre. Ajoute le premier ci-dessus.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function AddMemberForm({ clubId, clubName }: { clubId: string; clubName: string }) {
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
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const invite = useServerFn(inviteMember);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Ajouter un membre</CardTitle>
        <CardDescription>
          Un email d'invitation sera envoyé pour créer le compte.
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
              addMember({ ...form, clubName });
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
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Échec de l'invitation");
            } finally {
              setLoading(false);
            }
          }}
        >

          <Input placeholder="Prénom" value={form.firstName} onChange={(e) => set("firstName")(e.target.value)} />
          <Input placeholder="Nom" value={form.lastName} onChange={(e) => set("lastName")(e.target.value)} />
          <Input placeholder="Fonction" value={form.role} onChange={(e) => set("role")(e.target.value)} />
          <Input placeholder="Société" value={form.company} onChange={(e) => set("company")(e.target.value)} />
          <Select value={form.sector} onValueChange={set("sector")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SECTORS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={form.city} onValueChange={set("city")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Email" type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} />
          <Input placeholder="Téléphone" value={form.phone} onChange={(e) => set("phone")(e.target.value)} />
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" className="gap-2">
              <UserPlus className="h-4 w-4" /> Ajouter au club
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
