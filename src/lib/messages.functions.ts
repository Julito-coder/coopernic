import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MessagingMember = {
  memberId: string;
  authUserId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  company: string;
};

// Returns club members with their auth.users.id (mapped via email), so the
// messenger can address recipients by their auth uid (required by RLS on
// direct_messages: auth.uid() = recipient_id).
export const listClubMembersForMessaging = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MessagingMember[]> => {
    const { supabase, userId } = context;

    // Find current user's club via their email → members row
    const { data: authUser } = await supabase.auth.getUser();
    const myEmail = authUser.user?.email?.toLowerCase();
    if (!myEmail) return [];

    const { data: me } = await supabase
      .from("members")
      .select("club_id")
      .ilike("email", myEmail)
      .maybeSingle();
    const clubId = (me as any)?.club_id;
    if (!clubId) return [];

    const { data: members, error } = await supabase
      .from("members")
      .select("id, first_name, last_name, email, role, company")
      .eq("club_id", clubId);
    if (error) throw error;

    const rows = (members ?? []).filter((m: any) => (m.email ?? "").toLowerCase() !== myEmail);
    if (rows.length === 0) return [];

    // Map email → auth user id via admin API (RLS blocks reading auth.users)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const emailToAuthId = new Map<string, string>();
    // Paginate through users; small clubs so a couple pages max
    let page = 1;
    // Safety cap
    for (let i = 0; i < 20; i++) {
      const { data, error: err } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (err) break;
      for (const u of data.users) {
        if (u.email) emailToAuthId.set(u.email.toLowerCase(), u.id);
      }
      if (data.users.length < 200) break;
      page += 1;
    }

    return rows.map((m: any) => ({
      memberId: m.id as string,
      authUserId: emailToAuthId.get(((m.email ?? "") as string).toLowerCase()) ?? null,
      firstName: (m.first_name ?? "") as string,
      lastName: (m.last_name ?? "") as string,
      email: (m.email ?? "") as string,
      role: (m.role ?? "") as string,
      company: (m.company ?? "") as string,
    }));
  });
