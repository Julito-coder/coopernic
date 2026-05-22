import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  CalendarCheck,
  Wallet,
  TrendingUp,
  ArrowRight,
  Check,
  Sparkles,
} from "lucide-react";
import appIcon from "@/assets/coopernic-app-icon.jpg";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Coopernic — Le système d'exploitation des business clubs" },
      {
        name: "description",
        content:
          "Annuaire, événements, cotisations, business tracking. Tout ce qu'il faut pour piloter votre club et activer vos membres, sans Excel ni 12 outils.",
      },
    ],
  }),
});

function Landing() {
  return (
    <div className="bg-background text-foreground">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-80" />
        <div className="relative mx-auto max-w-5xl px-6 pt-20 pb-24 md:pt-28 md:pb-32 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            <Sparkles className="h-3 w-3" />
            Pensé pour les dirigeants de clubs business
          </div>

          <h1 className="mt-8 font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-balance md:text-7xl">
            Votre club,
            <br />
            <span className="text-accent">dans la poche.</span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-ink-muted md:text-xl">
            Démarquez-vous : offrez à vos membres un outil clé en main.
            Recommandations, paiements, annuaire, événements — réunis dans une seule app,
            pour que vous passiez vos soirées à animer
            votre cercle, pas à relancer des impayés.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-bold text-accent-foreground shadow-glow transition-transform hover:-translate-y-0.5"
            >
              Réserver une démo
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/annuaire"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-7 py-3.5 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:bg-surface"
            >
              Voir le produit
            </Link>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Essai 30 jours · Sans carte · Migration depuis Excel offerte
          </p>
        </div>
      </section>

      {/* PAIN POINTS → SOLUTION */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
              Ce que vous vivez aujourd'hui
            </div>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight">
              Animer un club, c'est un métier.<br />
              Le gérer ne devrait pas en être un autre.
            </h2>
            <ul className="mt-8 space-y-4 text-base text-ink-muted">
              {[
                "Un Excel des membres, un Google Form pour les events, un autre pour les cotisations.",
                "Vous relancez à la main les impayés et les inscriptions.",
                "Vos membres ne mesurent pas le ROI du club — donc certains ne renouvellent pas.",
                "Le bureau passe plus de temps en logistique qu'en stratégie.",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative rounded-3xl border border-border bg-surface-elevated p-8 shadow-elevated">
            <div className="absolute -top-4 left-8 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-foreground">
              Avec Coopernic
            </div>
            <ul className="mt-2 space-y-4">
              {[
                "Un seul outil pour vos membres, vos events, vos cotisations.",
                "Relances automatiques, paiements en ligne, présences scannées.",
                "Chaque membre voit ce que le club lui rapporte — concrètement.",
                "Vous reprenez du temps pour ce qui compte : la vie du cercle.",
              ].map((t) => (
                <li key={t} className="flex gap-3 text-sm font-medium text-foreground">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section className="border-y border-border/60 bg-surface/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
              Le système Coopernic
            </div>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight">
              Quatre modules. Une seule app. Zéro friction.
            </h2>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Users,
                title: "Annuaire vivant",
                desc: "Fiches business, recherche, filtres, carte. Vos membres se trouvent en 10 secondes.",
              },
              {
                icon: CalendarCheck,
                title: "Événements",
                desc: "Inscriptions, paiement, check-in QR, calendrier sync. Plus de tableurs.",
              },
              {
                icon: Wallet,
                title: "Cotisations",
                desc: "Stripe intégré, relances auto, exports comptables. Vous ne courez plus après l'argent.",
              },
              {
                icon: TrendingUp,
                title: "Business tracking",
                desc: "Recos, deals signés, ROI par membre. La preuve chiffrée que le club rapporte.",
              },
            ].map((m) => (
              <div
                key={m.title}
                className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-accent/40 hover:shadow-elevated"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <m.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-display text-lg font-bold text-foreground">
                  {m.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF / QUOTE */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <div className="font-display text-3xl font-bold leading-[1.25] tracking-tight text-foreground md:text-4xl">
          <span className="text-accent">«</span> Notre bureau a récupéré
          deux soirées par mois. Et les membres voient enfin la valeur de leur cotisation.
          <span className="text-accent">»</span>
        </div>
        <div className="mt-6 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Président · Club business régional · 84 membres
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-surface-elevated via-surface to-primary p-10 shadow-elevated md:p-16">
          <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
          <div className="relative grid items-center gap-10 md:grid-cols-[1fr_auto]">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl text-balance">
                Prêt à transformer votre club en machine à ROI ?
              </h2>
              <p className="mt-4 max-w-xl text-base text-ink-muted">
                30 minutes de démo, on vous montre comment vos membres, vos events
                et vos cotisations tiennent dans une seule app — la vôtre.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold text-accent-foreground shadow-glow transition-transform hover:-translate-y-0.5"
                >
                  Réserver ma démo <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="mailto:hello@coopernic.fr"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-6 py-3 text-sm font-semibold text-foreground hover:bg-background/70"
                >
                  Nous écrire
                </a>
              </div>
            </div>
            <img
              src={appIcon}
              alt="Coopernic app"
              className="hidden h-32 w-32 rounded-3xl shadow-elevated ring-1 ring-accent/30 md:block"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
