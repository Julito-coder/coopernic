import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  getMyOffice,
  updateMyOffice,
  getMyProfile,
  updateMyProfile,
} from "@/lib/profile.functions";
import {
  MapPin,
  Save,
  Loader2,
  Eye,
  EyeOff,
  User,
  Globe,
  Linkedin,
  Phone,
  Building2,
  Tag,
  X,
} from "lucide-react";

export const Route = createFileRoute("/mon-profil")({
  component: MonProfilPage,
  head: () => ({
    meta: [
      { title: "Mon profil — Coopernic" },
      {
        name: "description",
        content:
          "Composez votre fiche professionnelle : bio, site web, LinkedIn et informations utiles pour vos contacts du club.",
      },
    ],
  }),
});

function MonProfilPage() {
  const fetchOffice = useServerFn(getMyOffice);
  const saveOffice = useServerFn(updateMyOffice);
  const fetchProfile = useServerFn(getMyProfile);
  const saveProfile = useServerFn(updateMyProfile);
  const qc = useQueryClient();
  const navigate = useNavigate();

  // -------- Bureau
  const officeQ = useQuery({ queryKey: ["my-office"], queryFn: () => fetchOffice() });
  const [address, setAddress] = useState("");
  const [share, setShare] = useState(false);
  const [officeMsg, setOfficeMsg] = useState<string | null>(null);
  useEffect(() => {
    if (officeQ.data) {
      setAddress(officeQ.data.address ?? "");
      setShare(!!officeQ.data.share);
    }
  }, [officeQ.data]);

  const officeMut = useMutation({
    mutationFn: (vars: { address: string; share: boolean }) => saveOffice({ data: vars }),
    onSuccess: () => {
      setOfficeMsg("Adresse enregistrée.");
      qc.invalidateQueries({ queryKey: ["my-office"] });
      qc.invalidateQueries({ queryKey: ["club-locations"] });
    },
    onError: (e: Error) => setOfficeMsg(e.message),
  });

  // -------- Fiche pro
  const profileQ = useQuery({ queryKey: ["my-profile"], queryFn: () => fetchProfile() });
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [sector, setSector] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [canOffer, setCanOffer] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [lookInput, setLookInput] = useState("");
  const [offerInput, setOfferInput] = useState("");
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  useEffect(() => {
    const p = profileQ.data;
    if (!p) return;
    setFirstName(p.firstName);
    setLastName(p.lastName);
    setRole(p.role);
    setCompany(p.company);
    setSector(p.sector);
    setCity(p.city);
    setPhone(p.phone);
    setBio(p.bio);
    setWebsite(p.website);
    setLinkedinUrl(p.linkedinUrl);
    setTags(p.tags);
    setLookingFor(p.lookingFor);
    setCanOffer(p.canOffer);
  }, [profileQ.data]);

  const profileMut = useMutation({
    mutationFn: () =>
      saveProfile({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role: role.trim(),
          company: company.trim(),
          sector: sector.trim(),
          city: city.trim(),
          phone: phone.trim(),
          bio: bio.trim(),
          website: website.trim(),
          linkedinUrl: linkedinUrl.trim(),
          tags,
          lookingFor,
          canOffer,
        },
      }),
    onSuccess: () => {
      setProfileMsg("Fiche mise à jour.");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      qc.invalidateQueries({ queryKey: ["messages", "club-members"] });
    },
    onError: (e: Error) => setProfileMsg(e.message),
  });

  const addChip = (
    list: string[],
    setList: (v: string[]) => void,
    input: string,
    setInput: (v: string) => void,
  ) => {
    const v = input.trim();
    if (!v || list.includes(v)) return;
    setList([...list, v]);
    setInput("");
  };

  const removeChip = (list: string[], setList: (v: string[]) => void, i: number) => {
    setList(list.filter((_, idx) => idx !== i));
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-24 md:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Mon profil</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Votre fiche pro est visible par les autres membres via l'annuaire.
      </p>

      {/* Fiche pro */}
      <section className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-card">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-accent" />
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-ink-muted">
            Fiche professionnelle
          </h2>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Prénom">
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} maxLength={80} />
          </Field>
          <Field label="Nom">
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} maxLength={80} />
          </Field>
          <Field label="Poste / rôle">
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Directeur commercial" className={inputCls} maxLength={120} />
          </Field>
          <Field label="Société">
            <input value={company} onChange={(e) => setCompany(e.target.value)} className={inputCls} maxLength={160} />
          </Field>
          <Field label="Secteur">
            <input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Immobilier, SaaS…" className={inputCls} maxLength={120} />
          </Field>
          <Field label="Ville">
            <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} maxLength={120} />
          </Field>
          <Field label="Téléphone" icon={<Phone className="h-3.5 w-3.5" />}>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+33 6 …" className={inputCls} maxLength={40} />
          </Field>
          <Field label="Site web" icon={<Globe className="h-3.5 w-3.5" />}>
            <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" className={inputCls} maxLength={300} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="LinkedIn" icon={<Linkedin className="h-3.5 w-3.5" />}>
              <input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/…" className={inputCls} maxLength={300} />
            </Field>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={5}
            maxLength={1200}
            placeholder="Présentez votre parcours, vos expertises, ce qui vous rend unique…"
            className={inputCls + " resize-y"}
          />
          <div className="mt-1 text-[11px] text-muted-foreground">{bio.length}/1200</div>
        </div>

        <ChipEditor
          label="Mots-clés"
          icon={<Tag className="h-3.5 w-3.5" />}
          items={tags}
          input={tagInput}
          setInput={setTagInput}
          onAdd={() => addChip(tags, setTags, tagInput, setTagInput)}
          onRemove={(i) => removeChip(tags, setTags, i)}
          placeholder="Ex: expert-comptable, TPE, Nice"
        />

        <ChipEditor
          label="Je cherche"
          items={lookingFor}
          input={lookInput}
          setInput={setLookInput}
          onAdd={() => addChip(lookingFor, setLookingFor, lookInput, setLookInput)}
          onRemove={(i) => removeChip(lookingFor, setLookingFor, i)}
          placeholder="Ex: leads dirigeants industrie"
        />

        <ChipEditor
          label="Je peux apporter"
          items={canOffer}
          input={offerInput}
          setInput={setOfferInput}
          onAdd={() => addChip(canOffer, setCanOffer, offerInput, setOfferInput)}
          onRemove={(i) => removeChip(canOffer, setCanOffer, i)}
          placeholder="Ex: mise en relation banques"
        />

        {profileMsg && (
          <div className="mt-4 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-foreground">
            {profileMsg}
          </div>
        )}

        <div className="mt-5">
          <button
            onClick={() => profileMut.mutate()}
            disabled={profileMut.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {profileMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer la fiche
          </button>
        </div>
      </section>

      {/* Bureau */}
      <section className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-card">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-accent" />
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-ink-muted">
            Bureau
          </h2>
        </div>

        <label className="mt-4 block text-sm font-semibold text-foreground">Adresse complète</label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="12 rue de la République, 06250 Mougins"
          maxLength={300}
          disabled={officeQ.isLoading}
          className={inputCls}
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

        {officeMsg && (
          <div className="mt-4 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-foreground">
            {officeMsg}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={() => officeMut.mutate({ address: address.trim(), share })}
            disabled={officeMut.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {officeMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </button>
          <button
            onClick={() => navigate({ to: "/carte" })}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-foreground hover:bg-secondary"
          >
            <Building2 className="h-4 w-4" /> Voir la carte
          </button>
        </div>
      </section>
    </div>
  );
}

const inputCls =
  "mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50";

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

function ChipEditor({
  label,
  icon,
  items,
  input,
  setInput,
  onAdd,
  onRemove,
  placeholder,
}: {
  label: string;
  icon?: React.ReactNode;
  items: string[];
  input: string;
  setInput: (v: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  placeholder?: string;
}) {
  return (
    <div className="mt-4">
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {icon}
        {label}
      </label>
      <div className="mt-1 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder={placeholder}
          className={inputCls + " flex-1"}
          maxLength={80}
        />
        <button
          type="button"
          onClick={onAdd}
          className="rounded-xl bg-secondary px-4 text-sm font-semibold text-foreground hover:bg-secondary/70"
        >
          Ajouter
        </button>
      </div>
      {items.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((t, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent"
            >
              {t}
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="rounded-full p-0.5 hover:bg-accent/20"
                aria-label="Retirer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
