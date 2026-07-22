import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ModulesArg = z.object({
  clubId: z.string().uuid(),
  userId: z.string().uuid(),
  modules: z.array(z.string().min(1).max(40)),
});

async function assertManagerOfClub(supabase: any, userId: string, clubId: string) {
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role, club_id")
    .eq("user_id", userId);
  const rows = roles ?? [];
  if (rows.some((r: any) => r.role === "superadmin")) return;
  if (rows.some((r: any) => r.role === "gestionnaire" && r.club_id === clubId)) return;
  throw new Error("Réservé au gestionnaire du club.");
}

export const listClubModulePermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clubId: string }) =>
    z.object({ clubId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertManagerOfClub(context.supabase, context.userId, data.clubId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: perms, error } = await supabaseAdmin
      .from("user_module_permissions")
      .select("user_id, module")
      .eq("club_id", data.clubId);
    if (error) throw new Error(error.message);
    return { permissions: perms ?? [] };
  });

export const setUserModulePermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ModulesArg.parse(input))
  .handler(async ({ data, context }) => {
    await assertManagerOfClub(context.supabase, context.userId, data.clubId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("user_module_permissions")
      .delete()
      .eq("club_id", data.clubId)
      .eq("user_id", data.userId);
    if (data.modules.length) {
      const rows = data.modules.map((m) => ({
        user_id: data.userId,
        club_id: data.clubId,
        module: m,
      }));
      const { error } = await supabaseAdmin
        .from("user_module_permissions")
        .insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const listMyModulePermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_module_permissions")
      .select("club_id, module");
    return { permissions: data ?? [] };
  });
