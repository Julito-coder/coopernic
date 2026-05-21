## Objectif

Permettre à un gestionnaire de club de créer une **cagnotte** (autonome ou liée à un évènement) pour financer une dépense collective. Les membres du club paient leur quote-part en ligne via Stripe, **une seule fois par membre**, avec **division dynamique** : tant que la cagnotte est ouverte, la part = `objectif ÷ nombre de membres ayant cliqué "je participe"` (recalculée à chaque nouvel inscrit, jusqu'à clôture).

## Outil retenu

**Stripe intégré Lovable** (`enable_stripe_payments`). Avantages :
- Aucun compte Stripe à créer côté gestionnaire, KYC géré par Lovable.
- Liens de paiement (Stripe Checkout) générables par cagnotte.
- Webhooks signés → on suit en temps réel les paiements dans l'app.
- Frais ~1,5% + 0,25 € (CB UE). Pas de tax handling nécessaire (cagnotte = collecte interne au club, pas une vente).

Alternatives écartées : Leetchi/HelloAsso (lien externe, pas de contrôle "1 paiement/membre" ni split auto dans l'app) ; Lydia (pas d'API marchand grand public).

## Parcours utilisateur

**Gestionnaire (`/club`, nouvel onglet "Cagnottes")**
1. Crée une cagnotte : titre, description, objectif (€), date de clôture, évènement lié (optionnel — liste les events du club), visibilité (tous les membres / membres inscrits à l'event).
2. Voit la liste de ses cagnottes avec progression (€ collecté / objectif, nb participants, part actuelle, statut).
3. Peut clôturer, relancer les non-payeurs (email), exporter la liste.

**Membre (`/club` → cagnottes visibles, + bandeau sur la fiche event)**
1. Voit les cagnottes ouvertes de son club avec part suggérée temps réel.
2. Clique "Je participe" → s'ajoute aux inscrits (recalcule la part pour tous).
3. Clique "Payer ma part" → Stripe Checkout avec le montant exact, retour vers `/club/cagnottes/:id` avec confirmation.
4. Un membre ne peut payer **qu'une fois** par cagnotte (contrôle DB + check côté serveur avant création du Checkout).

## Plan d'exécution (4 batchs)

**Batch 1 — Activation Stripe + schéma DB**
- `enable_stripe_payments` (tax option 3 : pas d'automatisation, c'est une collecte interne).
- Migration : tables `pots` (id, club_id, event_id?, title, description, goal_cents, deadline, status: open/closed/cancelled, created_by), `pot_participants` (pot_id, member_id, joined_at — pour la division dynamique), `pot_payments` (id, pot_id, member_id UNIQUE(pot_id,member_id), amount_cents, stripe_session_id, stripe_payment_intent, status: pending/paid/refunded, paid_at).
- RLS : gestionnaire CRUD sur cagnottes de son club ; membres voient/participent/paient les cagnottes de leur club ; superadmin tout.

**Batch 2 — UI gestionnaire**
- Onglet "Cagnottes" dans `/club` (gestionnaire uniquement) : liste + bouton "Créer une cagnotte" + modale de création (avec sélecteur d'évènement optionnel).
- Page détail cagnotte : KPIs (collecté, part courante, participants, payeurs), tableau membres avec statut (inscrit / payé / en attente), actions clôturer + relancer.

**Batch 3 — UI membre + checkout Stripe**
- Section "Cagnottes du club" visible par les membres + encart sur la fiche évènement quand une cagnotte est liée.
- Bouton "Je participe" → server fn `joinPot` (insère dans `pot_participants`, recalcule part affichée).
- Bouton "Payer ma part X €" → server fn `createPotCheckout` : vérifie membre inscrit + non-payeur, calcule la part courante, crée la Stripe Checkout Session, retourne l'URL.
- Page de retour avec confirmation + invalidation du cache.

**Batch 4 — Webhook Stripe + finalisation**
- Server route `/api/public/stripe-webhook` (signature vérifiée) : sur `checkout.session.completed`, marque `pot_payments.status = paid`, enregistre `paid_at`.
- Logique de clôture : à la `deadline` ou via clic gestionnaire → `status = closed`, plus de nouveaux paiements, part finale figée.
- Email transactionnel au membre : confirmation paiement + reçu Stripe. Email au gestionnaire à chaque paiement.

## Détails techniques

- **Division dynamique** : la "part courante" est calculée à la volée (`goal_cents / count(participants)`), pas stockée. Au moment du paiement, on fige le montant dans la Checkout Session (sinon un retard d'inscription après création de session ferait diverger montant payé vs part affichée — accepté côté produit, le surplus reste à la cagnotte).
- **1 paiement/membre** : contrainte UNIQUE(pot_id, member_id) sur `pot_payments` + check serveur avant Checkout.
- **Liaison event** : `pots.event_id` nullable → cagnotte peut exister seule (cadeau, charity) ou liée à un event. Quand liée, la liste "participants" peut être pré-remplie depuis les inscrits event (option à la création).
- **Sécurité** : tous les montants calculés côté serveur (server fn), jamais depuis le client. Webhook vérifie signature Stripe avant écriture.

## Hors-scope V1 (à confirmer plus tard)

- Remboursements partiels / annulation de cagnotte avec remboursement auto.
- Cagnottes inter-clubs.
- Paiement Apple Pay / Google Pay (Stripe Checkout les gère automatiquement, donc en pratique inclus).
- Reversement automatique des fonds vers un IBAN du club (V1 : les fonds restent sur le compte Stripe Lovable, virement manuel sur demande — à valider avec toi selon la structure juridique des clubs).

⚠️ **Point juridique à clarifier avant Batch 1** : selon la structure des clubs (association loi 1901 vs entreprise vs informel), la collecte de fonds via Stripe Lovable peut nécessiter un statut spécifique. Je recommande de valider avec un comptable, ou alors basculer en V1 sur des **liens Leetchi/HelloAsso externes** (où chaque club gère sa propre cagnotte légalement) et garder Stripe pour la V2.