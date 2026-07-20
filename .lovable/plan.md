Le nom affiché lors de l'ajout à l'écran d'accueil est défini par le manifeste PWA (`short_name` / `name`). Actuellement, l'application n'a pas de manifeste.

Plan :
1. Créer `public/manifest.webmanifest` avec :
   - `name: "coopernic"`
   - `short_name: "coopernic"`
   - `display: "standalone"`
   - `theme_color: "#FFFFFF"`
   - `background_color: "#FFFFFF"`
   - Icône pointant sur `/favicon.png` (déjà présent).
2. Lier le manifeste dans `src/routes/__root.tsx` via `<link rel="manifest" href="/manifest.webmanifest" />`.
3. Vérifier que le build ne casse pas et que le manifeste est servi.

Pas de service worker / offline demandé : on reste sur un manifeste minimal pour l'installabilité écran d'accueil.