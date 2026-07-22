import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listPots, joinPot, getPotDetail } from "@/lib/pots.functions";
import { useSession } from "@/lib/use-session";
import { PotEmbeddedCheckout } from "@/components/PotEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/cagnottes")({
  component: CagnottesPage,
  head: () => ({ meta: [{ title: "Paiements du club" }] }),
});

function euros(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function CagnottesPage() {
  const { session } = useSession();
  const userId = session?.user?.id;
  const qc = useQueryClient();
  const fetchList = useServerFn(listPots);
  const joinFn = useServerFn(joinPot);
  const [openPotId, setOpenPotId] = useState<string | null>(null);

  const clubQuery = useQuery({
    queryKey: ["my-club", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("members")
        .select("club_id")
        .eq("id", userId!)
        .maybeSingle();
      return data?.club_id ?? null;
    },
  });

  const potsQuery = useQuery({
    queryKey: ["pots", clubQuery.data],
    enabled: !!clubQuery.data,
    queryFn: () => fetchList({ data: { clubId: clubQuery.data! } }),
  });

  const join = useMutation({
    mutationFn: (potId: string) => joinFn({ data: { potId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pots"] }),
  });

  if (!userId)
    return (
      <div className="p-8">
        <Link to="/auth" className="underline">
          Connecte-toi
        </Link>{" "}
        pour voir les cagnottes.
      </div>
    );

  if (!clubQuery.data && !clubQuery.isLoading)
    return <div className="p-8">Tu n'es rattaché à aucun club pour le moment.</div>;

  const pots = potsQuery.data?.pots ?? [];
  const stats = potsQuery.data?.stats ?? {};

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold">Paiements du club</h1>

        {pots.length === 0 && (
          <p className="text-muted-foreground">Aucun paiement en cours.</p>
        )}

        <div className="space-y-4">
          {pots.map((p) => {
            const s = stats[p.id] ?? { participants: 0, collected: 0, payers: 0 };
            const share = s.participants > 0 ? Math.ceil(p.goal_cents / s.participants) : p.goal_cents;
            return (
              <PotCard
                key={p.id}
                pot={p}
                stats={s}
                share={share}
                userId={userId}
                onJoin={() => join.mutate(p.id)}
                onPay={() => setOpenPotId(p.id)}
              />
            );
          })}
        </div>

        {openPotId && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="font-semibold">Payer ma part</h2>
                <button onClick={() => setOpenPotId(null)} className="text-sm underline">
                  Fermer
                </button>
              </div>
              <PotEmbeddedCheckout
                potId={openPotId}
                returnUrl={`${window.location.origin}/cagnottes/return?session_id={CHECKOUT_SESSION_ID}&pot_id=${openPotId}`}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PotCard({
  pot,
  stats,
  share,
  userId,
  onJoin,
  onPay,
}: {
  pot: any;
  stats: { participants: number; collected: number; payers: number };
  share: number;
  userId: string;
  onJoin: () => void;
  onPay: () => void;
}) {
  const detailFn = useServerFn(getPotDetail);
  const detail = useQuery({
    queryKey: ["pot-detail", pot.id, userId],
    queryFn: () => detailFn({ data: { potId: pot.id } }),
  });
  const isParticipant = detail.data?.isParticipant ?? false;
  const hasPaid = detail.data?.hasPaid ?? false;
  const pct = Math.min(100, Math.round((stats.collected / pot.goal_cents) * 100));

  return (
    <div className="border rounded-lg p-5 bg-card">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="font-semibold text-lg">{pot.title}</h3>
          {pot.description && (
            <p className="text-sm text-muted-foreground mt-1">{pot.description}</p>
          )}
        </div>
        <span className="text-xs px-2 py-1 rounded bg-muted">{pot.status}</span>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>
            {euros(stats.collected)} / {euros(pot.goal_cents)}
          </span>
          <span className="text-muted-foreground">
            {stats.payers}/{stats.participants} payés
          </span>
        </div>
        <div className="h-2 bg-muted rounded overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="text-sm">
          <span className="text-muted-foreground">Ta part : </span>
          <span className="font-semibold">{euros(share)}</span>
        </div>
        <div className="flex gap-2">
          {pot.status === "open" && !isParticipant && (
            <button
              onClick={onJoin}
              className="px-3 py-1.5 text-sm rounded bg-secondary hover:bg-secondary/80"
            >
              Je participe
            </button>
          )}
          {pot.status === "open" && isParticipant && !hasPaid && (
            <button
              onClick={onPay}
              className="px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Payer ma part
            </button>
          )}
          {hasPaid && (
            <span className="text-sm text-green-600 font-medium">✓ Payé</span>
          )}
        </div>
      </div>
    </div>
  );
}
