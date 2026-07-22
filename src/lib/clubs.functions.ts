import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const ALL_MODULES = [
  "annuaire",
  "messages",
  "evenements",
  "cagnottes",
  "carte",
  "recos",
] as const;

export type ModuleKey = (typeof ALL_MODULES)[number];

const ModuleEnum = z.enum(ALL_MODULES);

const CreateSchema = z.object({
  name: z.string().min(2).max(160),
  city: z.string().min(1).max(120),
  modules: z.array(ModuleEnum).min(1),
});

const UpdateModulesSchema = z.object({
  clubId: z.string().uuid(),
  modules: z.array(ModuleEnum),
});

export const createClubAsGestionnaire = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, club_id")
      .eq("user_id", userId);
    const rows = roles ?? [];
    const isSuper = rows.some((r: any) => r.role === "superadmin");
    const gestRow = rows.find((r: any) => r.role === "gestionnaire");
    if (!isSuper && !gestRow) {
      throw new Error("Réservé aux gestionnaires.");
    }
    if (!isSuper && gestRow?.club_id) {
      throw new Error("Tu gères déjà un club.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: club, error: insErr } = await supabaseAdmin
      .from("clubs")
      .insert({
        name: data.name,
        city: data.city,
        gestionnaire_id: userId,
        modules: data.modules,
      })
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);

    // Attach the gestionnaire role to this club
    if (gestRow) {
      await supabaseAdmin
        .from("user_roles")
        .update({ club_id: club.id })
        .eq("user_id", userId)
        .eq("role", "gestionnaire");
    } else if (isSuper) {
      // superadmin creating a club stays superadmin, no gestionnaire role needed
    }

    return { id: club.id };
  });

export const updateClubModules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateModulesSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, club_id")
      .eq("user_id", userId);
    const isSuper = (roles ?? []).some((r: any) => r.role === "superadmin");
    const isManager = (roles ?? []).some(
      (r: any) => r.role === "gestionnaire" && r.club_id === data.clubId,
    );
    if (!isSuper && !isManager) throw new Error("Accès refusé.");

    const { error } = await supabase
      .from("clubs")
      .update({ modules: data.modules })
      .eq("id", data.clubId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
