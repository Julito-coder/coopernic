export type Member = {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
  role: string;
  company: string;
  sector: string;
  city: string;
  coords: { x: number; y: number }; // normalized 0-100 within France SVG
  bio: string;
  tags: string[];
  email: string;
  phone: string;
  linkedin?: string;
  website?: string;
  lookingFor: string[];
  canOffer: string[];
  joinedAt: string;
  club: string;
};

export const SECTORS = [
  "Tech & Digital",
  "Conseil & Stratégie",
  "Finance",
  "Marketing & Com",
  "Immobilier",
  "BTP & Industrie",
  "Santé & Bien-être",
  "Juridique",
  "Formation",
];

export const CITIES = [
  "Paris", "Lyon", "Marseille", "Bordeaux", "Toulouse",
  "Nantes", "Lille", "Strasbourg", "Nice", "Rennes",
];

export const MEMBERS: Member[] = [];

export type ConversationPreview = {
  id: string;
  memberId: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
};

export type MessageAttachment =
  | { kind: "photo"; url: string; name?: string }
  | { kind: "contact"; memberId: string }
  | {
      kind: "reco";
      recoId: string;
      prospectName: string;
      prospectCompany: string;
      description: string;
      estimatedAmount?: number;
      status: string;
    };

export type Message = {
  id: string;
  from: "me" | "them";
  text?: string;
  at: string;
  attachment?: MessageAttachment;
};

export const CONVERSATIONS: ConversationPreview[] = [];
export const MESSAGE_THREADS: Record<string, Message[]> = {};

export const getMember = (id: string) => MEMBERS.find((m) => m.id === id);

