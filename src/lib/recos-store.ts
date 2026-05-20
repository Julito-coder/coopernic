// Lightweight in-memory + localStorage reco store with pub/sub.
// Will be swapped for Lovable Cloud (DB) in Phase 4.

import { MEMBERS } from "./mock-data";

export type RecoStatus = "envoyee" | "en_cours" | "rdv" | "gagnee" | "perdue";

export type Reco = {
  id: string;
  fromMemberId: string;   // qui envoie la reco (ici "moi" = amelie-rousseau)
  toMemberId: string;     // bénéficiaire (membre du club)
  prospectName: string;
  prospectCompany: string;
  prospectContact?: string; // email ou tel
  description: string;
  estimatedAmount?: number; // en €
  status: RecoStatus;
  conversationId?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export const STATUS_LABEL: Record<RecoStatus, string> = {
  envoyee: "Envoyée",
  en_cours: "En cours",
  rdv: "RDV pris",
  gagnee: "Deal gagné",
  perdue: "Perdue",
};

export const STATUS_COLOR: Record<RecoStatus, string> = {
  envoyee: "bg-secondary text-foreground border-border",
  en_cours: "bg-accent/15 text-accent border-accent/30",
  rdv: "bg-primary/10 text-primary border-primary/20",
  gagnee: "bg-success/15 text-success border-success/30",
  perdue: "bg-destructive/10 text-destructive border-destructive/30",
};

export const CURRENT_USER_ID = "amelie-rousseau";

const STORAGE_KEY = "coopernic.recos.v1";

// Seed examples so the dashboard isn't empty on first load.
const seed: Reco[] = [
  {
    id: "r-seed-1",
    fromMemberId: "amelie-rousseau",
    toMemberId: "karim-benali",
    prospectName: "Mathieu Lefèvre",
    prospectCompany: "Lefèvre Industries",
    prospectContact: "m.lefevre@lefevre-ind.fr",
    description: "Cession majoritaire à préparer, besoin d'un avocat M&A senior.",
    estimatedAmount: 18000,
    status: "rdv",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: "r-seed-2",
    fromMemberId: "karim-benali",
    toMemberId: "amelie-rousseau",
    prospectName: "Camille Dorel",
    prospectCompany: "Dorel SaaS",
    description: "Refonte produit + cadrage série A.",
    estimatedAmount: 42000,
    status: "gagnee",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
  {
    id: "r-seed-3",
    fromMemberId: "amelie-rousseau",
    toMemberId: "claire-petit",
    prospectName: "Hugo Marin",
    prospectCompany: "Marin Spirits",
    prospectContact: "+33 6 22 33 44 55",
    description: "Lancement gamme premium, besoin branding & packaging.",
    estimatedAmount: 25000,
    status: "en_cours",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
];

type Listener = () => void;
const listeners = new Set<Listener>();

function load(): Reco[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as Reco[];
  } catch {
    return seed;
  }
}

function persist(list: Reco[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

let cache: Reco[] | null = null;

export function getRecos(): Reco[] {
  if (!cache) cache = load();
  return cache;
}

export function subscribeRecos(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  listeners.forEach((l) => l());
}

export function addReco(input: Omit<Reco, "id" | "createdAt" | "updatedAt" | "fromMemberId"> & { fromMemberId?: string }): Reco {
  const now = new Date().toISOString();
  const reco: Reco = {
    id: `r-${Date.now()}`,
    fromMemberId: input.fromMemberId ?? CURRENT_USER_ID,
    toMemberId: input.toMemberId,
    prospectName: input.prospectName,
    prospectCompany: input.prospectCompany,
    prospectContact: input.prospectContact,
    description: input.description,
    estimatedAmount: input.estimatedAmount,
    status: input.status,
    conversationId: input.conversationId,
    createdAt: now,
    updatedAt: now,
  };
  const list = [reco, ...getRecos()];
  cache = list;
  persist(list);
  emit();
  return reco;
}

export function updateRecoStatus(id: string, status: RecoStatus) {
  const list = getRecos().map((r) =>
    r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r
  );
  cache = list;
  persist(list);
  emit();
}

export function computeStats(userId: string = CURRENT_USER_ID) {
  const all = getRecos();
  const sent = all.filter((r) => r.fromMemberId === userId);
  const received = all.filter((r) => r.toMemberId === userId);
  const won = sent.filter((r) => r.status === "gagnee");
  const wonReceived = received.filter((r) => r.status === "gagnee");

  const caGenerated = won.reduce((s, r) => s + (r.estimatedAmount ?? 0), 0);
  const caReceived = wonReceived.reduce((s, r) => s + (r.estimatedAmount ?? 0), 0);
  const conversionRate = sent.length === 0 ? 0 : Math.round((won.length / sent.length) * 100);

  // Leaderboard club entier
  const byMember = new Map<string, { sent: number; won: number; ca: number }>();
  for (const r of all) {
    const cur = byMember.get(r.fromMemberId) ?? { sent: 0, won: 0, ca: 0 };
    cur.sent += 1;
    if (r.status === "gagnee") {
      cur.won += 1;
      cur.ca += r.estimatedAmount ?? 0;
    }
    byMember.set(r.fromMemberId, cur);
  }
  const leaderboard = MEMBERS
    .map((m) => ({
      member: m,
      ...(byMember.get(m.id) ?? { sent: 0, won: 0, ca: 0 }),
    }))
    .sort((a, b) => b.ca - a.ca || b.won - a.won || b.sent - a.sent)
    .slice(0, 5);

  return {
    sentCount: sent.length,
    receivedCount: received.length,
    wonCount: won.length,
    caGenerated,
    caReceived,
    conversionRate,
    leaderboard,
  };
}

// React hook helper
import { useSyncExternalStore } from "react";
export function useRecos(): Reco[] {
  return useSyncExternalStore(
    (cb) => subscribeRecos(cb),
    () => getRecos(),
    () => seed
  );
}
