import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getMember } from "@/lib/mock-data";

export const Route = createFileRoute("/membres/$id")({
  component: MemberPage,
  loader: ({ params }) => {
    const member = getMember(params.id);
    if (!member) throw notFound();
    return { member };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.member.firstName} ${loaderData.member.lastName} — COOPERNIK` },
          { name: "description", content: `${loaderData.member.role} chez ${loaderData.member.company}. ${loaderData.member.bio.slice(0, 140)}` },
        ]
      : [],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="font-display text-3xl font-bold">Membre introuvable</h1>
      <Link to="/annuaire" className="mt-4 inline-block text-accent hover:underline">← Retour à l'annuaire</Link>
    </div>
  ),
});

function MemberPage() {
  const { member } = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link to="/annuaire" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-accent">
        ← Annuaire
      </Link>

      {/* Header */}
      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-surface shadow-card">
        <div className="relative h-40 bg-primary bg-mesh" />
        <div className="px-8 pb-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-5">
              <div className="-mt-12 flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-surface bg-gradient-to-br from-primary to-accent font-display text-3xl font-black text-primary-foreground shadow-elevated">
                {member.initials}
              </div>
              <div className="pb-1">
                <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                  {member.firstName} {member.lastName}
                </h1>
                <div className="mt-1 text-base text-ink-muted">{member.role}</div>
                <div className="mt-0.5 text-sm font-semibold text-accent">{member.company}</div>
              </div>
            </div>

            <div className="flex gap-2 pb-1">
              <Link
                to="/messages"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5"
              >
                Envoyer un message
              </Link>
              <button className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary">
                Proposer un 1-to-1
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Pill icon="📍" label={member.city} />
            <Pill icon="🏷️" label={member.sector} />
            <Pill icon="🏛️" label={member.club} />
            <Pill icon="🗓️" label={`Membre depuis ${member.joinedAt}`} />
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="À propos">
            <p className="leading-relaxed text-foreground/90">{member.bio}</p>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {member.tags.map((t: string) => (
                <span key={t} className="rounded-md bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
                  {t}
                </span>
              ))}
            </div>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card title="Recherche actuellement" accent="accent">
              <ul className="space-y-2.5">
                {member.lookingFor.map((x: string) => (
                  <li key={x} className="flex gap-2.5 text-sm text-foreground/90">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    {x}
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Peut offrir" accent="success">
              <ul className="space-y-2.5">
                {member.canOffer.map((x: string) => (
                  <li key={x} className="flex gap-2.5 text-sm text-foreground/90">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                    {x}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card title="Coordonnées">
            <dl className="space-y-3 text-sm">
              <Row label="Email" value={<a href={`mailto:${member.email}`} className="text-accent hover:underline">{member.email}</a>} />
              <Row label="Téléphone" value={<a href={`tel:${member.phone}`} className="text-foreground hover:text-accent">{member.phone}</a>} />
              {member.linkedin && (
                <Row label="LinkedIn" value={<a href={`https://linkedin.com/in/${member.linkedin}`} className="text-accent hover:underline">/in/{member.linkedin}</a>} />
              )}
              {member.website && (
                <Row label="Site web" value={<a href={`https://${member.website}`} className="text-accent hover:underline">{member.website}</a>} />
              )}
            </dl>
          </Card>

          <Card title="Activité business">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { k: "12", l: "Recos données" },
                { k: "8", l: "Recos reçues" },
                { k: "47k€", l: "CA généré" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-secondary p-3">
                  <div className="font-display text-xl font-extrabold text-primary">{s.k}</div>
                  <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Module Business tracking — disponible en Phase 4
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children, accent }: { title: string; children: React.ReactNode; accent?: "accent" | "success" }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-card">
      <h2 className={
        "font-display text-sm font-bold uppercase tracking-[0.18em] " +
        (accent === "accent" ? "text-accent" : accent === "success" ? "text-success" : "text-ink-muted")
      }>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="truncate text-right">{value}</dd>
    </div>
  );
}

function Pill({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-foreground">
      <span>{icon}</span> {label}
    </span>
  );
}
