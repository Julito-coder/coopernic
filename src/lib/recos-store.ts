// Lightweight in-memory + localStorage reco store with pub/sub.
// Will be swapped for Lovable Cloud (DB) in Phase 4.



export type RecoStatus = "envoyee" | "contacte" | "rdv" | "deal" | "no_deal";

export type Reco = {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  prospectName: string;
  prospectCompany: string;
  prospectContact?: string;
  description: string;
  estimatedAmount?: number; // en €
  commissionRate?: number;  // % reversé à l'apporteur (ex: 10 = 10%)
  status: RecoStatus;
  conversationId?: string;
  invoiceId?: string;       // id facture Stripe une fois générée
  invoiceUrl?: string;      // hosted invoice URL
  invoiceStatus?: "draft" | "sent" | "paid";
  createdAt: string;
  updatedAt: string;
};

export const STATUS_ORDER: RecoStatus[] = ["envoyee", "contacte", "rdv", "deal", "no_deal"];

export const STATUS_LABEL: Record<RecoStatus, string> = {
  envoyee: "Envoyée",
  contacte: "Contacté",
  rdv: "RDV pris",
  deal: "Deal",
  no_deal: "No deal",
};

export const STATUS_COLOR: Record<RecoStatus, string> = {
  envoyee: "bg-secondary text-foreground border-border",
  contacte: "bg-accent/15 text-accent border-accent/30",
  rdv: "bg-primary/10 text-primary border-primary/20",
  deal: "bg-success/15 text-success border-success/30",
  no_deal: "bg-destructive/10 text-destructive border-destructive/30",
};

export const CURRENT_USER_ID = "amelie-rousseau";

// Bumped to v2 — statuses & commission fields changed.
const STORAGE_KEY = "coopernic.recos.v2";

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
    status: "deal",
    commissionRate: 10,
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
    status: "contacte",
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
    commissionRate: input.commissionRate,
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

export function updateReco(id: string, patch: Partial<Reco>) {
  const list = getRecos().map((r) =>
    r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r
  );
  cache = list;
  persist(list);
  emit();
}

export function computeStats(userId: string = CURRENT_USER_ID) {
  const all = getRecos();
  const sent = all.filter((r) => r.fromMemberId === userId);
  const received = all.filter((r) => r.toMemberId === userId);
  const wonSent = sent.filter((r) => r.status === "deal");
  const wonReceived = received.filter((r) => r.status === "deal");

  const caGenerated = wonSent.reduce((s, r) => s + (r.estimatedAmount ?? 0), 0);
  const caReceived = wonReceived.reduce((s, r) => s + (r.estimatedAmount ?? 0), 0);
  const commissionsDue = wonReceived.reduce(
    (s, r) => s + ((r.estimatedAmount ?? 0) * (r.commissionRate ?? 0)) / 100,
    0
  );
  const commissionsToReceive = wonSent.reduce(
    (s, r) => s + ((r.estimatedAmount ?? 0) * (r.commissionRate ?? 0)) / 100,
    0
  );
  const conversionRate = sent.length === 0 ? 0 : Math.round((wonSent.length / sent.length) * 100);

  const byMember = new Map<string, { sent: number; won: number; ca: number }>();
  for (const r of all) {
    const cur = byMember.get(r.fromMemberId) ?? { sent: 0, won: 0, ca: 0 };
    cur.sent += 1;
    if (r.status === "deal") {
      cur.won += 1;
      cur.ca += r.estimatedAmount ?? 0;
    }
    byMember.set(r.fromMemberId, cur);
  }
  const leaderboard = Array.from(byMember.entries())
    .map(([memberId, s]) => ({ memberId, ...s }))
    .sort((a, b) => b.ca - a.ca || b.won - a.won || b.sent - a.sent)
    .slice(0, 5);


  return {
    sentCount: sent.length,
    receivedCount: received.length,
    wonCount: wonSent.length,
    wonReceivedCount: wonReceived.length,
    caGenerated,
    caReceived,
    commissionsDue,
    commissionsToReceive,
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
