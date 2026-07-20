import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  CalendarCheck,
  Wallet,
  TrendingUp,
  ArrowRight,
  Check,
} from "lucide-react";
import appMockup from "@/assets/coopernic-app-mockup.png";

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
      {/* HERO — blanc, éditorial */}
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
                to="/login"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-sm font-bold text-accent-foreground transition-transform hover:-translate-y-0.5"
              >
                Réserver une démo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/annuaire"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-border bg-background px-6 text-sm font-semibold text-foreground hover:bg-secondary"
              >
                Voir le produit
              </Link>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Essai 30 jours · Sans carte · Migration depuis Excel offerte
            </p>
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

      {/* PREUVE — bandeau crème avec chiffres clés */}
      <section className="bg-cream">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-10 md:grid-cols-4 md:px-8 md:py-14">
          {[
            { n: "1", l: "app pour tout piloter" },
            { n: "-2 h", l: "de logistique par semaine" },
            { n: "+30 %", l: "de renouvellements" },
            { n: "0 €", l: "d'Excel dans votre soirée" },
          ].map((k) => (
            <div key={k.l} className="text-center md:text-left">
              <div className="font-display text-3xl font-bold text-accent md:text-4xl">
                {k.n}
              </div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground md:text-sm md:normal-case md:tracking-normal md:text-foreground/70">
                {k.l}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* VALEUR × 3 — sections pleines alternées */}
      <ValueBlock
        eyebrow="Réseau"
        Icon={Users}
        title="Vos membres se trouvent en 10 secondes."
        body="Annuaire vivant avec recherche, filtres, entreprises et villes. Un membre = une fiche business à jour, pas une ligne d'Excel."
        bullets={[
          "Fiches business complètes",
          "Recherche & filtres instantanés",
          "Ouverture inter-clubs Coopernic",
        ]}
      />

      <ValueBlock
        eyebrow="Business tracking"
        Icon={TrendingUp}
        title="La preuve chiffrée que le club rapporte."
        body="Recommandations, deals signés, CA généré, ROI par membre. Vos adhérents voient ce que le club leur rend — et renouvellent."
        bullets={[
          "Reco en un clic depuis la messagerie",
          "Statuts contacté / deal / no deal",
          "Commissionnement & facturation",
        ]}
        reverse
        tone="cream"
      />

      <ValueBlock
        eyebrow="Gestion club"
        Icon={CalendarCheck}
        title="Vos soirées, animées. Pas relancées."
        body="Évènements, sondages de présence, cagnottes, cotisations Stripe. Le bureau anime, la plateforme s'occupe du reste."
        bullets={[
          "Évènements + sondage de présence",
          "Cagnottes payables en ligne",
          "Cotisations Stripe & relances auto",
        ]}
      />

      {/* CIBLE */}
      <section className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-20">
        <div className="rounded-2xl border border-border bg-cream p-6 md:p-12">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
            Pour qui
          </div>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight md:text-4xl">
            Vous fondez ou dirigez un club business.
            <br />
            <span className="text-muted-foreground font-medium">
              Coopernic est fait pour vous.
            </span>
          </h2>
          <ul className="mt-6 grid gap-3 text-[15px] md:mt-8 md:grid-cols-2 md:gap-4">
            {[
              "Vous voulez démarquer votre club face aux autres réseaux.",
              "Vos membres réclament un outil, pas un Google Drive.",
              "Vous voulez chiffrer le ROI du club, pas juste le raconter.",
              "Vous n'avez pas 6 mois pour faire développer une app.",
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA FINAL — bande navy pleine largeur */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-4xl px-5 py-16 text-center md:px-8 md:py-24">
          <h2 className="font-display text-3xl font-bold tracking-tight text-balance md:text-5xl">
            Prêt à transformer votre club
            <br />
            <span className="text-accent">en machine à ROI ?</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base text-primary-foreground/80 md:text-lg">
            30 minutes de démo. On vous montre comment vos membres, vos évènements
            et vos cotisations tiennent dans une seule app — la vôtre.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/login"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-7 text-sm font-bold text-accent-foreground transition-transform hover:-translate-y-0.5"
            >
              Réserver ma démo <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="mailto:hello@coopernic.fr"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-primary-foreground/30 bg-transparent px-7 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/10"
            >
              Nous écrire
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function ValueBlock({
  eyebrow,
  Icon,
  title,
  body,
  bullets,
  reverse,
  tone,
}: {
  eyebrow: string;
  Icon: typeof Users;
  title: string;
  body: string;
  bullets: string[];
  reverse?: boolean;
  tone?: "cream";
}) {
  return (
    <section className={tone === "cream" ? "bg-cream" : "bg-background"}>
      <div
        className={`mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 md:grid-cols-2 md:gap-16 md:px-8 md:py-24 ${
          reverse ? "md:[&>*:first-child]:order-2" : ""
        }`}
      >
        <div>
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Icon className="h-5 w-5" />
          </div>
          <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
            {eyebrow}
          </div>
          <h2 className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight md:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground md:text-base">
            {body}
          </p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {bullets.map((b) => (
              <li key={b} className="flex gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div className="aspect-[4/3] rounded-2xl border border-border bg-cream-soft p-8 shadow-card md:aspect-[5/4]">
            <div className="h-full w-full rounded-xl border border-border/70 bg-background p-6">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-accent" />
                <div className="h-2 w-16 rounded-full bg-muted" />
              </div>
              <div className="mt-5 space-y-2.5">
                <div className="h-3 w-3/4 rounded bg-muted" />
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-2/3 rounded bg-muted" />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="h-16 rounded-lg border border-border bg-cream" />
                <div className="h-16 rounded-lg border border-accent/30 bg-accent/10" />
              </div>
              <div className="mt-4 h-10 rounded-lg bg-primary" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
