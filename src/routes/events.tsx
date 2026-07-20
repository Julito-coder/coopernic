import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  getEventsContext,
  listClubEvents,
  createClubEvent,
  registerForEvent,
  unregisterFromEvent,
} from "@/lib/club-events.functions";
import { useSession } from "@/lib/use-session";
import type { Database } from "@/integrations/supabase/types";
import { CalendarDays, MapPin, Plus, Users, Video, Repeat, ChevronRight } from "lucide-react";

type ClubEvent = Database["public"]["Tables"]["club_events"]["Row"];

export const Route = createFileRoute("/events")({
  component: EventsListPage,
  head: () => ({ meta: [{ title: "Agenda du club" }] }),
});

function fmtDate(d: string) {
  return new Date(d).toLocaleString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const FORMAT_LABEL: Record<string, string> = {
  in_person: "Présentiel",
  online: "En ligne",
  hybrid: "Hybride",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  published: "Publié",
  cancelled: "Annulé",
};

function EventsListPage() {
  const { session } = useSession();
  const userId = session?.user?.id;
  const qc = useQueryClient();
  const ctxFn = useServerFn(getEventsContext);
  const listFn = useServerFn(listClubEvents);

  const ctx = useQuery({
    queryKey: ["club-events-ctx", userId],
    enabled: !!userId,
    queryFn: () => ctxFn(),
  });
  const clubId = ctx.data?.clubId ?? null;
  const isManager = ctx.data?.isManager ?? false;

  const events = useQuery({
    queryKey: ["club-events", clubId],
    enabled: !!clubId,
    queryFn: () => listFn({ data: { clubId: clubId! } }),
  });

  const [showCreate, setShowCreate] = useState(false);

  if (!userId)
    return (
      <div className="p-8">
        <Link to="/login" className="underline">
          Connecte-toi
        </Link>{" "}
        pour voir l'agenda.
      </div>
    );

  if (ctx.isLoading) return <div className="p-8 text-muted-foreground">Chargement…</div>;
  if (!clubId) return <div className="p-8">Tu n'es rattaché à aucun club pour le moment.</div>;

  const list = events.data?.events ?? [];
  const tallies = events.data?.tallies ?? {};

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Agenda</h1>
            <p className="text-sm text-muted-foreground">
              Évènements du club, inscriptions & check-in.
            </p>
          </div>
          {isManager && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Nouvel évènement
            </button>
          )}
        </div>

        {list.length === 0 && (
          <p className="text-muted-foreground">Aucun évènement pour ce club.</p>
        )}

        <div className="space-y-4">
          {list.map((e) => (
            <EventRow
              key={e.id}
              event={e}
              tally={
                tallies[e.id] ?? {
                  registeredCount: 0,
                  waitlistCount: 0,
                  checkedInCount: 0,
                  myStatus: null,
                }
              }
              isManager={isManager}
              onChange={() => qc.invalidateQueries({ queryKey: ["club-events"] })}
            />
          ))}
        </div>

        {showCreate && clubId && (
          <CreateEventDialog
            clubId={clubId}
            onClose={() => setShowCreate(false)}
            onCreated={() => {
              setShowCreate(false);
              qc.invalidateQueries({ queryKey: ["club-events"] });
            }}
          />
        )}
      </div>
    </div>
  );
}

function EventRow({
  event,
  tally,
  isManager,
  onChange,
}: {
  event: ClubEvent;
  tally: {
    registeredCount: number;
    waitlistCount: number;
    checkedInCount: number;
    myStatus: string | null;
  };
  isManager: boolean;
  onChange: () => void;
}) {
  const registerFn = useServerFn(registerForEvent);
  const unregisterFn = useServerFn(unregisterFromEvent);
  const [err, setErr] = useState<string | null>(null);

  const register = useMutation({
    mutationFn: () => registerFn({ data: { eventId: event.id } }),
    onSuccess: onChange,
    onError: (e: Error) => setErr(e.message ?? "Erreur"),
  });
  const unregister = useMutation({
    mutationFn: () => unregisterFn({ data: { eventId: event.id } }),
    onSuccess: onChange,
    onError: (e: Error) => setErr(e.message ?? "Erreur"),
  });

  const full = event.capacity != null && tally.registeredCount >= event.capacity;
  const myStatus = tally.myStatus;

  return (
    <div className="border rounded-lg p-5 bg-card space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-lg">{event.title}</h3>
            {event.status !== "published" && (
              <span className="text-[11px] rounded px-1.5 py-0.5 bg-secondary text-muted-foreground">
                {STATUS_LABEL[event.status] ?? event.status}
              </span>
            )}
            {event.recurrence_group_id && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Repeat className="h-3 w-3" /> Série
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> {fmtDate(event.starts_at)}
            </span>
            <span className="inline-flex items-center gap-1">
              {event.format === "in_person" ? (
                <MapPin className="h-3.5 w-3.5" />
              ) : (
                <Video className="h-3.5 w-3.5" />
              )}
              {FORMAT_LABEL[event.format] ?? event.format}
              {event.location_name ? ` · ${event.location_name}` : ""}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {tally.registeredCount}
              {event.capacity != null ? `/${event.capacity}` : ""} inscrit
              {tally.registeredCount > 1 ? "s" : ""}
              {tally.waitlistCount > 0 ? ` · ${tally.waitlistCount} en attente` : ""}
            </span>
          </div>
        </div>
        <Link
          to="/events/$id"
          params={{ id: event.id }}
          className="shrink-0 inline-flex items-center gap-1 text-sm text-accent hover:underline"
        >
          Détail <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {err && <div className="text-xs text-destructive">{err}</div>}

      {event.status === "published" && (
        <div className="flex items-center gap-2">
          {myStatus === "registered" || myStatus === "waitlist" ? (
            <>
              <span
                className={`text-xs font-semibold ${
                  myStatus === "registered" ? "text-accent" : "text-muted-foreground"
                }`}
              >
                {myStatus === "registered" ? "✓ Inscrit" : "En liste d'attente"}
              </span>
              <button
                onClick={() => {
                  setErr(null);
                  unregister.mutate();
                }}
                disabled={unregister.isPending}
                className="text-xs px-3 py-1.5 rounded-md border hover:bg-secondary"
              >
                Se désinscrire
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setErr(null);
                register.mutate();
              }}
              disabled={register.isPending}
              className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
            >
              {full ? "Rejoindre la liste d'attente" : "S'inscrire"}
            </button>
          )}
          {isManager && (
            <Link
              to="/events/$id/checkin"
              params={{ id: event.id }}
              className="text-xs px-3 py-1.5 rounded-md border hover:bg-secondary"
            >
              Mode check-in
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function CreateEventDialog({
  clubId,
  onClose,
  onCreated,
}: {
  clubId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const createFn = useServerFn(createClubEvent);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("");
  const [format, setFormat] = useState<"in_person" | "online" | "hybrid">("in_person");
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [onlineUrl, setOnlineUrl] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [capacity, setCapacity] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<"none" | "weekly" | "monthly">(
    "none",
  );
  const [recurrenceCount, setRecurrenceCount] = useState("4");
  const [err, setErr] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          clubId,
          title,
          description: description || null,
          eventType: eventType || null,
          format,
          locationName: locationName || null,
          locationAddress: locationAddress || null,
          onlineUrl: onlineUrl || null,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
          capacity: capacity ? Number(capacity) : null,
          status,
          recurrenceFrequency,
          recurrenceCount: recurrenceFrequency === "none" ? 1 : Number(recurrenceCount),
        },
      }),
    onSuccess: onCreated,
    onError: (e: Error) => setErr(e.message ?? "Erreur"),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="font-semibold">Nouvel évènement</h2>
          <button onClick={onClose} className="text-sm underline">
            Fermer
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setErr(null);
            submit.mutate();
          }}
          className="p-4 space-y-3 text-sm"
        >
          <Field label="Titre *">
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Type (afterwork, atelier, conférence…)">
            <input
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Description">
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Début *">
              <input
                type="datetime-local"
                required
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Fin">
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="input"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Format">
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as typeof format)}
                className="input"
              >
                <option value="in_person">Présentiel</option>
                <option value="online">En ligne</option>
                <option value="hybrid">Hybride</option>
              </select>
            </Field>
            <Field label="Capacité (vide = illimitée)">
              <input
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="input"
              />
            </Field>
          </div>
          {format !== "online" && (
            <>
              <Field label="Lieu (nom)">
                <input
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Adresse">
                <input
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  className="input"
                />
              </Field>
            </>
          )}
          {format !== "in_person" && (
            <Field label="Lien de connexion">
              <input
                value={onlineUrl}
                onChange={(e) => setOnlineUrl(e.target.value)}
                className="input"
                placeholder="https://meet…"
              />
            </Field>
          )}

          <div className="border-t pt-3 grid grid-cols-2 gap-3">
            <Field label="Récurrence">
              <select
                value={recurrenceFrequency}
                onChange={(e) =>
                  setRecurrenceFrequency(e.target.value as typeof recurrenceFrequency)
                }
                className="input"
              >
                <option value="none">Aucune</option>
                <option value="weekly">Hebdomadaire</option>
                <option value="monthly">Mensuelle</option>
              </select>
            </Field>
            {recurrenceFrequency !== "none" && (
              <Field label="Nombre d'occurrences (max 52)">
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={recurrenceCount}
                  onChange={(e) => setRecurrenceCount(e.target.value)}
                  className="input"
                />
              </Field>
            )}
          </div>

          <Field label="Statut">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="input"
            >
              <option value="published">Publier maintenant</option>
              <option value="draft">Enregistrer en brouillon</option>
            </select>
          </Field>

          {err && <div className="text-sm text-destructive">{err}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-md border">
              Annuler
            </button>
            <button
              type="submit"
              disabled={submit.isPending}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-semibold"
            >
              {submit.isPending ? "Création…" : "Créer"}
            </button>
          </div>
        </form>
      </div>
      <style>{`.input { width:100%; border:1px solid hsl(var(--border)); border-radius:6px; padding:8px 10px; background:hsl(var(--background)); font-size:14px; } .input:focus { outline:2px solid hsl(var(--ring)); }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}
