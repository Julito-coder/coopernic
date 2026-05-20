import { useState } from "react";
import { addReco, STATUS_LABEL, type RecoStatus } from "@/lib/recos-store";
import type { Member } from "@/lib/mock-data";

type Props = {
  toMember: Member;
  conversationId?: string;
  open: boolean;
  onClose: () => void;
  onSent?: (summary: string) => void;
};

export function RecoComposer({ toMember, conversationId, open, onClose, onSent }: Props) {
  const [prospectName, setProspectName] = useState("");
  const [prospectCompany, setProspectCompany] = useState("");
  const [prospectContact, setProspectContact] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<RecoStatus>("envoyee");

  if (!open) return null;

  const canSubmit = prospectName.trim() && prospectCompany.trim() && description.trim();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const reco = addReco({
      toMemberId: toMember.id,
      prospectName: prospectName.trim(),
      prospectCompany: prospectCompany.trim(),
      prospectContact: prospectContact.trim() || undefined,
      description: description.trim(),
      estimatedAmount: amount ? Number(amount) : undefined,
      status,
      conversationId,
    });
    const summary =
      `🤝 Recommandation envoyée — ${reco.prospectName} (${reco.prospectCompany})` +
      (reco.estimatedAmount ? ` · ~${reco.estimatedAmount.toLocaleString("fr-FR")} €` : "") +
      `\n${reco.description}`;
    onSent?.(summary);
    // reset
    setProspectName(""); setProspectCompany(""); setProspectContact("");
    setDescription(""); setAmount(""); setStatus("envoyee");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 px-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-elevated"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border/70 bg-gradient-to-br from-primary to-[oklch(0.3_0.08_265)] px-6 py-5 text-primary-foreground">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
              Nouvelle recommandation
            </div>
            <h2 className="mt-1 font-display text-xl font-extrabold">
              Pour {toMember.firstName} {toMember.lastName}
            </h2>
            <p className="mt-1 text-xs text-white/70">
              {toMember.role} · {toMember.company}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Fermer"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>

        <div className="grid gap-4 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom du prospect *">
              <input required value={prospectName} onChange={(e) => setProspectName(e.target.value)} className={inputCx} placeholder="Mathieu Lefèvre" />
            </Field>
            <Field label="Société *">
              <input required value={prospectCompany} onChange={(e) => setProspectCompany(e.target.value)} className={inputCx} placeholder="Lefèvre Industries" />
            </Field>
          </div>
          <Field label="Contact (email ou tel)">
            <input value={prospectContact} onChange={(e) => setProspectContact(e.target.value)} className={inputCx} placeholder="m.lefevre@…  ou  +33 6…" />
          </Field>
          <Field label="Contexte / besoin *">
            <textarea required rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={inputCx + " resize-none"} placeholder="Explique pourquoi tu penses à lui/elle pour ce prospect." />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Montant estimé (€)">
              <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCx} placeholder="15000" />
            </Field>
            <Field label="Statut initial">
              <select value={status} onChange={(e) => setStatus(e.target.value as RecoStatus)} className={inputCx}>
                {(["envoyee", "en_cours", "rdv"] as RecoStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-border/70 bg-background/40 px-6 py-4">
          <p className="text-[11px] text-muted-foreground">
            La reco apparaît immédiatement dans <strong>Suivi des recos</strong>.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-ink-muted transition-colors hover:bg-secondary">
              Annuler
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accent-foreground transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            >
              Envoyer la reco
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

const inputCx =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{label}</span>
      {children}
    </label>
  );
}
