# 🎨 Style Guide : EtsyPenny (par 5PennyAi)

Ce document contient les spécifications visuelles strictes pour l'interface de l'application EtsyPenny. Toutes les générations de composants doivent respecter ce guide.

## 1. Principes de Design
- **Minimalisme B2B :** Pas de fioritures, focus sur l'efficacité.
- **Espaces Aérés :** Utilisation généreuse de `padding` et `gap`.
- **Clarté Data :** Les informations SEO doivent être immédiatement lisibles grâce aux codes couleurs.

## 2. Palette de Couleurs (Design System)
- **Primaire (Action) :** Indigo 600 (`#4f46e5`).
- **Fond Global :** Slate 50 (`#f8fafc`).
- **Surfaces (Cartes/Dashboard) :** White (`#ffffff`).
- **Bordures :** Slate 200 (`#e2e8f0`).
- **Texte Principal :** Slate 900 (`#0f172a`).
- **Texte Secondaire :** Slate 500 (`#64748b`).

## 3. Codes Couleurs SEO (Compétition)
- **Faible (🟢) :** Emerald 600 sur fond Emerald 50.
- **Moyenne (🟡) :** Amber 500 sur fond Amber 50.
- **Haute (🔴) :** Rose 600 sur fond Rose 50.

## 4. Typographie & Composants
- **Police :** Sans-serif moderne (Inter ou Geist).
- **Boutons :** `rounded-lg` ou `rounded-xl`, padding horizontal généreux.
- **Cartes :** `bg-white`, `border border-slate-200`, `shadow-soft`.
- **Inputs :** `bg-white`, focus avec `ring-2 ring-indigo-500`.

## 5. Icônes
- Utiliser uniquement la bibliothèque **Lucide-React**.
- Style : `stroke-width={2}`.
- Couleur par défaut : `text-slate-500` ou `text-indigo-600` pour les actions.