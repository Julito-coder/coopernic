import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  useAuth,
  allMembers,
  createClub,
  deleteClub,
  setGestionnaire,
  membersOfClub,
} from "@/lib/auth-store";
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
import { Trash2, Users, Plus, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Super Admin — Coopernic" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { session, clubs } = useAuth();
  const members = allMembers();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");

  if (session.role !== "superadmin") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl font-bold">Accès réservé</h1>
        <p className="mt-2 text-muted-foreground">
          Cet espace est réservé au super administrateur. Change de rôle dans l'en-tête.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-10">
      <header>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Super Admin
        </div>
        <h1 className="mt-1 font-display text-3xl font-bold text-foreground">
          Plateforme Coopernic
        </h1>
        <p className="mt-1 text-muted-foreground">
          Pilote tous les clubs, leurs gestionnaires et leurs membres.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Clubs actifs" value={clubs.length} />
        <Kpi label="Membres totaux" value={members.length} />
        <Kpi
          label="Clubs sans gestionnaire"
          value={clubs.filter((c) => !c.gestionnaireId).length}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">Créer un club</CardTitle>
          <CardDescription>
            Crée un club business puis assigne-lui un gestionnaire.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              createClub({ name: name.trim(), city: city.trim() || "—" });
              setName("");
              setCity("");
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
            <Button type="submit" className="gap-2">
              <Plus className="h-4 w-4" /> Créer le club
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Tous les clubs</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {clubs.map((club) => {
            const m = membersOfClub(club.name);
            const gest = members.find((x) => x.id === club.gestionnaireId);
            return (
              <Card key={club.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="font-display">{club.name}</CardTitle>
                    <CardDescription>
                      {club.city} · {m.length} membre{m.length > 1 ? "s" : ""}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Supprimer ${club.name} ?`)) deleteClub(club.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="mb-1 text-xs font-medium text-muted-foreground">
                      Gestionnaire
                    </div>
                    <Select
                      value={club.gestionnaireId ?? "none"}
                      onValueChange={(v) =>
                        setGestionnaire(club.id, v === "none" ? null : v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Aucun" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Aucun —</SelectItem>
                        {m.map((mem) => (
                          <SelectItem key={mem.id} value={mem.id}>
                            {mem.firstName} {mem.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {gest && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {gest.role} · {gest.company}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between border-t border-border/60 pt-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {m.length} membres
                    </div>
                    <Link
                      to="/club"
                      search={{ id: club.id }}
                      className="text-sm font-semibold text-accent hover:underline"
                    >
                      Gérer →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
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
