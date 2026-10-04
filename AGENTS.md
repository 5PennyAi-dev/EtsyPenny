# AGENTS.md — PennySEO

Ce fichier définit les règles de travail de Codex et des autres agents IA dans ce dépôt. Il s'applique à l'ensemble du projet.

## Lecture obligatoire avant chaque tâche

Avant toute analyse, planification ou modification :

1. Lire `docs/Roadmap.md`. Cette feuille de route définit les priorités, l'ordre des phases et la prochaine action recommandée.
2. Lire les fichiers directement concernés par la tâche et vérifier l'état Git.
3. Consulter `CLAUDE.md`, `docs/context.md`, `.agent/rules/` et `.agent/personas.md` uniquement pour récupérer du contexte historique utile. En cas de divergence, le code actuel, `AGENTS.md`, `docs/Roadmap.md` et les instructions explicites de l'utilisateur prévalent.
4. Pour une modification d'interface, lire également `docs/styleguide.md` et `tailwind.config.js`.

Ne pas mettre à jour les cases de `docs/Roadmap.md` sans avoir vérifié le résultat correspondant. Ne pas modifier la feuille de route si la tâche ne le demande pas.

## Contexte du projet

PennySEO, anciennement EtsyPenny / 5PennyAi, est un SaaS SEO destiné aux vendeurs Etsy. Il analyse des images produit, génère et évalue des mots-clés, produit des titres et descriptions, gère une banque de mots-clés et permet d'importer ou d'exporter des annonces Etsy.

Architecture principale :

- Frontend : SPA React 19 + Vite, composants JSX, Tailwind CSS.
- Production : fonctions serverless Vercel dans `api/`.
- Développement local : serveur Express dans `server.mjs`, accessible par le proxy Vite `/api`.
- Logique backend partagée : `lib/`.
- Données, Auth, Storage et Realtime : Supabase.
- Fonctions Supabase Deno : `supabase/functions/`.
- Migrations : `supabase/migrations/`.
- Tests : Vitest dans `tests/unit/` et `tests/integration/`.
- Déploiement frontend et API : Vercel. Les Edge Functions Supabase sont déployées séparément.

## Structure à respecter

- `src/pages/` : pages complètes.
- `src/components/` : composants fonctionnels et UI.
- `src/context/` : Auth, progression groupée et chatbot.
- `src/content/docs/` : documentation utilisateur Markdown et corpus source du chatbot.
- `api/` : handlers Vercel de production.
- `server.mjs` : miroir local des routes API.
- `lib/ai/` : routeur multi-fournisseur et adaptateurs IA.
- `lib/seo/` : génération, enrichissement, filtrage, scoring et persistance SEO.
- `lib/etsy/` : OAuth, client Etsy, import, scoring et préparation.
- `lib/auth/` : vérification des requêtes authentifiées.
- `lib/tokens/`, `lib/stripe/`, `lib/email/` : jetons, paiement et emails.
- `supabase/functions/` : Edge Functions. Ne pas les modifier sans vérifier leur ordre de déploiement et leurs secrets.
- `tasks/` et `docs/context.md` : historique hérité; ne pas les traiter comme la seule source de vérité.

## Règles de travail

- Préserver les changements existants de l'utilisateur et éviter toute modification hors périmètre.
- Pour un changement important ou transversal, présenter un plan avant l'implémentation. Les petites corrections ciblées n'exigent pas de modifier systématiquement `tasks/todo.md`.
- Rechercher toutes les utilisations et tous les appelants avant de renommer, déplacer ou supprimer un symbole, une colonne ou un fichier.
- Préférer une correction simple et localisée à une refonte générale non demandée.
- Ne pas laisser de placeholder, de branche temporaire, de donnée factice ou de log de débogage dans le code livré.
- Ne jamais exécuter un script de diagnostic, de migration ou d'audit sans vérifier d'abord s'il écrit des fichiers ou modifie un service externe.
- Ne jamais lancer un script SQL de reset, de seed, de suppression d'utilisateur ou de nettoyage sans autorisation explicite.
- Ne pas réécrire l'historique Git, forcer un push, supprimer une branche distante ou effectuer une autre action destructive sans demande explicite et plan validé.

## Sécurité prioritaire

La sécurité critique est la première phase de `docs/Roadmap.md` et prime sur les nouvelles fonctionnalités tant qu'elle n'est pas terminée.

- Ne jamais afficher, copier, journaliser ou committer un secret, un JWT, une clé API, un token OAuth ou une valeur de fichier `.env`.
- Toute valeur secrète déjà suivie par Git doit être considérée comme compromise. Signaler son emplacement sans reproduire sa valeur et recommander sa rotation.
- Une route métier ne doit jamais faire confiance à un `user_id` ou `userId` fourni par le client. Vérifier le JWT Supabase avec `lib/auth/verify-request-user.ts`, dériver l'identité du token et contrôler la propriété de chaque ressource.
- Les appels avec `SUPABASE_SECRET_KEY` contournent la RLS. Ils doivent être strictement authentifiés, autorisés et limités à l'opération nécessaire.
- Vérifier `profiles.is_blocked` dans les flux authentifiés concernés.
- Pour Stripe, accepter uniquement les prix et modes autorisés côté serveur. Ne jamais créer un portail à partir d'un identifiant utilisateur non authentifié.
- Pour Etsy, vérifier que la connexion, les annonces importées et les listings appartiennent à l'utilisateur authentifié avant toute lecture ou mutation.
- Pour les changements Supabase, examiner les politiques RLS, les permissions Storage et les fonctions `SECURITY DEFINER`. Fixer explicitement le `search_path` des fonctions privilégiées.
- Éviter de journaliser les prompts complets, descriptions, analyses visuelles, emails ou autres données utilisateur.

## Parité backend

`api/` est le backend de production; `server.mjs` est le backend local. Ils doivent exposer les mêmes routes et comportements utiles.

Lors d'un changement backend :

1. Mettre la logique métier réutilisable dans `lib/` autant que possible.
2. Adapter le handler Vercel dans `api/`.
3. Adapter ou monter la route équivalente dans `server.mjs`.
4. Vérifier les codes HTTP, les erreurs, l'authentification et les effets en base dans les deux environnements.
5. Ajouter ou mettre à jour les tests appropriés.

Ne pas supprimer une route `api/`, un module `lib/` ou une Edge Function parce qu'il semble inutilisé sans rechercher dans le frontend, `server.mjs`, les tests, les scripts et les workflows de déploiement.

## Supabase et base de données

- Les migrations versionnées sont obligatoires pour toute modification de schéma.
- Le fichier `docs/schema BD.sql` est un document de contexte, pas une migration exécutable ni une source de vérité suffisante.
- Vérifier la compatibilité avec les données existantes avant de supprimer une colonne, une vue ou une contrainte.
- Inclure la RLS et les permissions dans le même travail que la fonctionnalité qui en dépend.
- Les opérations de solde, quota ou compteur doivent être atomiques lorsque des requêtes concurrentes sont possibles.
- Ne jamais appliquer une migration à une base distante sans autorisation explicite.

## IA et prompts

- Consulter les phases 4 à 7 de `docs/Roadmap.md` avant toute modification d'un modèle, d'un prompt ou du routeur IA.
- Conserver la configuration des modèles derrière `lib/ai/provider-router.ts` ou une abstraction équivalente; éviter les choix de modèle dispersés dans les handlers.
- Un changement de fournisseur ou de modèle doit inclure la révision du prompt, du schéma de sortie, de la gestion d'erreur et des évaluations.
- Ne jamais demander au modèle d'inventer des volumes, de la concurrence, du CPC ou d'autres métriques de marché. Ces données proviennent de DataForSEO ou de calculs déterministes.
- Pour les sorties JSON ou structurées, valider la forme et prévoir les réponses incomplètes ou invalides.
- Pour l'analyse d'image, distinguer observation, inférence et incertitude.

## Frontend et design

- Utiliser React, Vite et Tailwind selon les conventions existantes.
- Utiliser uniquement Lucide React pour les icônes applicatives.
- Respecter la palette et les règles de `docs/styleguide.md` : Indigo 600, Slate 50, surfaces blanches et codes SEO Emerald/Amber/Rose.
- Réutiliser les composants existants avant d'introduire un nouveau motif UI.
- Vérifier les états chargement, vide, erreur, succès et désactivé.
- Vérifier l'accessibilité et le comportement mobile; le layout historique à sidebar fixe ne doit pas servir de justification à de nouvelles régressions responsive.
- Le frontend accède directement à certaines tables Supabase : toute nouvelle lecture ou écriture doit être compatible avec la RLS et ne doit pas supposer que la protection de route côté React constitue une autorisation serveur.

## Documentation et corpus d'aide

- Les articles dans `src/content/docs/` servent à la fois à l'interface d'aide et au chatbot.
- `scripts/build-help-corpus.mjs` génère `lib/help/corpus-data.ts`.
- `npm run build` et `npm run dev:api` déclenchent cette génération; vérifier le diff généré avant de terminer.
- `npm run dev` ne déclenche pas actuellement `predev:api`; régénérer explicitement le corpus si une tâche modifie la documentation et utilise ce mode de développement.
- Mettre à jour la documentation quand un comportement utilisateur, une variable d'environnement ou une procédure de déploiement change.
- Garder `docs/context.md` historique et factuel, sans lui ajouter de longs doublons de code ou d'instructions déjà présentes ici.

## Commandes et validations

Commandes existantes :

```bash
npm run dev
npm run dev:api
npm run dev:vite
npm test
npm run test:watch
npm run test:coverage
npm run lint
npm run build
npm run preview
```

Avant d'exécuter une commande :

- vérifier que les dépendances sont installées;
- ne pas installer ou mettre à jour des dépendances sans que la tâche l'exige;
- savoir que `npm run build` écrit le corpus généré;
- ne pas prétendre qu'un test, lint, typecheck ou build est passé s'il n'a pas réellement été exécuté;
- signaler les validations impossibles et leur raison.

Validation minimale selon la portée :

- Logique pure : tests unitaires ciblés puis suite complète si possible.
- Handler API : tests du handler, authentification, propriété, validation et erreurs.
- UI : build, vérification fonctionnelle et responsive proportionnée au changement.
- Supabase : migration relue, RLS vérifiée et reconstruction testée dans un environnement isolé lorsque disponible.
- Paiement, OAuth ou action distante : tests automatisés puis smoke test contrôlé en staging; ne pas utiliser la production sans autorisation.

## Git et livraison

- Vérifier `git status` avant et après la tâche.
- Ne pas inclure de fichiers générés ou de changements sans rapport avec la demande.
- Ne pas modifier les secrets locaux, `.env`, `.mcp.json` ou les réglages personnels.
- Utiliser des commits atomiques lorsque l'utilisateur demande des commits.
- Conventions de préfixe recommandées : `fix:`, `feat:`, `refactor:`, `test:`, `docs:` et `chore:`.
- Dans le compte rendu final, indiquer les fichiers modifiés, les validations exécutées, les validations non exécutées et les risques ou étapes manuelles restantes.
