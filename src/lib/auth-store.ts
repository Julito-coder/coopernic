import { useSyncExternalStore } from "react";
import { MEMBERS, type Member } from "./mock-data";

export type Role = "superadmin" | "gestionnaire" | "membre";

export type Club = {
  id: string;
  name: string;
  city: string;
  gestionnaireId: string | null; // member id of the gestionnaire
  openToNetwork: boolean; // visible dans l'annuaire Coopernic inter-clubs
  createdAt: string;
};

export type SessionUser = {
  role: Role;
  memberId: string | null; // null for superadmin
  clubId: string | null; // gestionnaire/membre belong to a club
  displayName: string;
};

type State = {
  clubs: Club[];
  extraMembers: Member[]; // members added via UI
  removedMemberIds: string[];
  session: SessionUser;
};

const STORAGE_KEY = "coopernic.auth.v1";

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function bootstrapClubs(): Club[] {
  const names = Array.from(new Set(MEMBERS.map((m) => m.club)));
  return names.map((name, i) => {
    const sample = MEMBERS.find((m) => m.club === name)!;
    return {
      id: slug(name),
      name,
      city: sample.city,
      gestionnaireId: sample.id,
      openToNetwork: i % 2 === 0, // 1 club sur 2 ouvert au réseau pour la démo
      createdAt: new Date().toISOString(),
    };
  });
}

function defaultState(): State {
  const clubs = bootstrapClubs();
  return {
    clubs,
    extraMembers: [],
    removedMemberIds: [],
    session: {
      role: "superadmin",
      memberId: null,
      clubId: null,
      displayName: "Super Admin",
    },
  };
}

let state: State =
  typeof window !== "undefined"
    ? (() => {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) return { ...defaultState(), ...JSON.parse(raw) } as State;
        } catch {}
        return defaultState();
      })()
    : defaultState();

const listeners = new Set<() => void>();
const emit = () => {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useAuth() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

export function allMembers(): Member[] {
  const removed = new Set(state.removedMemberIds);
  return [...MEMBERS, ...state.extraMembers].filter((m) => !removed.has(m.id));
}

export function membersOfClub(clubName: string): Member[] {
  return allMembers().filter((m) => m.club === clubName);
}

export function getClub(id: string) {
  return state.clubs.find((c) => c.id === id);
}

export function getClubByName(name: string) {
  return state.clubs.find((c) => c.name === name);
}

export function switchSession(s: Partial<SessionUser>) {
  state = { ...state, session: { ...state.session, ...s } };
  emit();
}

export function loginAs(role: Role, memberId?: string) {
  if (role === "superadmin") {
    switchSession({ role, memberId: null, clubId: null, displayName: "Super Admin" });
    return;
  }
  const m = memberId ? allMembers().find((x) => x.id === memberId) : allMembers()[0];
  if (!m) return;
  const club = getClubByName(m.club);
  switchSession({
    role,
    memberId: m.id,
    clubId: club?.id ?? null,
    displayName: `${m.firstName} ${m.lastName[0]}.`,
  });
}

export function createClub(input: { name: string; city: string }) {
  const id = slug(input.name) || `club-${Date.now()}`;
  const club: Club = {
    id,
    name: input.name,
    city: input.city,
    gestionnaireId: null,
    openToNetwork: false,
    createdAt: new Date().toISOString(),
  };
  state = { ...state, clubs: [club, ...state.clubs] };
  emit();
  return club;
}

export function setClubOpenToNetwork(clubId: string, open: boolean) {
  state = {
    ...state,
    clubs: state.clubs.map((c) => (c.id === clubId ? { ...c, openToNetwork: open } : c)),
  };
  emit();
}

export function networkMembers(): Member[] {
  const openNames = new Set(state.clubs.filter((c) => c.openToNetwork).map((c) => c.name));
  return allMembers().filter((m) => openNames.has(m.club));
}

export function listClubs(): Club[] {
  return state.clubs;
}

export function deleteClub(id: string) {
  state = { ...state, clubs: state.clubs.filter((c) => c.id !== id) };
  emit();
}

export function setGestionnaire(clubId: string, memberId: string | null) {
  state = {
    ...state,
    clubs: state.clubs.map((c) => (c.id === clubId ? { ...c, gestionnaireId: memberId } : c)),
  };
  emit();
}

export function addMember(input: {
  firstName: string;
  lastName: string;
  role: string;
  company: string;
  sector: string;
  city: string;
  email: string;
  phone: string;
  clubName: string;
}): Member {
  const id = `${slug(input.firstName + "-" + input.lastName)}-${Date.now().toString(36)}`;
  const m: Member = {
    id,
    firstName: input.firstName,
    lastName: input.lastName,
    initials: (input.firstName[0] ?? "") + (input.lastName[0] ?? ""),
    role: input.role,
    company: input.company,
    sector: input.sector,
    city: input.city,
    coords: { x: 50, y: 50 },
    bio: "",
    tags: [],
    email: input.email,
    phone: input.phone,
    lookingFor: [],
    canOffer: [],
    joinedAt: new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    club: input.clubName,
  };
  state = { ...state, extraMembers: [m, ...state.extraMembers] };
  emit();
  return m;
}

export function removeMember(id: string) {
  state = {
    ...state,
    removedMemberIds: [...state.removedMemberIds, id],
    extraMembers: state.extraMembers.filter((m) => m.id !== id),
  };
  emit();
}
