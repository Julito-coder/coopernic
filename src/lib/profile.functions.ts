import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const gmKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!lovableKey || !gmKey) throw new Error("Google Maps non configuré.");

  const res = await fetch(
    `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=fr`,
    {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gmKey,
      },
    },
  );
  if (res.status === 403) {
    const body = await res.text();
    console.error(`Geocode 403: ${body}`);
    throw new Error("Clé Google Maps refusée par le fournisseur.");
  }
  if (!res.ok) {
    const body = await res.text();
    console.error(`Geocode failed [${res.status}]: ${body}`);
    throw new Error(`Géocodage impossible (${res.status}).`);
  }
  const data = (await res.json()) as {
    status: string;
    results?: Array<{ geometry?: { location?: { lat: number; lng: number } } }>;
  };
  if (data.status !== "OK" || !data.results?.[0]?.geometry?.location) return null;
  const loc = data.results[0].geometry.location;
  return { lat: loc.lat, lng: loc.lng };
}

export const getMyOffice = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("members")
      .select("office_address, office_lat, office_lng, share_office_location")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      address: data?.office_address ?? "",
      lat: data?.office_lat ?? null,
      lng: data?.office_lng ?? null,
      share: !!data?.share_office_location,
    };
  });

const UpdateSchema = z.object({
  address: z.string().trim().max(300),
  share: z.boolean(),
});

export const updateMyOffice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => UpdateSchema.parse(i))
  .handler(async ({ data, context }) => {
    let lat: number | null = null;
    let lng: number | null = null;
    if (data.address.length > 0) {
      const coords = await geocode(data.address);
      if (!coords) throw new Error("Adresse introuvable. Précise ville + code postal.");
      lat = coords.lat;
      lng = coords.lng;
    }
    const { error } = await context.supabase
      .from("members")
      .update({
        office_address: data.address || null,
        office_lat: lat,
        office_lng: lng,
        share_office_location: data.share,
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, lat, lng };
  });

export const getClubMemberLocations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("members")
      .select(
        "id, first_name, last_name, role, company, office_address, office_lat, office_lng, share_office_location",
      )
      .eq("share_office_location", true)
      .not("office_lat", "is", null)
      .not("office_lng", "is", null);
    if (error) throw new Error(error.message);
    return (data ?? [])
      .filter((m) => m.id !== context.userId)
      .map((m) => ({
        id: m.id,
        firstName: m.first_name,
        lastName: m.last_name,
        role: m.role ?? "",
        company: m.company ?? "",
        address: m.office_address ?? "",
        lat: m.office_lat as number,
        lng: m.office_lng as number,
      }));
  });
