# Auth réelle + invitation email + restriction des rôles

Aujourd'hui toute l'app tourne en **mock localStorage** (auth-store, membres, clubs). Pour qu'un membre reçoive vraiment un email et puisse se connecter, il faut migrer vers Lovable Cloud (DB + Auth + Emails). C'est gros, donc je propose de faire ça en **3 batchs** pour rester lisible.

## Batch 1 — Fondations auth & DB

**Base de données** (migration SQL) :
- `clubs` : id, name, city, gestionnaire_id, open_to_network, created_at
- `members` : id (= auth user id), club_id, first_name, last_name, role métier, company, sector, city, email, phone, etc.
- `user_roles` : (user_id, role enum `superadmin | gestionnaire | membre`) — table séparée pour la sécurité (jamais sur profiles)
- Fonction `has_role(user_id, role)` en SECURITY DEFINER pour les policies RLS
- RLS sur toutes les tables :
  - Super admin : tout
  - Gestionnaire : son club uniquement (lecture + écriture sur ses membres)
  - Membre : son propre profil + annuaire selon règle inter-clubs

**Auth** :
- Page `/login` (email + mot de passe + Google)
- Page `/auth/set-password` (lien de définition de mot de passe à la première connexion)
- Route protégée via layout `_authenticated`
- Redirection si pas connecté

## Batch 2 — Invitation email + flow gestionnaire

- Server function `inviteMember` (admin client) :
  1. Crée le user dans Supabase Auth (avec `email_confirm: false`)
  2. Génère un lien de définition de mot de passe
  3. Envoie un email d'invitation via **Lovable Emails** (template branded Coopernic, nom du club, lien)
  4. Crée la ligne `members` + assigne le rôle `membre` dans `user_roles`
- Setup du domaine email + scaffold transactional emails
- Template `member-invitation.tsx` (React Email) avec branding Coopernic
- Formulaire "Ajouter un membre" dans `/club` appelle cette server fn
- Toast de confirmation + état "invitation envoyée"
- Bouton "Renvoyer l'invitation" si pas encore activé

## Batch 3 — Permissions UI & vues différenciées

- **Super admin (vous)** : conserve `/admin` (vue globale clubs), accès à n'importe quel club
- **Gestionnaire** : 
  - Pas d'accès à `/admin`
  - Header simplifié, badge "Gestionnaire de [Club X]"
  - `/club` automatiquement scope sur son club (pas de sélecteur)
  - Peut ajouter / révoquer / nommer un nouveau gestionnaire dans son club
  - Voit l'annuaire inter-clubs comme un membre (règle de réciprocité existante)
- **Membre** : pas d'accès `/club` ni `/admin`, juste annuaire/messagerie/recos/profil
- Switch de session mock (boutons "se connecter en tant que…") **supprimé**

## Notes techniques (pour info)

- Auth via `lovable.auth.signInWithOAuth("google", ...)` + email/password Supabase
- Server functions avec `requireSupabaseAuth` pour les opérations user
- `supabaseAdmin` (service role) uniquement pour la création de comptes côté invitation
- Le mock `auth-store.ts` sera remplacé par un hook `useSession` basé sur Supabase
- `mock-data.ts` sera conservé temporairement comme seed (script de bootstrap pour la démo)

## Question avant de démarrer

Je propose de commencer par le **Batch 1** (fondations) — sans toucher à l'UI existante autre que l'ajout du `/login`. Ça posera la base proprement.

→ **Confirme-tu qu'on y va comme ça**, ou tu préfères qu'on attaque directement le Batch 2 (email d'invitation) en gardant le mock auth pour l'instant ?
