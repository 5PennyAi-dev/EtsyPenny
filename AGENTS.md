# AGENTS.md — PennySEO

Instructions de travail pour Codex et les autres agents IA. Les instructions explicites de l’utilisateur, le code actuel et ce fichier prévalent sur les archives `CLAUDE.md`, `.agent/` et `docs/context.md`.

## Avant chaque tâche

1. Lire [`docs/roadmap.md`](docs/roadmap.md), la feuille de route à consulter avant chaque tâche.
2. Lire les fichiers concernés et vérifier `git status`.
3. Consulter `CLAUDE.md`, `.agent/rules/`, `.agent/personas.md` ou `docs/context.md` seulement pour du contexte historique utile. Ne pas traiter leurs règles obsolètes comme obligatoires.
4. Pour une modification UI, lire aussi `docs/styleguide.md` et `tailwind.config.js`.

Préserver les changements existants. Pour un changement transversal, annoncer un plan bref; préférer une correction localisée à une refonte. Rechercher les appelants avant de renommer ou supprimer un symbole, une route ou une fonction.

## Architecture actuelle

- Frontend : SPA React 19, Vite, JSX et Tailwind CSS. Utiliser Lucide React pour les icônes.
- Production : handlers serverless Vercel dans `api/`.
- Développement : `server.mjs`, serveur Express utilisé derrière le proxy Vite `/api`.
- Logique partagée : `lib/` (`lib/ai`, `lib/seo`, `lib/auth`, `lib/etsy`, `lib/tokens`, `lib/stripe`, `lib/email`).
- Données, Auth, Storage et Realtime : Supabase; migrations dans `supabase/migrations/`; Edge Functions Deno dans `supabase/functions/`.
- Tests : Vitest dans `tests/unit/` et `tests/integration/`.
- Déploiement frontend/API : Vercel. Les Edge Functions Supabase ont leur cycle de déploiement séparé.

`api/` est la source de production et `server.mjs` son miroir local. Toute évolution backend doit conserver les mêmes comportements utiles (authentification, autorisation, codes HTTP et effets de bord) dans les deux environnements. Mettre la logique réutilisable dans `lib/` lorsqu’elle ne complexifie pas inutilement la correction.

## Sécurité et données

- Ne jamais afficher, committer, logger ou copier un secret, JWT, token OAuth ou contenu de `.env`. Ne pas modifier les `.env` locaux sans demande explicite.
- Une route métier ne fait jamais confiance à `user_id`/`userId` fourni par le client. Vérifier le Bearer JWT avec `lib/auth/verify-request-user.ts`, puis dériver l’identité du token.
- Avant toute lecture, mutation, dépense de crédits ou appel externe, vérifier que chaque listing, connexion Etsy, conversation, message ou autre ressource appartient à cet utilisateur.
- Les clients avec `SUPABASE_SECRET_KEY` contournent la RLS : protéger et limiter leurs opérations. Vérifier `profiles.is_blocked` dans les flux applicables.
- Stripe : prix/mode autorisés côté serveur et client Stripe recherché à partir de l’utilisateur authentifié. Préserver la vérification de signature du webhook.
- Supabase : une évolution de schéma passe par une migration versionnée. Revoir RLS, Storage, permissions et fonctions `SECURITY DEFINER` (avec `search_path` explicite) avant tout changement de données sensible.

## IA, intégrations et documentation

- n8n est abandonné : les exports et mentions n8n sont des archives historiques, pas des composants actifs ni une preuve d’utilisation. Ne pas ajouter de webhook, variable ou credential n8n.
- Conserver les choix de fournisseurs/modèles derrière `lib/ai/provider-router.ts`. La feuille de route vise la migration progressive vers OpenAI et l’amélioration des prompts; lire ses phases 4 à 7 avant de modifier IA, prompts ou modèles.
- Pour les sorties structurées, valider le schéma et les erreurs. Ne pas inventer les métriques de marché : elles viennent de DataForSEO ou de calculs déterministes.
- Les articles de `src/content/docs/` alimentent aussi le chatbot. `npm run build` et `npm run dev:api` régénèrent `lib/help/corpus-data.ts`; contrôler et ne pas committer un diff généré involontaire.
- Mettre à jour la documentation seulement lorsqu’un comportement utilisateur ou une procédure change. Garder `docs/context.md` comme archive factuelle, sans réécrire ses constats historiques.

## UI et qualité

- Respecter le style guide : Indigo 600, Slate 50, surfaces blanches et couleurs SEO Emerald/Amber/Rose. Réutiliser les composants existants, vérifier états chargement/vide/erreur/succès, accessibilité et mobile.
- Pas de placeholder, de debug dump, de code mort ou de log frontend dans le résultat livré. Les logs serveur doivent rester opérationnels et ne pas exposer de données ou prompts sensibles.
- Ne supprimer une route, un module `lib/`, une Edge Function ou une colonne qu’après recherche de tous ses appelants et compatibilité des données existantes.

## Commandes et validations

Commandes réellement définies :

```bash
npm run dev          # Express + Vite
npm run dev:api      # Express, port 3001
npm run dev:vite     # Vite seul
npm test             # Vitest
npm run test:watch
npm run test:coverage
npm run lint         # ESLint JS/JSX
npm run typecheck    # TypeScript backend (api/, lib/, types/)
npm run build        # régénère le corpus puis Vite
npm run preview
```

Exécuter les tests ciblés puis la suite adaptée et le build pour un changement d’API ou d’UI. Ne pas annoncer une validation non exécutée. Le lint est configuré mais ses écarts historiques doivent être traités progressivement; le typecheck couvre les sources TypeScript backend. Ne pas installer de dépendance ou lancer de migration, reset, seed, audit écrivant ou action distante sans autorisation.

## État ouvert et Git

- La migration/rotation des clés Supabase est effectuée; le nettoyage de l’historique Git est préparé mais reporté. Ne pas réécrire l’historique ni faire de force-push sans coordination explicite.
- RLS, Storage, permissions, `SECURITY DEFINER`, les routes/API restantes et `is_blocked` demandent encore une revue de sécurité.
- Vérifier `git status` avant et après la tâche. Utiliser des commits atomiques uniquement lorsque demandés; ne pas inclure de fichiers générés ou sans rapport.
