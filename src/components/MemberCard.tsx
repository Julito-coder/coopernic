import { Link } from "@tanstack/react-router";
import type { Member } from "@/lib/mock-data";
import { Globe2 } from "lucide-react";

export function MemberCard({
  member,
  clubBadge,
  isExternal,
}: {
  member: Member;
  clubBadge?: string;
  isExternal?: boolean;
}) {
  return (
    <Link
      to="/membres/$id"
      params={{ id: member.id }}
      className="group relative flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-elevated"
    >
      {clubBadge && (
        <span className={
          "absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider " +
          (isExternal
            ? "bg-accent/15 text-accent"
            : "bg-secondary text-foreground")
        }>
          {isExternal && <Globe2 className="h-2.5 w-2.5" />}
          {clubBadge}
        </span>
      )}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary font-display text-base font-bold text-primary-foreground">
          {member.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-base font-bold text-foreground">
            {member.firstName} {member.lastName}
          </div>
          <div className="truncate text-sm text-ink-muted">{member.role}</div>
          <div className="truncate text-xs font-medium text-accent">{member.company}</div>
        </div>
      </div>

      <p className="line-clamp-2 text-sm leading-relaxed text-ink-muted">{member.bio}</p>

      <div className="flex flex-wrap gap-1.5">
        {member.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border/70 pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          {member.city}
        </span>
        <span className="opacity-0 transition-opacity group-hover:opacity-100">
          Voir la fiche →
        </span>
      </div>
    </Link>
  );
}
