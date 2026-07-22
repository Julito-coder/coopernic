import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/use-session";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the list of active module keys for the current user's club.
 * - superadmin -> null (means "all modules active", no gating)
 * - no club -> null
 * - loading -> undefined
 */
export function useClubModules(): string[] | null | undefined {
  const { user, roles, managedClubId } = useSession();
  const isSuper = roles?.includes("superadmin");
  const userId = user?.id;

  const q = useQuery({
    queryKey: ["user-modules", userId ?? "none"],
    enabled: !!userId && !isSuper,
    queryFn: async (): Promise<string[] | null> => {
      let clubId = managedClubId;
      if (!clubId && user?.email) {
        const { data } = await supabase
          .from("members")
          .select("club_id")
          .ilike("email", user.email.toLowerCase())
          .maybeSingle();
        clubId = data?.club_id ?? null;
      }
      if (!clubId) return null;
      const { data } = await supabase
        .from("clubs")
        .select("modules")
        .eq("id", clubId)
        .maybeSingle();
      return (data?.modules as string[] | null) ?? null;
    },
  });

  if (isSuper) return null;
  return q.data;
}

export function useHasModule(key: string): boolean {
  const mods = useClubModules();
  if (mods === null) return true; // superadmin or unknown club -> allow
  if (mods === undefined) return true; // still loading -> optimistic
  return mods.includes(key);
}
