import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const InviteSchema = z.object({
  clubId: z.string().min(1).max(64),
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

    // Authorize: must be superadmin OR gestionnaire of the target club
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, club_id")
      .eq("user_id", userId);

    const isSuper = roles?.some((r) => r.role === "superadmin");
    const isManagerOfClub = roles?.some(
      (r) => r.role === "gestionnaire" && r.club_id === data.clubId,
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
          club_id: data.clubId,
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
          club_id: data.clubId,
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

      return { ok: true, memberId: existing.id, reinvited: true };
    }

    const newUserId = invite.user.id;

    const { error: insertErr } = await supabaseAdmin.from("members").upsert(
      {
        id: newUserId,
        club_id: data.clubId,
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

    return { ok: true, memberId: newUserId, reinvited: false };
  });
