import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "superadmin" | "gestionnaire" | "membre";

export type SessionState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  managedClubId: string | null;
};

const initial: SessionState = {
  loading: true,
  session: null,
  user: null,
  roles: [],
  managedClubId: null,
};

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>(initial);

  useEffect(() => {
    let active = true;

    async function loadRoles(userId: string) {
      const { data } = await supabase
        .from("user_roles")
        .select("role, club_id")
        .eq("user_id", userId);
      if (!active) return;
      const roles = (data ?? []).map((r) => r.role as AppRole);
      const managed = (data ?? []).find((r) => r.role === "gestionnaire");
      setState((s) => ({
        ...s,
        roles,
        managedClubId: managed?.club_id ?? null,
        loading: false,
      }));
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        setState((s) => ({
          ...s,
          session,
          user: session?.user ?? null,
          loading: !!session, // if session exists, we still need to load roles
          roles: session ? s.roles : [],
          managedClubId: session ? s.managedClubId : null,
        }));
        if (session?.user) {
          // defer to avoid auth deadlocks
          setTimeout(() => loadRoles(session.user.id), 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const session = data.session;
      setState((s) => ({
        ...s,
        session,
        user: session?.user ?? null,
        loading: !!session,
      }));
      if (session?.user) loadRoles(session.user.id);
      else setState((s) => ({ ...s, loading: false }));
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}

export function hasRole(state: SessionState, role: AppRole) {
  return state.roles.includes(role);
}

export async function signOut() {
  await supabase.auth.signOut();
}
