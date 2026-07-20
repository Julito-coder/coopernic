import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const InviteSchema = z.object({
  clubId: z.string().min(1).max(64),
  clubName: z.string().min(1).max(160).optional(),
  email: z.string().email().max(255),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.string().max(120).optional().default(""),
  company: z.string().max(160).optional().default(""),
  sector: z.string().max(120).optional().default(""),
  city: z.string().max(120).optional().default(""),
  phone: z.string().max(40).optional().default(""),
  redirectTo: z.string().url(),
});

async function assertSuperadmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "superadmin")
    .maybeSingle();
  if (!data) throw new Error("Réservé au super admin.");
}

async function isSuperOrManager(
  supabase: any,
  userId: string,
  clubId: string,
): Promise<{ isSuper: boolean; isManager: boolean }> {
  const { data } = await supabase
    .from("user_roles")
    .select("role, club_id")
    .eq("user_id", userId);
  const rows = data ?? [];
  return {
    isSuper: rows.some((r: any) => r.role === "superadmin"),
    isManager: rows.some((r: any) => r.role === "gestionnaire" && r.club_id === clubId),
  };
}

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InviteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, club_id")
      .eq("user_id", userId);

    const isSuper = roles?.some((r: any) => r.role === "superadmin");
    let targetClubId = data.clubId;

    if (!UUID_RE.test(targetClubId)) {
      if (!data.clubName) throw new Error("Club invalide : nom du club manquant.");

      const { data: existingClub, error: clubErr } = await supabaseAdmin
        .from("clubs")
        .select("id")
        .eq("name", data.clubName)
        .maybeSingle();
      if (clubErr) throw new Error(clubErr.message);

      if (existingClub?.id) {
        targetClubId = existingClub.id;
      } else {
        if (!isSuper) throw new Error("Ce club doit d'abord être créé par le super admin.");
        const { data: createdClub, error: createClubErr } = await supabaseAdmin
          .from("clubs")
          .insert({ name: data.clubName, city: data.city || "Non renseignée" })
          .select("id")
          .single();
        if (createClubErr || !createdClub) {
          throw new Error(createClubErr?.message ?? "Création du club impossible");
        }
        targetClubId = createdClub.id;
      }
    }

    const isManagerOfClub = roles?.some(
      (r: any) => r.role === "gestionnaire" && r.club_id === targetClubId,
    );
    if (!isSuper && !isManagerOfClub) {
      throw new Error("Not authorized to invite members for this club");
    }

    const { data: invite, error: inviteErr } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
        redirectTo: data.redirectTo,
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          club_id: targetClubId,
        },
      });

    if (inviteErr || !invite?.user) {
      const msg = inviteErr?.message ?? "Invite failed";
      if (!/already/i.test(msg)) throw new Error(msg);

      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = list?.users.find(
        (u: any) => u.email?.toLowerCase() === data.email.toLowerCase(),
      );
      if (!existing) throw new Error(msg);

      await supabaseAdmin.auth.resetPasswordForEmail(data.email, { redirectTo: data.redirectTo });

      await supabaseAdmin.from("members").upsert(
        {
          id: existing.id,
          club_id: targetClubId,
          email: data.email,
          first_name: data.firstName,
          last_name: data.lastName,
          role: data.role,
          company: data.company,
          sector: data.sector,
          city: data.city,
          phone: data.phone,
          invited_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

      await supabaseAdmin.from("user_roles").upsert(
        { user_id: existing.id, role: "membre", club_id: targetClubId },
        { onConflict: "user_id,role,club_id" },
      );

      return { ok: true, memberId: existing.id, reinvited: true };
    }

    const newUserId = invite.user.id;

    const { error: insertErr } = await supabaseAdmin.from("members").upsert(
      {
        id: newUserId,
        club_id: targetClubId,
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        role: data.role,
        company: data.company,
        sector: data.sector,
        city: data.city,
        phone: data.phone,
        invited_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (insertErr) throw new Error(insertErr.message);

    const { error: roleErr } = await supabaseAdmin.from("user_roles").upsert(
      { user_id: newUserId, role: "membre", club_id: targetClubId },
      { onConflict: "user_id,role,club_id" },
    );
    if (roleErr) throw new Error(roleErr.message);

    return { ok: true, memberId: newUserId, reinvited: false };
  });

// ---------------------------------------------------------------------------
// Renvoyer les accès (super admin OU gestionnaire du club du membre)
// ---------------------------------------------------------------------------

const ResendSchema = z.object({
  email: z.string().email().max(255),
  memberClubId: z.string().uuid().nullable().optional(),
  redirectTo: z.string().url(),
});

export const resendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ResendSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { isSuper, isManager } = await isSuperOrManager(
      supabase,
      userId,
      data.memberClubId ?? "",
    );
    if (!isSuper && !isManager) {
      throw new Error("Non autorisé à renvoyer les accès pour ce membre.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(data.email, {
      redirectTo: data.redirectTo,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Changer le rôle d'un membre (super admin uniquement)
// ---------------------------------------------------------------------------

const RoleEnum = z.enum(["membre", "gestionnaire", "superadmin"]);

const SetRoleSchema = z.object({
  userId: z.string().uuid(),
  clubId: z.string().uuid().nullable(),
  role: RoleEnum,
});

export const setMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SetRoleSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { isSuper, isManager } = await isSuperOrManager(
      context.supabase,
      context.userId,
      data.clubId ?? "",
    );
    if (!isSuper) {
      // Un gestionnaire peut promouvoir/rétrograder au sein de SON club uniquement,
      // et jamais attribuer le rôle superadmin.
      if (!isManager) throw new Error("Non autorisé.");
      if (data.role === "superadmin") throw new Error("Réservé au super admin.");
      if (!data.clubId) throw new Error("Club requis.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Superadmin est un rôle global (sans club)
    const clubId = data.role === "superadmin" ? null : data.clubId;

    if (data.role === "gestionnaire") {
      if (!clubId) throw new Error("Un gestionnaire doit être rattaché à un club.");
      // Un seul gestionnaire par club : retirer l'ancien rôle gestionnaire
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("role", "gestionnaire")
        .eq("club_id", clubId);
      await supabaseAdmin
        .from("clubs")
        .update({ gestionnaire_id: data.userId })
        .eq("id", clubId);
    }

    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: data.userId, role: data.role, club_id: clubId },
        { onConflict: "user_id,role,club_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const RevokeSchema = z.object({
  userId: z.string().uuid(),
  clubId: z.string().uuid().nullable(),
  role: RoleEnum,
});

export const revokeMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RevokeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { isSuper, isManager } = await isSuperOrManager(
      context.supabase,
      context.userId,
      data.clubId ?? "",
    );
    if (!isSuper) {
      if (!isManager) throw new Error("Non autorisé.");
      if (data.role === "superadmin") throw new Error("Réservé au super admin.");
      if (!data.clubId) throw new Error("Club requis.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", data.role);
    q = data.clubId ? q.eq("club_id", data.clubId) : q.is("club_id", null);
    const { error } = await q;
    if (error) throw new Error(error.message);

    if (data.role === "gestionnaire" && data.clubId) {
      await supabaseAdmin
        .from("clubs")
        .update({ gestionnaire_id: null })
        .eq("id", data.clubId)
        .eq("gestionnaire_id", data.userId);
    }
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Retirer un membre d'un club (super admin OU gestionnaire du club)
// ---------------------------------------------------------------------------

const RemoveSchema = z.object({
  userId: z.string().uuid(),
  clubId: z.string().uuid(),
});

export const removeMemberFromClub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RemoveSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { isSuper, isManager } = await isSuperOrManager(
      context.supabase,
      context.userId,
      data.clubId,
    );
    if (!isSuper && !isManager) throw new Error("Non autorisé.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("club_id", data.clubId);
    await supabaseAdmin
      .from("members")
      .delete()
      .eq("id", data.userId)
      .eq("club_id", data.clubId);
    await supabaseAdmin
      .from("clubs")
      .update({ gestionnaire_id: null })
      .eq("id", data.clubId)
      .eq("gestionnaire_id", data.userId);
    return { ok: true };
  });
