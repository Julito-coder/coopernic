import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  getMyEventsContext,
  listEvents,
  createEvent,
  deleteEvent,
  updateEvent,
  respondToPoll,
} from "@/lib/events.functions";
import { useSession } from "@/lib/use-session";
import { CalendarDays, MapPin, Trash2, Plus, Euro, Users, Info, Pencil, Repeat } from "lucide-react";

export const Route = createFileRoute("/evenements")({
  component: EventsPage,
  head: () => ({ meta: [{ title: "Évènements du club" }] }),
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
function euros(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function EventsPage() {
  const { session } = useSession();
  const userId = session?.user?.id;
  const qc = useQueryClient();
  const ctxFn = useServerFn(getMyEventsContext);
  const listFn = useServerFn(listEvents);

  const ctx = useQuery({
    queryKey: ["events-ctx", userId],
    enabled: !!userId,
    queryFn: () => ctxFn(),
  });
  const isManager = ctx.data?.isManager ?? false;
  const isSuperadmin = ctx.data?.isSuperadmin ?? false;
  const clubs = ctx.data?.clubs ?? [];
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const clubId = selectedClubId ?? ctx.data?.clubId ?? null;

  const events = useQuery({
    queryKey: ["events", clubId],
    enabled: !!clubId,
    queryFn: () => listFn({ data: { clubId: clubId! } }),
  });

  const [showCreate, setShowCreate] = useState(false);

  if (!userId)
    return (
      <div className="p-8">
        <Link to="/auth" className="underline">
          Connecte-toi
        </Link>{" "}
        pour voir les évènements.
      </div>
    );

  if (ctx.isLoading) return <div className="p-8 text-muted-foreground">Chargement…</div>;

  if (!clubId)
    return <div className="p-8">Tu n'es rattaché à aucun club pour le moment.</div>;

  const list = events.data?.events ?? [];
  const tallies = events.data?.tallies ?? {};

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Évènements</h1>
            <p className="text-sm text-muted-foreground">
              Sondages de présence, infos pratiques & paiements.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Nouvel évènement
          </button>
        </div>

        {isSuperadmin && clubs.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <label className="text-muted-foreground">Club :</label>
            <select
              value={clubId ?? ""}
              onChange={(e) => setSelectedClubId(e.target.value)}
              className="border rounded-md px-2 py-1 bg-background"
            >
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {list.length === 0 && (
          <p className="text-muted-foreground">Aucun évènement à venir pour ce club.</p>
        )}

        <div className="space-y-5">
          {list.map((e: any) => (
            <EventCard
              key={e.id}
              event={e}
              tally={tallies[e.id] ?? { counts: [], myChoice: null, total: 0 }}
              isManager={isManager}
              onDelete={() => qc.invalidateQueries({ queryKey: ["events"] })}
            />
          ))}
        </div>

        {showCreate && clubId && (
          <CreateEventDialog
            clubId={clubId}
            onClose={() => setShowCreate(false)}
            onCreated={() => {
              setShowCreate(false);
              qc.invalidateQueries({ queryKey: ["events"] });
            }}
          />
        )}
      </div>
    </div>
  );
}

function EventCard({
  event,
  tally,
  isManager,
  onDelete,
}: {
  event: any;
  tally: { counts: number[]; myChoice: number | null; total: number };
  isManager: boolean;
  onDelete: () => void;
}) {
  const respondFn = useServerFn(respondToPoll);
  const deleteFn = useServerFn(deleteEvent);
  const respond = useMutation({
    mutationFn: (optionIndex: number) => respondFn({ data: { eventId: event.id, optionIndex } }),
    onSuccess: onDelete,
  });
  const remove = useMutation({
    mutationFn: (scope: "one" | "series") => deleteFn({ data: { eventId: event.id, scope } }),
    onSuccess: onDelete,
  });
  const [editing, setEditing] = useState(false);
  const isRecurring = !!event.rrule || !!event.recurrence_parent_id;

  const options: string[] = Array.isArray(event.poll_options) ? event.poll_options : [];
  const showResults = event.poll_results_visible || isManager;
  const total = tally.total || 1;

  const mapsUrl =
    event.location_lat && event.location_lng
      ? `https://www.google.com/maps?q=${event.location_lat},${event.location_lng}`
      : event.location_address
        ? `https://www.google.com/maps?q=${encodeURIComponent(event.location_address)}`
        : null;

  return (
    <div className="border rounded-lg p-5 bg-card space-y-4">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="font-semibold text-lg">{event.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> {fmtDate(event.starts_at)}
              {event.ends_at && ` → ${fmtDate(event.ends_at)}`}
            </span>
            {event.location_name && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {event.location_name}
              </span>
            )}
            {event.is_paid && event.price_cents != null && (
              <span className="inline-flex items-center gap-1 text-accent font-semibold">
                <Euro className="h-3.5 w-3.5" /> {euros(event.price_cents)}
              </span>
            )}
            {event.attendance_required && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                Présence obligatoire
              </span>
            )}
          </div>
          {event.description && (
            <p className="text-sm mt-2 whitespace-pre-wrap">{event.description}</p>
          )}
        </div>
        {isManager && (
          <div className="flex items-center gap-1">
            {isRecurring && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent"
                title="Évènement récurrent"
              >
                <Repeat className="h-3 w-3" /> Série
              </span>
            )}
            <button
              onClick={() => setEditing(true)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Modifier"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                if (isRecurring) {
                  const choice = window.prompt(
                    "Supprimer : tape 'un' pour cette date, 'serie' pour toute la série.",
                    "un",
                  );
                  if (choice === "un") remove.mutate("one");
                  else if (choice === "serie") remove.mutate("series");
                } else if (confirm("Supprimer cet évènement ?")) {
                  remove.mutate("one");
                }
              }}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {(event.location_address || mapsUrl || event.practical_info) && (
        <div className="rounded-md bg-secondary/40 p-3 text-sm space-y-2">
          {event.location_address && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-accent" />
              <div>
                <div>{event.location_address}</div>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-accent underline"
                  >
                    Ouvrir dans Maps
                  </a>
                )}
              </div>
            </div>
          )}
          {event.practical_info && (
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-accent" />
              <div className="whitespace-pre-wrap">{event.practical_info}</div>
            </div>
          )}
        </div>
      )}

      {event.poll_question && options.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-semibold">{event.poll_question}</div>
          <div className="space-y-1.5">
            {options.map((opt, i) => {
              const count = tally.counts[i] ?? 0;
              const pct = showResults ? Math.round((count / total) * 100) : 0;
              const mine = tally.myChoice === i;
              return (
                <button
                  key={i}
                  onClick={() => respond.mutate(i)}
                  className={`w-full text-left rounded-md border px-3 py-2 text-sm relative overflow-hidden transition ${
                    mine
                      ? "border-accent bg-accent/10 font-semibold"
                      : "hover:bg-secondary/60"
                  }`}
                >
                  {showResults && (
                    <div
                      className="absolute inset-y-0 left-0 bg-primary/10"
                      style={{ width: `${pct}%` }}
                    />
                  )}
                  <div className="relative flex justify-between">
                    <span>{opt}</span>
                    {showResults && (
                      <span className="text-xs text-muted-foreground">
                        {count} · {pct}%
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Users className="h-3 w-3" /> {tally.total} réponse{tally.total > 1 ? "s" : ""}
            {!event.poll_results_visible && !isManager && " · résultats masqués"}
          </div>
        </div>
      )}

      {editing && (
        <EditEventDialog
          event={event}
          isRecurring={isRecurring}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onDelete();
          }}
        />
      )}
    </div>
  );
}

function EditEventDialog({
  event,
  isRecurring,
  onClose,
  onSaved,
}: {
  event: any;
  isRecurring: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const updateFn = useServerFn(updateEvent);
  const [title, setTitle] = useState<string>(event.title ?? "");
  const [description, setDescription] = useState<string>(event.description ?? "");
  const toLocal = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [startsAt, setStartsAt] = useState<string>(toLocal(event.starts_at));
  const [endsAt, setEndsAt] = useState<string>(toLocal(event.ends_at));
  const [locationName, setLocationName] = useState<string>(event.location_name ?? "");
  const [locationAddress, setLocationAddress] = useState<string>(event.location_address ?? "");
  const [practicalInfo, setPracticalInfo] = useState<string>(event.practical_info ?? "");
  const [isPaid, setIsPaid] = useState<boolean>(!!event.is_paid);
  const [priceEuros, setPriceEuros] = useState<string>(
    event.price_cents != null ? String(event.price_cents / 100) : "",
  );
  const [attendanceRequired, setAttendanceRequired] = useState<boolean>(!!event.attendance_required);
  const [applySeries, setApplySeries] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const patch: any = {
        title,
        description: description || null,
        locationName: locationName || null,
        locationAddress: locationAddress || null,
        practicalInfo: practicalInfo || null,
        isPaid,
        priceEuros: isPaid && priceEuros ? Number(priceEuros) : null,
        attendanceRequired,
      };
      if (!applySeries) {
        patch.startsAt = new Date(startsAt).toISOString();
        patch.endsAt = endsAt ? new Date(endsAt).toISOString() : null;
      }
      return updateFn({
        data: {
          eventId: event.id,
          scope: applySeries ? "series" : "one",
          patch,
        },
      });
    },
    onSuccess: onSaved,
    onError: (e: any) => setErr(e.message ?? "Erreur"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-lg">Modifier l'évènement</h3>
          <button onClick={onClose} className="text-muted-foreground text-xl leading-none">×</button>
        </div>
        {isRecurring && (
          <label className="flex items-center gap-2 rounded-md border bg-accent/5 p-2 text-sm">
            <input
              type="checkbox"
              checked={applySeries}
              onChange={(e) => setApplySeries(e.target.checked)}
            />
            <span>
              Appliquer à <strong>toute la série</strong> (sinon uniquement cette date)
            </span>
          </label>
        )}
        <Field label="Titre">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
        </Field>
        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input min-h-[70px]"
          />
        </Field>
        {!applySeries && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Début">
              <input
                type="datetime-local"
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
        )}
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
        <Field label="Infos pratiques">
          <textarea
            value={practicalInfo}
            onChange={(e) => setPracticalInfo(e.target.value)}
            className="input min-h-[60px]"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={attendanceRequired}
            onChange={(e) => setAttendanceRequired(e.target.checked)}
          />
          <span>Présence obligatoire pour tous les membres</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
          <span>Évènement payant</span>
        </label>
        {isPaid && (
          <Field label="Prix (€)">
            <input
              type="number"
              step="0.01"
              value={priceEuros}
              onChange={(e) => setPriceEuros(e.target.value)}
              className="input"
            />
          </Field>
        )}
        {isPaid && attendanceRequired && (
          <p className="text-xs text-orange-700">
            ⚠️ Le paiement est dû par tous les membres, présents ou non.
          </p>
        )}
        {err && <p className="text-sm text-destructive">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-2 rounded-md border text-sm">
            Annuler
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || !title}
            className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
          >
            {save.isPending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
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
  const createFn = useServerFn(createEvent);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [practicalInfo, setPracticalInfo] = useState("");
  const [pollQuestion, setPollQuestion] = useState("Seras-tu présent ?");
  const [pollOptions, setPollOptions] = useState<string[]>(["Oui", "Non", "Peut-être"]);
  const [pollResultsVisible, setPollResultsVisible] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const [priceEuros, setPriceEuros] = useState("");
  const [attendanceRequired, setAttendanceRequired] = useState(false);
  // Recurrence
  const [isRecurring, setIsRecurring] = useState(false);
  const [freq, setFreq] = useState<"WEEKLY" | "MONTHLY" | "DAILY">("WEEKLY");
  const [interval, setInterval] = useState("1");
  const [count, setCount] = useState("10");
  const [err, setErr] = useState<string | null>(null);

  const rrule = isRecurring
    ? `FREQ=${freq};INTERVAL=${Math.max(1, Number(interval) || 1)};COUNT=${Math.max(1, Math.min(52, Number(count) || 1))}`
    : null;

  const submit = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          clubId,
          title,
          description: description || null,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
          locationName: locationName || null,
          locationAddress: locationAddress || null,
          practicalInfo: practicalInfo || null,
          pollQuestion: pollQuestion || null,
          pollOptions: pollOptions.map((o) => o.trim()).filter(Boolean),
          pollResultsVisible,
          isPaid,
          priceEuros: isPaid && priceEuros ? Number(priceEuros) : null,
          attendanceRequired,
          rrule,
        },
      }),
    onSuccess: onCreated,
    onError: (e: any) => setErr(e.message ?? "Erreur"),
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

          <div className="border-t pt-3 space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
              />
              <span className="font-semibold">Évènement récurrent</span>
            </label>
            {isRecurring && (
              <div className="grid grid-cols-3 gap-2">
                <Field label="Fréquence">
                  <select
                    value={freq}
                    onChange={(e) => setFreq(e.target.value as any)}
                    className="input"
                  >
                    <option value="DAILY">Quotidien</option>
                    <option value="WEEKLY">Hebdomadaire</option>
                    <option value="MONTHLY">Mensuel</option>
                  </select>
                </Field>
                <Field label="Tous les">
                  <input
                    type="number"
                    min="1"
                    value={interval}
                    onChange={(e) => setInterval(e.target.value)}
                    className="input"
                  />
                </Field>
                <Field label="Nb occurrences">
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    className="input"
                  />
                </Field>
                <div className="col-span-3 text-xs text-muted-foreground">
                  RRULE: <code>{rrule}</code>
                </div>
              </div>
            )}
          </div>

          <Field label="Lieu (nom)">
            <input
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="input"
              placeholder="Restaurant Le Pré, Salon des Ambassadeurs…"
            />
          </Field>
          <Field label="Adresse (pour Google Maps)">
            <input
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
              className="input"
              placeholder="12 rue de la Paix, 75002 Paris"
            />
          </Field>
          <Field label="Infos pratiques">
            <textarea
              rows={2}
              value={practicalInfo}
              onChange={(e) => setPracticalInfo(e.target.value)}
              className="input"
              placeholder="Dress code, parking, contact…"
            />
          </Field>

          <div className="border-t pt-3 space-y-2">
            <div className="font-semibold">Sondage de présence</div>
            <Field label="Question">
              <input
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                className="input"
              />
            </Field>
            <div className="space-y-1.5">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={opt}
                    onChange={(e) => {
                      const next = [...pollOptions];
                      next[i] = e.target.value;
                      setPollOptions(next);
                    }}
                    className="input flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                    className="px-2 text-muted-foreground hover:text-destructive"
                  >
                    ×
                  </button>
                </div>
              ))}
              {pollOptions.length < 10 && (
                <button
                  type="button"
                  onClick={() => setPollOptions([...pollOptions, ""])}
                  className="text-xs text-accent"
                >
                  + Ajouter une option
                </button>
              )}
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={pollResultsVisible}
                onChange={(e) => setPollResultsVisible(e.target.checked)}
              />
              Les membres voient les résultats du sondage
            </label>
          </div>

          <div className="border-t pt-3 space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={attendanceRequired}
                onChange={(e) => setAttendanceRequired(e.target.checked)}
              />
              <span className="font-semibold">Présence obligatoire pour tous les membres</span>
            </label>
            <p className="text-xs text-muted-foreground">
              Si activé, l'évènement concerne tous les membres du club. Sinon, chacun est libre de
              répondre au sondage.
            </p>
          </div>

          <div className="border-t pt-3 space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPaid}
                onChange={(e) => setIsPaid(e.target.checked)}
              />
              <span className="font-semibold">Évènement payant</span>
            </label>
            {isPaid && (
              <Field label="Prix (€)">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={priceEuros}
                  onChange={(e) => setPriceEuros(e.target.value)}
                  className="input"
                />
              </Field>
            )}
            {isPaid && attendanceRequired && (
              <p className="text-xs text-orange-700">
                ⚠️ Le paiement sera dû par tous les membres, présents ou non.
              </p>
            )}
            {isPaid && !attendanceRequired && (
              <p className="text-xs text-muted-foreground">
                Après création, une cagnotte pourra être liée à cet évènement pour encaisser les
                paiements.
              </p>
            )}
          </div>


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
