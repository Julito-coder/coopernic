import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users,
  CalendarCheck,
  Wallet,
  TrendingUp,
  ArrowRight,
  Check,
  MapPin,
  Clock,
  Euro,
  Sparkles,
} from "lucide-react";
import appMockup from "@/assets/coopernic-app-mockup.png";
import { useSession } from "@/lib/use-session";
import { getMyEventsContext, listEvents } from "@/lib/events.functions";
import { listMySubscriptions } from "@/lib/cotisations.functions";
import { listPots } from "@/lib/pots.functions";
import { useRecos, computeStats, CURRENT_USER_ID } from "@/lib/recos-store";
import { useHasModule } from "@/lib/use-club-modules";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Coopernic — Le système d'exploitation des business clubs" },
      {
        name: "description",
        content:
          "Annuaire, événements, cotisations, business tracking. Tout ce qu'il faut pour piloter votre club et activer vos membres.",
      },
    ],
  }),
});

function Home() {
  const { user, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user) return;
    const onboardedKey = `coopernic.onboarded.${user.id}`;
    const onboarded =
      typeof window !== "undefined" && localStorage.getItem(onboardedKey) === "1";
    if (!onboarded) navigate({ to: "/bienvenue", replace: true });
  }, [loading, user, navigate]);

  if (loading) return <div className="min-h-[60vh]" aria-hidden />;
  if (user) return <MemberHome />;
  return <LandingMarketing />;
}

/* --------------------------------- MEMBER HOME --------------------------------- */

function MemberHome() {
  const { user } = useSession();
  const getCtx = useServerFn(getMyEventsContext);
  const getEvents = useServerFn(listEvents);
  const getSubs = useServerFn(listMySubscriptions);
  const getPots = useServerFn(listPots);

  const ctxQ = useQuery({ queryKey: ["me", "ctx"], queryFn: () => getCtx() });
  const clubId = ctxQ.data?.clubId ?? null;

  const eventsQ = useQuery({
    queryKey: ["me", "events", clubId],
    queryFn: () => getEvents({ data: { clubId: clubId! } }),
    enabled: !!clubId,
  });
  const potsQ = useQuery({
    queryKey: ["me", "pots", clubId],
    queryFn: () => getPots({ data: { clubId: clubId! } }),
    enabled: !!clubId,
  });
  const subsQ = useQuery({ queryKey: ["me", "subs"], queryFn: () => getSubs() });

  const now = Date.now();
  const upcomingEvents = useMemo(() => {
    return (eventsQ.data?.events ?? [])
      .filter((e: any) => new Date(e.starts_at).getTime() >= now - 3600_000)
      .slice(0, 3);
  }, [eventsQ.data, now]);

  const openPots = useMemo(() => {
    return (potsQ.data?.pots ?? [])
      .filter((p: any) => p.status === "open" || p.status === "active")
      .slice(0, 3);
  }, [potsQ.data]);

  const pendingSubs = useMemo(() => {
    return (subsQ.data?.subscriptions ?? []).filter(
      (s: any) => s.status === "pending" || s.status === "overdue",
    );
  }, [subsQ.data]);

  useRecos(); // subscribe
  const hasReco = useHasModule("recos") || true; // recos always displayed as personal stats
  const hasCommissions = useHasModule("commissions");
  const stats = computeStats(CURRENT_USER_ID);

  const firstName =
    (user?.user_metadata as any)?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "";

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 md:px-6 md:pt-10">
      {/* Greeting */}
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Bienvenue
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Bonjour {firstName} 👋
        </h1>
      </header>

      {/* Stats */}
      {hasReco && (
        <section className="mb-6">
          <SectionTitle icon={TrendingUp} label="Mes stats" to="/recos" />
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Reco envoyées" value={stats.sentCount} />
            <StatCard label="Reco reçues" value={stats.receivedCount} />
            <StatCard label="Deals signés" value={stats.wonCount} />
            <StatCard
              label={hasCommissions ? "Commissions à recevoir" : "CA généré"}
              value={
                hasCommissions
                  ? formatEuro(stats.commissionsToReceive)
                  : formatEuro(stats.caGenerated)
              }
            />
          </div>
        </section>
      )}

      {/* Upcoming events */}
      <section className="mb-6">
        <SectionTitle icon={CalendarCheck} label="Évènements à venir" to="/evenements" />
        <div className="mt-3 space-y-2">
          {!clubId ? (
            <EmptyLine text="Aucun club associé pour le moment." />
          ) : eventsQ.isLoading ? (
            <SkeletonLine />
          ) : upcomingEvents.length === 0 ? (
            <EmptyLine text="Aucun évènement prévu." />
          ) : (
            upcomingEvents.map((e: any) => <EventRow key={e.id} event={e} />)
          )}
        </div>
      </section>

      {/* Upcoming payments */}
      <section className="mb-6">
        <SectionTitle icon={Wallet} label="Paiements à venir" to="/cagnottes" />
        <div className="mt-3 space-y-2">
          {pendingSubs.length === 0 && openPots.length === 0 ? (
            <EmptyLine text="Aucun paiement en attente." />
          ) : (
            <>
              {pendingSubs.map((s: any) => (
                <PaymentRow
                  key={s.id}
                  title={s.cotisation_plans?.name ?? "Cotisation"}
                  subtitle={
                    s.next_due_at
                      ? `Échéance ${formatDate(s.next_due_at)}`
                      : "En attente"
                  }
                  amount={formatEuro((s.cotisation_plans?.amount_cents ?? 0) / 100)}
                  to="/cotisations"
                  status={s.status === "overdue" ? "En retard" : "À régler"}
                  danger={s.status === "overdue"}
                />
              ))}
              {openPots.map((p: any) => (
                <PaymentRow
                  key={p.id}
                  title={p.title}
                  subtitle={
                    p.goal_cents
                      ? `Objectif ${formatEuro(p.goal_cents / 100)}`
                      : "Cagnotte ouverte"
                  }
                  to="/cagnottes"
                  status="Ouvert"
                />
              ))}
            </>
          )}
        </div>
      </section>

      {/* Shortcuts */}
      <section>
        <SectionTitle icon={Sparkles} label="Raccourcis" />
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Shortcut to="/annuaire" icon={Users} label="Annuaire" />
          <Shortcut to="/messages" icon={ArrowRight} label="Messages" />
          <Shortcut to="/carte" icon={MapPin} label="Carte" />
          <Shortcut to="/mon-profil" icon={Check} label="Mon profil" />
        </div>
      </section>
    </div>
  );
}

/* --------------------------------- SUBCOMPONENTS --------------------------------- */

function SectionTitle({
  icon: Icon,
  label,
  to,
}: {
  icon: typeof Users;
  label: string;
  to?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/80">
          {label}
        </h2>
      </div>
      {to && (
        <Link
          to={to}
          className="text-xs font-medium text-accent hover:underline"
        >
          Tout voir →
        </Link>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="font-display text-xl font-bold text-foreground">{value}</div>
      <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function EventRow({ event }: { event: any }) {
  return (
    <Link
      to="/evenements"
      className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 transition hover:border-accent/40"
    >
      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-cream text-center">
        <div className="text-[10px] font-semibold uppercase text-muted-foreground">
          {formatMonth(event.starts_at)}
        </div>
        <div className="text-sm font-bold text-foreground">
          {new Date(event.starts_at).getDate()}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">
          {event.title}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatTime(event.starts_at)}
          {event.location_name && (
            <>
              <span>·</span>
              <span className="truncate">{event.location_name}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

function PaymentRow({
  title,
  subtitle,
  amount,
  status,
  to,
  danger,
}: {
  title: string;
  subtitle?: string;
  amount?: string;
  status?: string;
  to: string;
  danger?: boolean;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 transition hover:border-accent/40"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-cream">
        <Euro className="h-5 w-5 text-accent" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">{title}</div>
        {subtitle && (
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {subtitle}
          </div>
        )}
      </div>
      <div className="text-right">
        {amount && (
          <div className="text-sm font-bold text-foreground">{amount}</div>
        )}
        {status && (
          <div
            className={`mt-0.5 text-[10px] font-semibold uppercase tracking-wider ${
              danger ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {status}
          </div>
        )}
      </div>
    </Link>
  );
}

function Shortcut({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof Users;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-background p-4 text-center transition hover:border-accent/40"
    >
      <Icon className="h-5 w-5 text-accent" />
      <span className="text-xs font-semibold text-foreground">{label}</span>
    </Link>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-background p-4 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function SkeletonLine() {
  return <div className="h-14 animate-pulse rounded-xl bg-muted" />;
}

/* --------------------------------- Helpers --------------------------------- */

function formatEuro(v: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v || 0);
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function formatMonth(iso: string) {
  return new Date(iso)
    .toLocaleDateString("fr-FR", { month: "short" })
    .replace(".", "");
}

/* --------------------------------- LANDING MARKETING --------------------------------- */

function LandingMarketing() {
  return (
    <div className="bg-background text-foreground">
      <section className="mx-auto max-w-6xl px-5 pt-10 pb-14 md:px-8 md:pt-20 md:pb-24">
        <div className="grid items-center gap-10 md:grid-cols-[1.1fr_0.9fr] md:gap-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
              Pour les fondateurs de clubs business
            </div>
            <h1 className="mt-6 font-display text-[38px] font-bold leading-[1.05] tracking-tight text-balance text-foreground md:text-6xl">
              Le système
              <br />
              d'exploitation de
              <br />
              <span className="text-accent">votre club business.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground md:text-lg">
              Annuaire, évènements, cagnottes, recommandations. Une seule app
              pour animer vos membres et prouver la valeur du club — pas 12 outils.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-sm font-bold text-accent-foreground transition-transform hover:-translate-y-0.5"
              >
                Se connecter
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="mailto:hello@coopernic.fr"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-border bg-background px-6 text-sm font-semibold text-foreground hover:bg-secondary"
              >
                Nous écrire
              </a>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[280px] md:max-w-sm">
            <div className="absolute -inset-8 -z-10 rounded-full bg-accent/15 blur-3xl" />
            <img
              src={appMockup}
              alt="Aperçu de l'application Coopernic sur mobile"
              width={1024}
              height={1536}
              className="w-full drop-shadow-xl"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
