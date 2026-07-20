## Direction

Mode **clair, éditorial, aéré**. Fond `#FFFFFF` par défaut, crème `#F3EFE6` réservé aux surfaces qui doivent respirer (cartes hero, encadrés, banners), navy `#0b1428` uniquement pour le texte et les CTA principaux, or `#D4A24C` en accent chirurgical (liens actifs, KPIs clés, badges premium — jamais en aplat de fond large).

Mobile-first : chaque écran est pensé colonne unique, sections empilées pleine largeur, respiration verticale généreuse (densité 2/5). Le desktop est une conséquence, pas la référence.

## 1 · Design tokens (fondation)

Réécriture de `src/styles.css` :

- `--background: #FFFFFF`, `--foreground: #0b1428`
- `--surface: #F3EFE6` (crème), `--surface-strong: #FAF8F2`
- `--border: #E8E4D9` (bord chaud très doux, pas de gris froid)
- `--muted: #F7F5EF`, `--muted-foreground: #5B6070`
- `--primary: #0b1428` / `--primary-foreground: #FFFFFF`
- `--accent: #D4A24C` / `--accent-foreground: #0b1428`
- `--ring: color-mix(in oklab, #D4A24C 60%, transparent)`
- `--radius: 14px` (rayons plus doux qu'aujourd'hui, cohérents partout)
- Nouvelles ombres légères basées sur navy à 6-8% d'opacité (pas de noir pur)
- Suppression des variantes dark hors-charte (on garde `.dark` mais on ne l'active plus par défaut)

Typo Manrope conservée. Échelle typographique retouchée : titres plus fins (`font-weight: 700` max, plus `800` réservé au logo), body `text-[15px] leading-relaxed` sur mobile.

## 2 · Header & navigation mobile

`src/components/AppHeader.tsx` :

- Sur mobile, la nav horizontale disparaît → **bottom tab bar** fixe (5 items max : Accueil, Annuaire, Messages, Cagnottes, Évènements) avec icônes Lucide, label court, actif = navy + or dessous.
- Overflow ("Stats", "Mon club", "Super admin") dans un menu "Plus" (drawer).
- Le header top reste minimal : logo à gauche, avatar rôle à droite, plus de dropdown "démo" visible par défaut sur mobile (déplacé dans le menu profil).
- Desktop : nav horizontale conservée mais allégée (spacing +, poids typographique réduit).

## 3 · Landing publique (`src/routes/index.tsx`)

Refonte en **sections pleines empilées** :

```text
[hero]        titre éditorial navy, sous-titre muted, 1 CTA or, mockup mobile à droite (desktop) ou dessous (mobile)
[preuve]      bandeau crème avec 3-4 chiffres clés (or pour les nombres, navy pour les labels)
[valeur x3]   3 sections pleines alternées blanc/crème, chaque section = un pilier (Réseau, Business tracking, Gestion club) avec 1 visuel + 1 paragraphe court
[cible]       "Pour les fondateurs de clubs business" — carte crème, ton direct
[cta final]   bande navy pleine largeur (seule zone sombre de la page), CTA or contrasté
[footer]      minimal, liens légaux
```

Retrait du hero glow/mesh actuel : trop chargé et hors-registre light. Remplacé par une composition typographique + un accent or ponctuel (filet, chiffre, badge).

## 4 · Écrans connectés

Même grammaire partout : titre de page (H1 navy), sous-titre muted, contenu en cartes blanches sur fond blanc avec bord `--border` et rayon 14px. Le crème sert de séparateur de sections, pas de fond général.

- **Annuaire** (`src/routes/annuaire.tsx`, `MemberCard.tsx`) : filtres en haut sticky mobile, cartes membres simplifiées (photo/initiales, nom, société, tags), badge or "Réseau Coopernic" pour les membres externes.
- **Messages** (`src/routes/messages.tsx`) : liste conversations pleine largeur mobile, thread en push-view. Bulles : sortantes = navy/blanc, entrantes = crème/navy. Bouton "Reco" à côté du champ, en accent or.
- **Stats** (`src/routes/recos.tsx`) : KPIs en cartes empilées mobile (2 colonnes desktop), tableaux transformés en listes-cartes sur mobile.
- **Cagnottes** (`src/routes/cagnottes.tsx`) : card cagnotte avec barre de progression or, KPIs alignés verticalement mobile.
- **Évènements** (`src/routes/evenements.tsx`) : card évènement, sondage inline avec barres de progression navy/or, bouton "Ouvrir dans Maps" texte or.
- **Mon club / Admin** (`src/routes/club.tsx`, `src/routes/admin.tsx`) : tables → listes-cartes mobile, actions primaires en bas d'écran sticky (pattern iOS-like).
- **Auth** (`login`, `auth/set-password`) : carte centrée max-w-sm sur fond crème.

## 5 · Composants transverses

- Boutons : primaire navy plein, secondaire ghost navy avec bord, accent or réservé au CTA principal d'une page.
- Inputs : bord `--border`, focus ring or, hauteur 44px mini (tap target mobile).
- Bandeaux (test mode Stripe, invitation) : fond crème + filet or à gauche, plus jamais rouge/orange criard sauf erreur bloquante.

## Fichiers modifiés

- `src/styles.css` — refonte complète des tokens
- `src/components/AppHeader.tsx` — bottom tab bar mobile + header allégé
- **Nouveau** `src/components/MobileTabBar.tsx`
- `src/routes/index.tsx` — refonte landing
- `src/routes/__root.tsx` — meta + link Manrope inchangés, padding bottom pour tab bar
- Retouches ciblées : `annuaire.tsx`, `messages.tsx`, `recos.tsx`, `cagnottes.tsx`, `evenements.tsx`, `club.tsx`, `admin.tsx`, `login.tsx`, `MemberCard.tsx`, `RecoComposer.tsx`, `PaymentTestModeBanner.tsx`, `ClubPotsSection.tsx`, `PotEmbeddedCheckout.tsx`

Aucun changement de logique business, de schéma DB, ni de server function — c'est un pass presentation/UX pur.

## Hors-scope

- Pas de mode dark (mis en veille, tokens conservés mais non exposés).
- Pas de nouveau logo ni de nouvelles illustrations générées ce tour-ci — on peut en ajouter après validation de la direction.
- Pas de refonte du checkout Stripe embarqué (contraint par Stripe).
