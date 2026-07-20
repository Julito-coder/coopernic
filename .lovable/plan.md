## Objectif

Clarifier la séparation des rôles : le **Super Admin** est un back-office global (tous les clubs), le **Gestionnaire** ne pilote que son club. Le Super Admin doit pouvoir faire tout ce qu'un gestionnaire fait, mais partout, plus la gestion des rôles.

## État actuel

- `/admin` (Super Admin) : liste des clubs, création, choix du gestionnaire via un dropdown. Pas d'accès direct aux membres, cagnottes, invitations.
- `/club` (Gestionnaire) : ajoute/retire membres, invite par email, cagnottes, toggle annuaire. Fonctionne aussi pour un Super Admin via `?id=xxx`.
- Rôles en base : `superadmin`, `gestionnaire`, `membre` (table `user_roles`, RLS OK, helper `has_role`).
- `inviteMember` autorise déjà Super Admin OU gestionnaire du club cible.

## Ce qu'il manque

1. Le Super Admin n'a pas d'UI pour **promouvoir/rétrograder** un membre existant en gestionnaire ou super admin, ni pour **révoquer un rôle**.
2. Pas de bouton "renvoyer les codes d'accès" (renvoi d'email d'invitation / reset password) depuis l'admin.
3. `/admin` ne donne pas d'accès rapide à la vue gestionnaire de chaque club (le lien "Gérer →" existe, à mettre en avant).
4. Aucun garde-fou côté serveur pour l'écriture des rôles (aujourd'hui seul le Super Admin devrait pouvoir modifier `user_roles`).

## Plan

### 1. Server functions rôles & invitations (`src/lib/members.functions.ts`)

Ajouter trois server functions protégées par `requireSupabaseAuth`, réservées au super admin (check via `has_role`) :

- `setMemberRole({ userId, clubId, role })` — upsert dans `user_roles`. Roles autorisés : `membre`, `gestionnaire`, `superadmin`. Si `gestionnaire`, met aussi à jour `clubs.gestionnaire_id`.
- `revokeMemberRole({ userId, clubId, role })` — supprime la ligne correspondante.
- `resendInvite({ email, redirectTo })` — renvoie un email de reset password (réutilise la logique déjà présente dans `inviteMember`).

Aucune migration SQL n'est nécessaire (RLS déjà stricte, on passe par `supabaseAdmin` côté serveur après vérification super admin).

### 2. Refonte `src/routes/admin.tsx`

Transformer la page en vrai back-office :

- KPIs conservés.
- Formulaire "Créer un club" conservé.
- Pour chaque club : carte dépliable listant **tous les membres** avec, par ligne :
  - badge rôle actuel (membre / gestionnaire / superadmin),
  - menu "Changer rôle" (membre, gestionnaire, superadmin),
  - bouton "Renvoyer accès" (appelle `resendInvite`),
  - bouton "Retirer du club".
- Lien "Ouvrir l'espace club" (réutilise `/club?id=…`) pour piloter cagnottes, invitations, annuaire — le Super Admin y a déjà accès.
- Pas de switcher démo, tout est piloté par la vraie session.

### 3. Ajustements `src/routes/club.tsx`

- Rien à changer sur le fond (le Super Admin peut déjà y entrer via `?id=`).
- Retirer le bouton "définir comme gestionnaire" côté gestionnaire (déjà réservé au super admin via `canEditGestionnaire`).
- Ajouter un bouton "Renvoyer les accès" à côté de chaque membre (utilise `resendInvite`) — utile aussi au gestionnaire pour son club.

### 4. Header / navigation

- Un gestionnaire ne voit que "Mon club" (déjà le cas).
- Le Super Admin voit "Admin" + "Mon club" (déjà OK).
- Aucun changement structurel.

## Détails techniques

- Les server functions utilisent `context.supabase` pour valider que l'appelant est super admin (`has_role`), puis chargent dynamiquement `supabaseAdmin` pour écrire dans `user_roles` / renvoyer les emails.
- Le renvoi d'accès utilise `supabaseAdmin.auth.resetPasswordForEmail` (déjà utilisé dans `inviteMember`).
- Aucune donnée simulée ne revient : tout passe par Supabase.

## Hors scope

- Pas de nouvelle table, pas de migration.
- Pas de refonte visuelle : on reste sur la charte light actuelle.
- Pas de modification des cagnottes / events.
