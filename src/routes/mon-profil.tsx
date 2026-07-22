import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getMyOffice, updateMyOffice } from "@/lib/profile.functions";
import { MapPin, Save, Loader2, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/mon-profil")({
  component: MonProfilPage,
  head: () => ({
    meta: [
      { title: "Mon profil — Coopernic" },
      { name: "description", content: "Renseignez l'adresse de votre bureau et activez la carte des membres proches." },
    ],
  }),
});

const officeOpts = queryOptions({
  queryKey: ["my-office"],
  queryFn: () => getMyOffice(),
});

function MonProfilPage() {
  const fetchOffice = useServerFn(getMyOffice);
  const saveOffice = useServerFn(updateMyOffice);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({ ...officeOpts, queryFn: () => fetchOffice() });

  const [address, setAddress] = useState("");
  const [share, setShare] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setAddress(data.address ?? "");
      setShare(!!data.share);
    }
  }, [data]);

  const mut = useMutation({
    mutationFn: (vars: { address: string; share: boolean }) => saveOffice({ data: vars }),
    onSuccess: () => {
      setMsg("Adresse enregistrée.");
      qc.invalidateQueries({ queryKey: ["my-office"] });
      qc.invalidateQueries({ queryKey: ["club-locations"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-24 md:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Mon profil</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Ajoutez l'adresse de votre bureau et choisissez si vous apparaissez sur la carte des membres.
      </p>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-card">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-accent" />
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-ink-muted">
            Bureau
          </h2>
        </div>

        <label className="mt-4 block text-sm font-semibold text-foreground">
          Adresse complète
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="12 rue de la République, 06250 Mougins"
          maxLength={300}
          disabled={isLoading}
          className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/50"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Précisez la ville et le code postal pour une localisation fiable.
        </p>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-3">
          <input
            type="checkbox"
            checked={share}
            onChange={(e) => setShare(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primary"
          />
          <span className="flex-1 text-sm">
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              {share ? <Eye className="h-3.5 w-3.5 text-accent" /> : <EyeOff className="h-3.5 w-3.5" />}
              Apparaître sur la carte des membres
            </span>
            <span className="mt-0.5 block text-xs text-ink-muted">
              Les membres de votre club pourront voir votre bureau et vous proposer un café.
            </span>
          </span>
        </label>

        {msg && (
          <div className="mt-4 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-foreground">
            {msg}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={() => mut.mutate({ address: address.trim(), share })}
            disabled={mut.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </button>
          <button
            onClick={() => navigate({ to: "/carte" })}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-foreground hover:bg-secondary"
          >
            Voir la carte
          </button>
        </div>
      </section>
    </div>
  );
}
