export type Member = {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
  role: string;
  company: string;
  sector: string;
  city: string;
  coords: { x: number; y: number }; // normalized 0-100 within France SVG
  bio: string;
  tags: string[];
  email: string;
  phone: string;
  linkedin?: string;
  website?: string;
  lookingFor: string[];
  canOffer: string[];
  joinedAt: string;
  club: string;
};

export const SECTORS = [
  "Tech & Digital",
  "Conseil & Stratégie",
  "Finance",
  "Marketing & Com",
  "Immobilier",
  "BTP & Industrie",
  "Santé & Bien-être",
  "Juridique",
  "Formation",
];

export const CITIES = [
  "Paris", "Lyon", "Marseille", "Bordeaux", "Toulouse",
  "Nantes", "Lille", "Strasbourg", "Nice", "Rennes",
];

export const MEMBERS: Member[] = [
  {
    id: "amelie-rousseau",
    firstName: "Amélie", lastName: "Rousseau", initials: "AR",
    role: "Fondatrice & CEO", company: "Northwind Studio",
    sector: "Tech & Digital", city: "Paris",
    coords: { x: 52, y: 28 },
    bio: "Studio produit qui aide les scale-ups B2B à passer du MVP au million d'ARR. 12 ans dans le SaaS, 3 sorties.",
    tags: ["SaaS", "Product", "B2B", "Scale-up"],
    email: "amelie@northwind.studio", phone: "+33 6 12 34 56 78",
    linkedin: "amelierousseau", website: "northwind.studio",
    lookingFor: ["Expert RGPD pour audit annuel", "Comptable spécialisé holdings"],
    canOffer: ["Mentorat product", "Intros écosystème SaaS FR"],
    joinedAt: "Mars 2024", club: "Cercle Vendôme",
  },
  {
    id: "karim-benali",
    firstName: "Karim", lastName: "Benali", initials: "KB",
    role: "Avocat associé", company: "Benali & Partners",
    sector: "Juridique", city: "Lyon",
    coords: { x: 65, y: 52 },
    bio: "Cabinet d'affaires spécialisé M&A et levées de fonds. Accompagne 40+ deals/an entre 2 et 50 M€.",
    tags: ["M&A", "Levées", "Corporate", "Fiscalité"],
    email: "k.benali@benali-partners.fr", phone: "+33 4 78 11 22 33",
    linkedin: "karimbenali",
    lookingFor: ["Banquier d'affaires mid-cap"],
    canOffer: ["Conseil juridique deals", "Pre-vetting term sheets"],
    joinedAt: "Janvier 2023", club: "Cercle Vendôme",
  },
  {
    id: "sophie-marchand",
    firstName: "Sophie", lastName: "Marchand", initials: "SM",
    role: "Directrice Financière", company: "Atelier Marchand",
    sector: "Finance", city: "Bordeaux",
    coords: { x: 32, y: 62 },
    bio: "DAF externalisée pour ETI viticoles et agro-alimentaires. Spécialiste cash-flow et financements bancaires.",
    tags: ["DAF", "Cash-flow", "ETI", "Agroalimentaire"],
    email: "sophie@atelier-marchand.fr", phone: "+33 5 56 44 33 22",
    lookingFor: ["Expert export Asie"],
    canOffer: ["Audit financier flash", "Intros banques régionales"],
    joinedAt: "Septembre 2023", club: "Club Aquitaine Pro",
  },
  {
    id: "thomas-leclerc",
    firstName: "Thomas", lastName: "Leclerc", initials: "TL",
    role: "Architecte DPLG", company: "Leclerc Architecture",
    sector: "BTP & Industrie", city: "Nantes",
    coords: { x: 28, y: 42 },
    bio: "Agence d'architecture tertiaire — bureaux, retail, hôtellerie. 25 projets livrés en 2024.",
    tags: ["Tertiaire", "Retail", "Hôtellerie", "RE2020"],
    email: "thomas@leclerc-archi.fr", phone: "+33 2 40 55 66 77",
    website: "leclerc-archi.fr",
    lookingFor: ["Bureau d'études thermique RE2020"],
    canOffer: ["Conseil aménagement bureaux", "Réseau MOE Grand Ouest"],
    joinedAt: "Mai 2024", club: "Club Loire Business",
  },
  {
    id: "isabelle-fontaine",
    firstName: "Isabelle", lastName: "Fontaine", initials: "IF",
    role: "Coach exécutive", company: "Fontaine Coaching",
    sector: "Formation", city: "Marseille",
    coords: { x: 62, y: 75 },
    bio: "Coaching de dirigeants et comités de direction. Certifiée HEC, 600+ heures d'accompagnement.",
    tags: ["Coaching", "Leadership", "Codir", "Transition"],
    email: "isabelle@fontaine-coaching.com", phone: "+33 4 91 22 33 44",
    linkedin: "isabellefontaine",
    lookingFor: ["Partenaires assessment 360"],
    canOffer: ["Séance découverte", "Conférences leadership"],
    joinedAt: "Février 2024", club: "Club Méditerranée Affaires",
  },
  {
    id: "vincent-dubois",
    firstName: "Vincent", lastName: "Dubois", initials: "VD",
    role: "Directeur commercial", company: "Dubois Immobilier",
    sector: "Immobilier", city: "Toulouse",
    coords: { x: 45, y: 75 },
    bio: "Promotion immobilière tertiaire et résidentielle haut de gamme. 180 lots/an sur Occitanie.",
    tags: ["Promotion", "Tertiaire", "Résidentiel", "Occitanie"],
    email: "v.dubois@dubois-immo.fr", phone: "+33 5 61 88 99 00",
    lookingFor: ["Investisseurs blocs résidentiels"],
    canOffer: ["Opportunités off-market", "Réseau notaires Sud-Ouest"],
    joinedAt: "Novembre 2023", club: "Club Occitanie Pro",
  },
  {
    id: "claire-petit",
    firstName: "Claire", lastName: "Petit", initials: "CP",
    role: "Fondatrice", company: "Petit & Co. Branding",
    sector: "Marketing & Com", city: "Lille",
    coords: { x: 52, y: 12 },
    bio: "Agence de branding pour marques premium retail et lifestyle. Ex-Saatchi, ex-Publicis.",
    tags: ["Branding", "Premium", "Retail", "Lifestyle"],
    email: "claire@petit-co.fr", phone: "+33 3 20 11 22 33",
    website: "petit-co.fr",
    lookingFor: ["Studio packaging premium"],
    canOffer: ["Audit identité de marque", "Workshop positioning"],
    joinedAt: "Avril 2024", club: "Club Hauts-de-France",
  },
  {
    id: "marc-vidal",
    firstName: "Marc", lastName: "Vidal", initials: "MV",
    role: "Cardiologue & investisseur", company: "Cabinet Vidal / VidalCare",
    sector: "Santé & Bien-être", city: "Nice",
    coords: { x: 78, y: 78 },
    bio: "Praticien hospitalier et business angel sur la healthtech. 18 participations actives.",
    tags: ["Healthtech", "Business Angel", "Medtech"],
    email: "marc.vidal@vidalcare.fr", phone: "+33 4 93 44 55 66",
    linkedin: "marcvidal",
    lookingFor: ["Deal flow seed healthtech FR/EU"],
    canOffer: ["Ticket 25-100k€", "Expertise clinique"],
    joinedAt: "Juin 2023", club: "Club Côte d'Azur Business",
  },
  {
    id: "leila-haddad",
    firstName: "Leïla", lastName: "Haddad", initials: "LH",
    role: "Consultante senior", company: "Haddad Strategy",
    sector: "Conseil & Stratégie", city: "Paris",
    coords: { x: 53, y: 26 },
    bio: "Conseil en stratégie pour ETI familiales — transmission, diversification, internationalisation.",
    tags: ["Stratégie", "ETI", "Transmission", "International"],
    email: "leila@haddad-strategy.com", phone: "+33 1 44 55 66 77",
    lookingFor: ["Partenaires conseil RH transformation"],
    canOffer: ["Diagnostic stratégique 360", "Réseau ETI familiales"],
    joinedAt: "Octobre 2023", club: "Cercle Vendôme",
  },
  {
    id: "julien-moreau",
    firstName: "Julien", lastName: "Moreau", initials: "JM",
    role: "CTO & co-fondateur", company: "Moreau & Sons Tech",
    sector: "Tech & Digital", city: "Rennes",
    coords: { x: 25, y: 32 },
    bio: "Plateforme SaaS B2B pour les artisans. 8000 clients, série A en cours.",
    tags: ["SaaS", "Artisans", "Mobile", "PME"],
    email: "julien@moreau-sons.tech", phone: "+33 2 99 33 44 55",
    website: "moreau-sons.tech",
    lookingFor: ["Lead investor série A"],
    canOffer: ["Retours d'XP tech-debt", "Recos recrutement dev FR"],
    joinedAt: "Juillet 2024", club: "Club Bretagne Entrepreneurs",
  },
  {
    id: "elodie-bernard",
    firstName: "Élodie", lastName: "Bernard", initials: "EB",
    role: "Fondatrice", company: "Maison Bernard",
    sector: "Marketing & Com", city: "Strasbourg",
    coords: { x: 82, y: 28 },
    bio: "Agence d'influence et RP pour marques food et art de vivre. Réseau de 500 créateurs activables.",
    tags: ["Influence", "RP", "Food", "Lifestyle"],
    email: "elodie@maison-bernard.fr", phone: "+33 3 88 22 11 00",
    lookingFor: ["Photographe still-life packaging"],
    canOffer: ["Activations créateurs", "Stratégie RP lancement"],
    joinedAt: "Décembre 2023", club: "Club Grand Est Pro",
  },
  {
    id: "pierre-laurent",
    firstName: "Pierre", lastName: "Laurent", initials: "PL",
    role: "Notaire associé", company: "Étude Laurent & Cie",
    sector: "Juridique", city: "Paris",
    coords: { x: 54, y: 29 },
    bio: "Étude notariale spécialisée patrimoine privé HNW et immobilier d'investissement.",
    tags: ["Patrimoine", "HNW", "Immobilier", "Succession"],
    email: "p.laurent@etude-laurent.fr", phone: "+33 1 42 88 99 11",
    lookingFor: ["Wealth managers indépendants"],
    canOffer: ["Conseil structuration patrimoniale", "Réseau family offices"],
    joinedAt: "Août 2023", club: "Cercle Vendôme",
  },
];

export type ConversationPreview = {
  id: string;
  memberId: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
};

export type Message = {
  id: string;
  from: "me" | "them";
  text: string;
  at: string;
};

export const CONVERSATIONS: ConversationPreview[] = [
  { id: "c1", memberId: "karim-benali", lastMessage: "Parfait, je t'envoie le term sheet ce soir.", lastAt: "10:42", unread: 2 },
  { id: "c2", memberId: "sophie-marchand", lastMessage: "On cale 30 min mardi prochain ?", lastAt: "Hier", unread: 0 },
  { id: "c3", memberId: "amelie-rousseau", lastMessage: "Merci pour l'intro à Mathieu 🙏", lastAt: "Lun", unread: 0 },
  { id: "c4", memberId: "marc-vidal", lastMessage: "Le pitch deck est prêt pour relecture.", lastAt: "23 mai", unread: 1 },
  { id: "c5", memberId: "claire-petit", lastMessage: "Je te partage le moodboard demain.", lastAt: "21 mai", unread: 0 },
  { id: "c6", memberId: "julien-moreau", lastMessage: "Top, on se voit au prochain dîner.", lastAt: "18 mai", unread: 0 },
];

export const MESSAGE_THREADS: Record<string, Message[]> = {
  c1: [
    { id: "m1", from: "them", text: "Salut ! On m'a dit que tu cherchais un avocat M&A pour ta cession.", at: "10:12" },
    { id: "m2", from: "me", text: "Oui exact, Amélie m'a recommandée vers toi. Tu as 15 min cette semaine ?", at: "10:18" },
    { id: "m3", from: "them", text: "Avec plaisir. Jeudi 14h ?", at: "10:30" },
    { id: "m4", from: "me", text: "Parfait, je bloque. On fait visio ?", at: "10:35" },
    { id: "m5", from: "them", text: "Parfait, je t'envoie le term sheet ce soir.", at: "10:42" },
  ],
  c2: [
    { id: "m1", from: "me", text: "Sophie, j'aurais besoin d'un regard DAF sur notre prévisionnel.", at: "Hier 09:20" },
    { id: "m2", from: "them", text: "On cale 30 min mardi prochain ?", at: "Hier 14:10" },
  ],
  c3: [
    { id: "m1", from: "them", text: "Merci pour l'intro à Mathieu 🙏", at: "Lun 17:02" },
  ],
  c4: [
    { id: "m1", from: "them", text: "Le pitch deck est prêt pour relecture.", at: "23 mai 11:00" },
  ],
  c5: [
    { id: "m1", from: "them", text: "Je te partage le moodboard demain.", at: "21 mai 18:30" },
  ],
  c6: [
    { id: "m1", from: "them", text: "Top, on se voit au prochain dîner.", at: "18 mai 20:15" },
  ],
};

export const getMember = (id: string) => MEMBERS.find((m) => m.id === id);
