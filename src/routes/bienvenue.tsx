import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/use-session";
import {
  Users as UsersIcon,
  MessageSquare,
  CalendarDays,
  Wallet,
  BarChart3,
  ArrowRight,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/bienvenue")({
  component: WelcomePage,
  head: () => ({
    meta: [
      { title: "Bienvenue — Coopernic" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const SLIDES = [
  {
    Icon: UsersIcon,
    kicker: "Annuaire",
    title: "Trouvez le bon membre en 10 secondes.",
    body: "Fiches business, recherche, filtres. Votre club à portée de main, plus jamais un Excel.",
  },
  {
    Icon: MessageSquare,
    kicker: "Messages",
    title: "Discutez en privé avec les membres.",
    body: "Messagerie 1-to-1 style WhatsApp : photos, fiches membres, et recommandations partagées.",
  },
  {
    Icon: CalendarDays,
    kicker: "Évènements",
    title: "Ne ratez plus une soirée.",
    body: "Sondages de présence, infos pratiques, point GPS. Tout ce qu'il faut avant de venir.",
  },
  {
    Icon: Wallet,
    kicker: "Cagnottes",
    title: "Participez en un clic.",
    body: "Financement d'évènements et cotisations : votre part calculée automatiquement, paiement en ligne.",
  },
  {
    Icon: BarChart3,
    kicker: "Stats & recos",
    title: "Suivez la valeur générée.",
    body: "Envoyez et recevez des recommandations, suivez les deals signés et votre ROI.",
  },
];

function WelcomePage() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);

  function finish() {
    if (user && typeof window !== "undefined") {
      localStorage.setItem(`coopernic.onboarded.${user.id}`, "1");
    }
    navigate({ to: "/annuaire", replace: true });
  }

  if (!user) return null;

  const last = i === SLIDES.length - 1;
  const S = SLIDES[i];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col justify-between px-6 py-10">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {i + 1} / {SLIDES.length}
          </span>
          <button onClick={finish} className="hover:text-foreground">
            Passer
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <S.Icon className="h-8 w-8" />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
            {S.kicker}
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight md:text-4xl">
            {S.title}
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            {S.body}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-center gap-1.5">
            {SLIDES.map((_, k) => (
              <span
                key={k}
                className={`h-1.5 rounded-full transition-all ${
                  k === i ? "w-6 bg-accent" : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between gap-3">
            <button
              onClick={() => setI((n) => Math.max(0, n - 1))}
              disabled={i === 0}
              className="h-11 rounded-full border border-border px-5 text-sm font-semibold text-foreground disabled:opacity-40"
            >
              Précédent
            </button>
            <button
              onClick={() => (last ? finish() : setI((n) => n + 1))}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-6 text-sm font-bold text-accent-foreground"
            >
              {last ? (
                <>
                  Accéder à mon espace <Check className="h-4 w-4" />
                </>
              ) : (
                <>
                  Suivant <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
