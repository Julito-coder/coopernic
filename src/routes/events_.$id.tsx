import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  getClubEvent,
  registerForEvent,
  unregisterFromEvent,
  updateClubEvent,
  deleteClubEvent,
  addGuest,
  removeRegistration,
  selfCheckin,
} from "@/lib/club-events.functions";
import { useSession } from "@/lib/use-session";
import {
  CalendarDays,
  MapPin,
  Video,
  Users,
  ArrowLeft,
  Trash2,
  QrCode,
  CheckCircle2,
  UserPlus,
} from "lucide-react";

type Registration = {
  id: string;
  event_id: string;
  member_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  status: string;
  checked_in_at: string | null;
  registered_at: string;
};

export const Route = createFileRoute("/events_/$id")({
  component: EventDetailPage,
  validateSearch: (search: Record<string, unknown>): { checkin?: string } => ({
    checkin: typeof search.checkin === "string" ? search.checkin : undefined,
  }),
  head: () => ({ meta: [{ title: "Évènement" }] }),
});

function fmtDate(d: string) {
  return new Date(d).toLocaleString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const FORMAT_LABEL: Record<string, string> = {
  in_person: "Présentiel",
  online: "En ligne",
  hybrid: "Hybride",
};

function EventDetailPage() {
  const { id } = Route.useParams();
  const { checkin } = Route.useSearch();
  const { session } = useSession();
  const userId = session?.user?.id;
  const qc = useQueryClient();

  const getFn = useServerFn(getClubEvent);
  const q = useQuery({
    queryKey: ["club-event", id],
    enabled: !!userId,
    queryFn: () => getFn({ data: { eventId: id } }),
  });

  // Self check-in via QR (URL ?checkin=TOKEN) — tenté une seule fois.
  const selfFn = useServerFn(selfCheckin);
  const [checkinMsg, setCheckinMsg] = useState<string | null>(null);
  const tried = useRef(false);
  useEffect(() => {
    if (!checkin || !userId || tried.current) return;
    tried.current = true;
    selfFn({ data: { eventId: id, token: checkin } })
      .then((res) => {
        if (res?.ok) {
          setCheckinMsg(res.already ? "Présence déjà enregistrée ✓" : "Présence enregistrée ✓");
          qc.invalidateQueries({ queryKey: ["club-event", id] });
        } else {
          const map: Record<string, string> = {
            invalid_token: "QR code invalide.",
            outside_window: "Check-in fermé (hors de la fenêtre horaire).",
            event_not_available: "Évènement indisponible.",
            not_registered: "Tu n'es pas inscrit à cet évènement.",
            not_authenticated: "Connecte-toi pour pointer ta présence.",
          };
          setCheckinMsg(map[res?.error ?? ""] ?? "Échec du check-in.");
        }
      })
      .catch((e: unknown) => setCheckinMsg(e instanceof Error ? e.message : "Échec du check-in."));
  }, [checkin, userId, id, selfFn, qc]);

  if (!userId)
    return (
      <div className="p-8">
        <Link to="/login" className="underline">
          Connecte-toi
        </Link>{" "}
        pour voir cet évènement.
      </div>
    );
  if (q.isLoading) return <div className="p-8 text-muted-foreground">Chargement…</div>;
  if (q.isError || !q.data) return <div className="p-8">Évènement introuvable.</div>;

  const { event, counts, myRegistration, isManager, registrations } = q.data;
  const full = event.capacity != null && counts.registeredCount >= event.capacity;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <Link
          to="/events"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Agenda
        </Link>

        {checkinMsg && (
          <div className="rounded-md border border-accent/40 bg-accent/10 px-4 py-3 text-sm font-semibold inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-accent" /> {checkinMsg}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-3xl font-bold">{event.title}</h1>
            {event.status === "cancelled" && (
              <span className="text-xs rounded px-2 py-0.5 bg-destructive/10 text-destructive font-semibold">
                Annulé
              </span>
            )}
            {event.status === "draft" && (
              <span className="text-xs rounded px-2 py-0.5 bg-secondary text-muted-foreground font-semibold">
                Brouillon
              </span>
            )}
          </div>
          {event.event_type && (
            <p className="text-sm text-accent font-medium">{event.event_type}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-4 w-4" /> {fmtDate(event.starts_at)}
              {event.ends_at ? ` → ${fmtDate(event.ends_at)}` : ""}
            </span>
            <span className="inline-flex items-center gap-1">
              {event.format === "in_person" ? (
                <MapPin className="h-4 w-4" />
              ) : (
                <Video className="h-4 w-4" />
              )}
              {FORMAT_LABEL[event.format] ?? event.format}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-4 w-4" /> {counts.registeredCount}
              {event.capacity != null ? `/${event.capacity}` : ""} inscrit
              {counts.registeredCount > 1 ? "s" : ""}
              {counts.waitlistCount > 0 ? ` · ${counts.waitlistCount} en attente` : ""}
            </span>
          </div>
        </div>

        {(event.location_name || event.location_address || event.online_url) && (
          <div className="rounded-md bg-secondary/40 p-4 text-sm space-y-1">
            {event.location_name && <div className="font-medium">{event.location_name}</div>}
            {event.location_address && (
              <a
                href={`https://www.google.com/maps?q=${encodeURIComponent(event.location_address)}`}
                target="_blank"
                rel="noreferrer"
                className="text-accent underline text-xs"
              >
                {event.location_address}
              </a>
            )}
            {event.online_url && (
              <a
                href={event.online_url}
                target="_blank"
                rel="noreferrer"
                className="text-accent underline break-all"
              >
                {event.online_url}
              </a>
            )}
          </div>
        )}

        {event.description && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{event.description}</p>
        )}

        {event.status === "published" && (
          <RegistrationActions
            eventId={event.id}
            myStatus={myRegistration?.status ?? null}
            full={full}
            onChange={() => qc.invalidateQueries({ queryKey: ["club-event", id] })}
          />
        )}

        {isManager && (
          <ManagerPanel
            eventId={event.id}
            status={event.status}
            registrations={registrations}
            onChange={() => qc.invalidateQueries({ queryKey: ["club-event", id] })}
          />
        )}
      </div>
    </div>
  );
}

function RegistrationActions({
  eventId,
  myStatus,
  full,
  onChange,
}: {
  eventId: string;
  myStatus: string | null;
  full: boolean;
  onChange: () => void;
}) {
  const registerFn = useServerFn(registerForEvent);
  const unregisterFn = useServerFn(unregisterFromEvent);
  const [err, setErr] = useState<string | null>(null);

  const register = useMutation({
    mutationFn: () => registerFn({ data: { eventId } }),
    onSuccess: onChange,
    onError: (e: Error) => setErr(e.message ?? "Erreur"),
  });
  const unregister = useMutation({
    mutationFn: () => unregisterFn({ data: { eventId } }),
    onSuccess: onChange,
    onError: (e: Error) => setErr(e.message ?? "Erreur"),
  });

  return (
    <div className="border-t pt-4 space-y-2">
      {myStatus === "registered" || myStatus === "waitlist" ? (
        <div className="flex items-center gap-3">
          <span
            className={`text-sm font-semibold ${
              myStatus === "registered" ? "text-accent" : "text-muted-foreground"
            }`}
          >
            {myStatus === "registered" ? "✓ Tu es inscrit" : "Tu es en liste d'attente"}
          </span>
          <button
            onClick={() => {
              setErr(null);
              unregister.mutate();
            }}
            disabled={unregister.isPending}
            className="text-sm px-3 py-1.5 rounded-md border hover:bg-secondary"
          >
            Se désinscrire
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            setErr(null);
            register.mutate();
          }}
          disabled={register.isPending}
          className="text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
        >
          {full ? "Rejoindre la liste d'attente" : "S'inscrire"}
        </button>
      )}
      {err && <div className="text-xs text-destructive">{err}</div>}
    </div>
  );
}

function ManagerPanel({
  eventId,
  status,
  registrations,
  onChange,
}: {
  eventId: string;
  status: string;
  registrations: Registration[];
  onChange: () => void;
}) {
  const updateFn = useServerFn(updateClubEvent);
  const deleteFn = useServerFn(deleteClubEvent);
  const addGuestFn = useServerFn(addGuest);
  const removeFn = useServerFn(removeRegistration);

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const setStatus = useMutation({
    mutationFn: (s: "draft" | "published" | "cancelled") =>
      updateFn({ data: { eventId, status: s } }),
    onSuccess: onChange,
    onError: (e: Error) => setErr(e.message ?? "Erreur"),
  });
  const removeEvent = useMutation({
    mutationFn: () => deleteFn({ data: { eventId } }),
    onError: (e: Error) => setErr(e.message ?? "Erreur"),
  });
  const guest = useMutation({
    mutationFn: () => addGuestFn({ data: { eventId, guestName, guestEmail: guestEmail || null } }),
    onSuccess: () => {
      setGuestName("");
      setGuestEmail("");
      onChange();
    },
    onError: (e: Error) => setErr(e.message ?? "Erreur"),
  });
  const removeReg = useMutation({
    mutationFn: (registrationId: string) => removeFn({ data: { registrationId } }),
    onSuccess: onChange,
    onError: (e: Error) => setErr(e.message ?? "Erreur"),
  });

  return (
    <div className="border-t pt-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Gestion</h2>
        <div className="flex items-center gap-2">
          <Link
            to="/events/$id/checkin"
            params={{ id: eventId }}
            className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-semibold"
          >
            <QrCode className="h-4 w-4" /> Mode check-in
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {status !== "published" && (
          <button
            onClick={() => setStatus.mutate("published")}
            className="px-3 py-1.5 rounded-md border hover:bg-secondary"
          >
            Publier
          </button>
        )}
        {status === "published" && (
          <button
            onClick={() => setStatus.mutate("cancelled")}
            className="px-3 py-1.5 rounded-md border hover:bg-secondary"
          >
            Annuler l'évènement
          </button>
        )}
        {status === "cancelled" && (
          <button
            onClick={() => setStatus.mutate("published")}
            className="px-3 py-1.5 rounded-md border hover:bg-secondary"
          >
            Republier
          </button>
        )}
        <button
          onClick={() => {
            if (confirm("Supprimer définitivement cet évènement ?")) removeEvent.mutate();
          }}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" /> Supprimer
        </button>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-semibold">Inscrits ({registrations.length})</div>
        <div className="divide-y rounded-md border">
          {registrations.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground">Aucune inscription.</div>
          )}
          {registrations.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div className="min-w-0">
                <div className="truncate">
                  {r.member_id ? (
                    <span>Membre</span>
                  ) : (
                    <span>
                      {r.guest_name} <span className="text-muted-foreground">· invité</span>
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.status === "waitlist"
                    ? "Liste d'attente"
                    : r.status === "cancelled"
                      ? "Annulé"
                      : "Inscrit"}
                  {r.checked_in_at ? " · présent ✓" : ""}
                </div>
              </div>
              <button
                onClick={() => removeReg.mutate(r.id)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Retirer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-semibold inline-flex items-center gap-1">
          <UserPlus className="h-4 w-4" /> Ajouter un invité externe
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setErr(null);
            if (guestName.trim()) guest.mutate();
          }}
          className="flex flex-wrap gap-2"
        >
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Nom de l'invité"
            className="flex-1 min-w-[160px] border rounded-md px-3 py-2 text-sm bg-background"
            required
          />
          <input
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder="Email (optionnel)"
            type="email"
            className="flex-1 min-w-[160px] border rounded-md px-3 py-2 text-sm bg-background"
          />
          <button
            type="submit"
            disabled={guest.isPending}
            className="px-4 py-2 rounded-md bg-secondary text-sm font-semibold"
          >
            Ajouter
          </button>
        </form>
      </div>

      {err && <div className="text-xs text-destructive">{err}</div>}
    </div>
  );
}
