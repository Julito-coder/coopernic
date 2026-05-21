import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listPots,
  createPot,
  setPotStatus,
  deletePot,
} from "@/lib/pots.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, PiggyBank, Trash2, Lock, Unlock, Users, Euro } from "lucide-react";

const fmt = (cents: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);

export function ClubPotsSection({ clubId }: { clubId: string }) {
  const queryClient = useQueryClient();
  const list = useServerFn(listPots);
  const create = useServerFn(createPot);
  const setStatus = useServerFn(setPotStatus);
  const remove = useServerFn(deletePot);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clubId);

  const { data, isLoading } = useQuery({
    queryKey: ["pots", clubId],
    queryFn: () => list({ data: { clubId } }),
    enabled: isUuid,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["pots", clubId] });

  const createMut = useMutation({
    mutationFn: (input: { title: string; description?: string; goalEuros: number; deadline?: string }) =>
      create({ data: { clubId, ...input } }),
    onSuccess: invalidate,
  });
  const statusMut = useMutation({
    mutationFn: (input: { potId: string; status: "open" | "closed" | "cancelled" }) =>
      setStatus({ data: input }),
    onSuccess: invalidate,
  });
  const deleteMut = useMutation({
    mutationFn: (potId: string) => remove({ data: { potId } }),
    onSuccess: invalidate,
  });

  if (!isUuid) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-accent" /> Cagnottes
          </CardTitle>
          <CardDescription>
            Cette fonctionnalité nécessite la migration du club vers la base de données réelle.
            Connecte-toi avec ton compte Coopernic pour accéder aux cagnottes.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-accent" /> Cagnottes du club
          </h2>
          <p className="text-sm text-muted-foreground">
            Finance les évènements et dépenses collectives. Division dynamique : la part
            est recalculée en fonction du nombre de participants.
          </p>
        </div>
        <CreatePotDialog onCreate={(v) => createMut.mutate(v)} pending={createMut.isPending} />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {data && data.pots.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground">
            Aucune cagnotte. Crée la première pour financer un évènement.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {data?.pots.map((p) => {
          const s = data.stats[p.id] ?? { participants: 0, collected: 0, payers: 0 };
          const share = s.participants > 0 ? Math.ceil(p.goal_cents / s.participants) : 0;
          const pct = Math.min(100, Math.round((s.collected / p.goal_cents) * 100));
          return (
            <Card key={p.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="font-display text-lg">{p.title}</CardTitle>
                    <CardDescription className="mt-1">
                      Objectif {fmt(p.goal_cents)}
                      {p.deadline && ` · clôture le ${new Date(p.deadline).toLocaleDateString("fr-FR")}`}
                    </CardDescription>
                  </div>
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase " +
                      (p.status === "open"
                        ? "bg-accent/15 text-accent"
                        : "bg-muted text-muted-foreground")
                    }
                  >
                    {p.status === "open" ? "Ouverte" : p.status === "closed" ? "Clôturée" : "Annulée"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {p.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                )}

                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <Stat icon={<Euro className="h-3.5 w-3.5" />} label="Collecté" value={fmt(s.collected)} />
                  <Stat icon={<Users className="h-3.5 w-3.5" />} label="Participants" value={String(s.participants)} />
                  <Stat icon={<PiggyBank className="h-3.5 w-3.5" />} label="Part actuelle" value={share ? fmt(share) : "—"} />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {p.status === "open" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => statusMut.mutate({ potId: p.id, status: "closed" })}
                      className="gap-1"
                    >
                      <Lock className="h-3.5 w-3.5" /> Clôturer
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => statusMut.mutate({ potId: p.id, status: "open" })}
                      className="gap-1"
                    >
                      <Unlock className="h-3.5 w-3.5" /> Rouvrir
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Supprimer la cagnotte « ${p.title} » ? Les paiements déjà reçus seront perdus.`))
                        deleteMut.mutate(p.id);
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/30 px-2 py-1.5">
      <div className="flex items-center gap-1 text-muted-foreground">{icon}<span>{label}</span></div>
      <div className="mt-0.5 font-semibold text-foreground">{value}</div>
    </div>
  );
}

function CreatePotDialog({
  onCreate,
  pending,
}: {
  onCreate: (v: { title: string; description?: string; goalEuros: number; deadline?: string }) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Nouvelle cagnotte</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Créer une cagnotte</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const goalEuros = parseFloat(goal);
            if (!title.trim() || !goalEuros || goalEuros <= 0) return;
            onCreate({
              title: title.trim(),
              description: description.trim() || undefined,
              goalEuros,
              deadline: deadline ? new Date(deadline).toISOString() : undefined,
            });
            setTitle(""); setDescription(""); setGoal(""); setDeadline("");
            setOpen(false);
          }}
        >
          <Input placeholder="Titre (ex: Soirée annuelle)" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea placeholder="Description (optionnelle)" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Objectif (€)" type="number" min="1" step="0.01" value={goal} onChange={(e) => setGoal(e.target.value)} required />
            <Input placeholder="Date de clôture" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Création…" : "Créer la cagnotte"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
