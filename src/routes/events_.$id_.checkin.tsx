import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { getCheckinData, rotateCheckinToken, setCheckin } from "@/lib/club-events.functions";
import { useSession } from "@/lib/use-session";
import { ArrowLeft, RefreshCw, Users, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/events_/$id_/checkin")({
  component: CheckinPage,
  head: () => ({ meta: [{ title: "Check-in — évènement" }] }),
});

function CheckinPage() {
  const { id } = Route.useParams();
  const { session } = useSession();
  const userId = session?.user?.id;
  const qc = useQueryClient();

  const dataFn = useServerFn(getCheckinData);
  const q = useQuery({
    queryKey: ["club-event-checkin", id],
    enabled: !!userId,
    queryFn: () => dataFn({ data: { eventId: id } }),
    // Compteur temps réel : rafraîchissement toutes les 5 s.
    refetchInterval: 5000,
  });

  const rotateFn = useServerFn(rotateCheckinToken);
  const rotate = useMutation({
    mutationFn: () => rotateFn({ data: { eventId: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["club-event-checkin", id] }),
  });

  const setFn = useServerFn(setCheckin);
  const toggle = useMutation({
    mutationFn: (vars: { registrationId: string; present: boolean }) => setFn({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["club-event-checkin", id] }),
  });

  const [origin, setOrigin] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  if (!userId)
    return (
      <div className="p-8">
        <Link to="/login" className="underline">
          Connecte-toi
        </Link>{" "}
        pour accéder au check-in.
      </div>
    );
  if (q.isLoading) return <div className="p-8 text-muted-foreground">Chargement…</div>;
  if (q.isError || !q.data)
    return <div className="p-8">Accès refusé ou évènement introuvable.</div>;

  const { event, token, registrations, registeredCount, checkedInCount } = q.data;
  const checkinUrl = token && origin ? `${origin}/events/${id}?checkin=${token}` : "";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <Link
          to="/events/$id"
          params={{ id }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à l'évènement
        </Link>

        <div>
          <h1 className="text-2xl font-bold">Check-in · {event.title}</h1>
          <p className="text-sm text-muted-foreground">
            Les participants scannent le QR pour pointer leur présence.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* QR géant */}
          <div className="border rounded-xl p-6 bg-card flex flex-col items-center justify-center gap-4">
            {checkinUrl ? (
              <>
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG value={checkinUrl} size={320} includeMargin level="M" />
                </div>
                <p className="text-xs text-muted-foreground break-all text-center max-w-xs">
                  {checkinUrl}
                </p>
                <button
                  onClick={() => {
                    if (confirm("Régénérer le QR ? L'ancien ne fonctionnera plus."))
                      rotate.mutate();
                  }}
                  disabled={rotate.isPending}
                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border hover:bg-secondary"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Régénérer le QR
                </button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Token indisponible.</p>
            )}
          </div>

          {/* Compteur + pointage manuel */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="border rounded-xl p-4 bg-card text-center">
                <div className="text-3xl font-bold text-accent">{checkedInCount}</div>
                <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> présents
                </div>
              </div>
              <div className="border rounded-xl p-4 bg-card text-center">
                <div className="text-3xl font-bold">{registeredCount}</div>
                <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> inscrits
                </div>
              </div>
            </div>

            <div className="border rounded-xl bg-card divide-y max-h-[420px] overflow-y-auto">
              {registrations.filter((r) => r.status !== "cancelled").length === 0 && (
                <div className="p-4 text-sm text-muted-foreground">Aucun inscrit.</div>
              )}
              {registrations
                .filter((r) => r.status !== "cancelled")
                .map((r) => {
                  const present = r.checked_in_at != null;
                  return (
                    <div key={r.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                      <div className="min-w-0">
                        <div className="truncate">
                          {r.member_id ? "Membre" : r.guest_name}
                          {!r.member_id && <span className="text-muted-foreground"> · invité</span>}
                        </div>
                        {r.status === "waitlist" && (
                          <div className="text-xs text-muted-foreground">Liste d'attente</div>
                        )}
                      </div>
                      <button
                        onClick={() => toggle.mutate({ registrationId: r.id, present: !present })}
                        className={`text-xs px-3 py-1.5 rounded-md border ${
                          present
                            ? "bg-accent/10 border-accent/40 text-accent font-semibold"
                            : "hover:bg-secondary"
                        }`}
                      >
                        {present ? "Présent ✓" : "Pointer"}
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
