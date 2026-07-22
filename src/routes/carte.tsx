import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { getClubMemberLocations } from "@/lib/profile.functions";
import { Coffee, MapPin, Navigation, Loader2 } from "lucide-react";

export const Route = createFileRoute("/carte")({
  component: CartePage,
  head: () => ({
    meta: [
      { title: "Carte des membres — Coopernic" },
      { name: "description", content: "Trouvez les membres proches de vous et proposez un café." },
    ],
  }),
});

type MemberLoc = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  company: string;
  address: string;
  lat: number;
  lng: number;
  distanceKm?: number;
};

declare global {
  interface Window {
    google?: any;
    __coopernicInitMap?: () => void;
  }
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function loadGoogleMaps(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("SSR"));
    if (window.google?.maps) return resolve();
    const existing = document.getElementById("gmaps-script");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Google Maps load failed")));
      return;
    }
    window.__coopernicInitMap = () => resolve();
    const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
    if (!key) return reject(new Error("Clé Google Maps navigateur manquante."));
    const s = document.createElement("script");
    s.id = "gmaps-script";
    s.async = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__coopernicInitMap${channel ? `&channel=${channel}` : ""}`;
    s.onerror = () => reject(new Error("Google Maps load failed"));
    document.head.appendChild(s);
  });
}

function CartePage() {
  const fetchMembers = useServerFn(getClubMemberLocations);
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["club-locations"],
    queryFn: () => fetchMembers(),
  });

  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "asking" | "denied" | "ok" | "unsupported">(
    "idle",
  );
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const meMarkerRef = useRef<any>(null);

  // Distances
  const withDistance: MemberLoc[] = me
    ? members
        .map((m) => ({ ...m, distanceKm: haversineKm(me, { lat: m.lat, lng: m.lng }) }))
        .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
    : members;

  // Init map
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !mapRef.current || !window.google) return;
        const center =
          me ?? (members.length ? { lat: members[0].lat, lng: members[0].lng } : { lat: 46.6, lng: 2.5 });
        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
          center,
          zoom: me ? 12 : 6,
          disableDefaultUI: false,
          streetViewControl: false,
          mapTypeControl: false,
        });
        setMapReady(true);
      })
      .catch((e) => setMapError(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Markers
  useEffect(() => {
    if (!mapReady || !window.google || !mapInstanceRef.current) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    const bounds = new window.google.maps.LatLngBounds();
    let has = false;
    for (const m of members) {
      const marker = new window.google.maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        map: mapInstanceRef.current,
        title: `${m.firstName} ${m.lastName}`,
      });
      marker.addListener("click", () => setSelected(m.id));
      markersRef.current.push(marker);
      bounds.extend(marker.getPosition());
      has = true;
    }
    if (me) {
      if (meMarkerRef.current) meMarkerRef.current.setMap(null);
      meMarkerRef.current = new window.google.maps.Marker({
        position: me,
        map: mapInstanceRef.current,
        title: "Ma position",
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#0b1428",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
      });
      bounds.extend(meMarkerRef.current.getPosition());
      has = true;
    }
    if (has) {
      if (markersRef.current.length + (me ? 1 : 0) === 1) {
        mapInstanceRef.current.setCenter(bounds.getCenter());
        mapInstanceRef.current.setZoom(13);
      } else {
        mapInstanceRef.current.fitBounds(bounds, 60);
      }
    }
  }, [mapReady, members, me]);

  function askLocation() {
    if (!("geolocation" in navigator)) {
      setGeoStatus("unsupported");
      return;
    }
    setGeoStatus("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus("ok");
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const selectedMember = withDistance.find((m) => m.id === selected);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-24 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Carte</div>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            Membres proches de vous
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            Localisez les membres de votre club et proposez un café à ceux qui sont autour.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={askLocation}
            disabled={geoStatus === "asking"}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {geoStatus === "asking" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            {geoStatus === "ok" ? "Position détectée" : "Me localiser"}
          </button>
          <Link
            to="/mon-profil"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold hover:bg-secondary"
          >
            <MapPin className="h-4 w-4" />
            Mon adresse
          </Link>
        </div>
      </div>

      {geoStatus === "denied" && (
        <div className="mt-4 rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground">
          Autorisation de localisation refusée. Vous pouvez quand même parcourir la carte.
        </div>
      )}
      {geoStatus === "unsupported" && (
        <div className="mt-4 rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground">
          Votre navigateur ne supporte pas la géolocalisation.
        </div>
      )}
      {mapError && (
        <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {mapError}
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-card">
          <div ref={mapRef} className="h-[420px] w-full md:h-[560px]" />
          {(!mapReady || isLoading) && !mapError && (
            <div className="flex items-center justify-center gap-2 py-3 text-xs text-ink-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Chargement de la carte…
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-border bg-surface p-5 shadow-card">
          <h3 className="font-display text-lg font-bold text-foreground">
            {me ? "Les plus proches" : "Membres sur la carte"}
          </h3>
          <p className="mt-1 text-xs text-ink-muted">
            {members.length} membre{members.length > 1 ? "s" : ""} partage{members.length > 1 ? "nt" : ""} son bureau.
          </p>
          {members.length === 0 && !isLoading && (
            <div className="mt-4 rounded-xl border border-dashed border-border p-4 text-center text-xs text-ink-muted">
              Personne n'a encore partagé son adresse.{" "}
              <Link to="/mon-profil" className="font-semibold text-accent underline">
                Renseignez la vôtre
              </Link>{" "}
              pour lancer le mouvement.
            </div>
          )}
          <ul className="mt-4 max-h-[500px] space-y-2 overflow-y-auto pr-1">
            {withDistance.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => {
                    setSelected(m.id);
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.panTo({ lat: m.lat, lng: m.lng });
                      mapInstanceRef.current.setZoom(14);
                    }
                  }}
                  className={
                    "flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors " +
                    (selected === m.id ? "bg-secondary" : "hover:bg-secondary/60")
                  }
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                    {m.firstName[0]}{m.lastName[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {m.firstName} {m.lastName}
                    </div>
                    <div className="truncate text-xs text-ink-muted">
                      {m.company || m.role || m.address}
                    </div>
                  </div>
                  {typeof m.distanceKm === "number" && (
                    <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                      {m.distanceKm < 1
                        ? `${Math.round(m.distanceKm * 1000)} m`
                        : `${m.distanceKm.toFixed(1)} km`}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>

          {selectedMember && (
            <div className="mt-4 rounded-2xl border border-border bg-background p-4">
              <div className="font-display text-sm font-bold text-foreground">
                {selectedMember.firstName} {selectedMember.lastName}
              </div>
              {selectedMember.company && (
                <div className="text-xs text-accent">{selectedMember.company}</div>
              )}
              {selectedMember.address && (
                <div className="mt-1 flex items-start gap-1 text-xs text-ink-muted">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{selectedMember.address}</span>
                </div>
              )}
              <Link
                to="/messages"
                search={{ to: selectedMember.id, coffee: "1" } as any}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground shadow-sm transition-transform hover:-translate-y-0.5"
              >
                <Coffee className="h-4 w-4" />
                Proposer un café
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
