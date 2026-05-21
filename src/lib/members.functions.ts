import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InviteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, club_id")
      .eq("user_id", userId);

    const isSuper = roles?.some((r) => r.role === "superadmin");
    let targetClubId = data.clubId;

    if (!UUID_RE.test(targetClubId)) {
      if (!data.clubName) {
        throw new Error("Club invalide : nom du club manquant.");
      }

      const { data: existingClub, error: clubErr } = await supabaseAdmin
        .from("clubs")
        .select("id")
        .eq("name", data.clubName)
        .maybeSingle();
      if (clubErr) throw new Error(clubErr.message);

      if (existingClub?.id) {
        targetClubId = existingClub.id;
      } else {
        if (!isSuper) {
          throw new Error("Ce club doit d'abord être créé par le super admin.");
        }
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

    // Authorize: must be superadmin OR gestionnaire of the target club
    const isManagerOfClub = roles?.some(
      (r) => r.role === "gestionnaire" && r.club_id === targetClubId,
    );
    if (!isSuper && !isManagerOfClub) {
      throw new Error("Not authorized to invite members for this club");
    }

    // Send Supabase invite email (creates auth user if missing)
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
      // If user already exists, fall back to a magic-link style password reset
      const msg = inviteErr?.message ?? "Invite failed";
      if (!/already/i.test(msg)) {
        throw new Error(msg);
      }
      // Look up the existing user by email via listUsers (paged)
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      const existing = list?.users.find(
        (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
      );
      if (!existing) throw new Error(msg);

      await supabaseAdmin.auth.resetPasswordForEmail(data.email, {
        redirectTo: data.redirectTo,
      });

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
