# PennySEO — Feuille de route de développement

Date de référence : 4 octobre 2026
Dépôt : https://github.com/5PennyAi-dev/EtsyPenny
Statut : feuille de route adoptée; réalisation des étapes à confirmer.

## Objectifs directeurs

1. Utiliser les différents modèles OpenAI pour les fonctionnalités IA de PennySEO et remplacer progressivement Gemini.
2. Réviser et améliorer les prompts : analyse d’images, génération de mots-clés, classification, titres, descriptions et autres fonctions IA.
3. Reprendre le développement avec Codex après Antigravity et Claude Code, sur une base sûre, reproductible et testable.

Ce document conserve les décisions prises dans la conversation. Les constats techniques proviennent du rapport initial de Codex et doivent être vérifiés dans le dépôt avant intervention. Aucun correctif n’est déclaré terminé ici.

**Décision d’architecture :** n8n est abandonné et ne fait plus partie de PennySEO. Les exports et rapports n8n conservés dans le dépôt sont des archives historiques, non des composants actifs ni des preuves d’utilisation.

## Phase 1 — Sécurité critique

- [x] Identifier les secrets exposés et leurs références sans afficher leurs valeurs.
- [x] Effectuer la migration des clés Supabase et la rotation de la clé `service_role` signalée comme exposée.
- [x] Mettre à jour les variables nécessaires dans Vercel et en développement local.
- [x] Retirer les secrets des fichiers suivis et ajuster `.gitignore`.
- [x] Préparer un nettoyage coordonné de l’historique Git, avec clone séparé et sauvegarde préalable.
- [ ] Exécuter le nettoyage de l’historique Git : reporté; ne pas pousser l’historique réécrit sans coordination des autres copies du dépôt.
- [ ] Sécuriser progressivement les API : validation du JWT Supabase et identité dérivée du token.
- [ ] Vérifier la propriété des ressources, les intégrations Stripe/Etsy et la prise en compte de `is_blocked`.
- [ ] Vérifier les permissions et RLS nécessaires à ces corrections dès cette phase.

État au 7 octobre 2026 : les clés Supabase sont migrées; l’ancienne clé `service_role` exposée est désactivée et son refus HTTP 401 a été confirmé. Les nouvelles clés et les trois fonctions Edge sont en place; le fonctionnement de PennySEO a été vérifié. Les routes Stripe, Etsy et SEO sont sécurisées par JWT et contrôles de propriété, puis déployées. Les routes Help (`chat` et `feedback`) sont sécurisées et validées localement; leur déploiement reste à confirmer. Le nettoyage de l’historique est préparé, mais reporté.

Résultat attendu : secrets révoqués et accès backend contrôlés. La phase reste ouverte : l’audit et la sécurisation des autres API, les contrôles de propriété restants, les vérifications RLS/permissions et la prise en compte de `is_blocked` restent à traiter.

## Phase 2 — Préparer PennySEO pour Codex

- [ ] Créer `AGENTS.md` à partir des règles utiles de `CLAUDE.md`, `.agent/rules`, `personas.md` et de la documentation.
- [ ] Corriger les règles obsolètes et simplifier `docs/context.md`.
- [ ] Créer `.env.example` sans secret et documenter les commandes de validation.
- [ ] Inscrire les objectifs OpenAI et l’amélioration des prompts dans les instructions du projet.

Règles à conserver : aucun secret committé; identité issue du JWT; contrôle de propriété; parité Vercel/Express local; vérification des RLS lors des changements Supabase; plan pour les changements importants; validations adaptées avant de terminer.

Résultat attendu : instructions cohérentes pour Codex et documentation conforme au code.

## Phase 3 — Stabiliser l’environnement

- [ ] Installer les dépendances avec `npm ci` et exécuter les tests existants.
- [ ] Corriger les problèmes de configuration des tests.
- [x] Configurer ESLint et une commande de vérification des types adaptée au backend TypeScript.
- [x] Vérifier le build.
- [ ] Remplacer les dépendances `latest` par des versions maîtrisées et déclarer les dépendances directes manquantes.
- [ ] Envisager GitHub Actions pour automatiser les validations.

Commandes cibles, à confirmer ou créer selon le dépôt : `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.

État au 7 octobre 2026 : `npm run typecheck`, la suite de tests (188 tests) et le build de production réussissent. ESLint est configuré; il reste en échec avec 100 erreurs et 36 avertissements historiques à traiter progressivement, sans désactiver les règles.

Résultat attendu : état de référence vérifié et régressions détectables.

## Phase 4 — Auditer toute l’IA existante

- [ ] Cartographier les usages Gemini, Anthropic et OpenAI.
- [ ] Examiner `runAI()`, la configuration dynamique des modèles et les fallbacks.
- [ ] Recenser les appels vision, paramètres, sorties JSON et sorties structurées.
- [ ] Inventorier tous les prompts système, utilisateur, templates et constructions dynamiques.
- [ ] Produire une matrice : fonctionnalité, fichier, fournisseur/modèle, entrée, sortie, prompt, problèmes et cible OpenAI envisagée.

Résultat attendu : inventaire complet avant migration.

## Phase 5 — Définir l’architecture OpenAI cible

- [ ] Choisir les modèles par tâche selon qualité, vision, raisonnement, coût, latence et sorties structurées.
- [ ] Vérifier les modèles disponibles et leurs capacités au moment de la décision.
- [ ] Centraliser les choix dans la configuration derrière `runAI()` ou une abstraction équivalente.
- [ ] Définir les erreurs, retries, limites et éventuels fallbacks.
- [ ] Documenter le modèle utilisé pour chaque fonction et la justification.

Résultat attendu : architecture configurable et plan de migration. Aucun nom de modèle n’est figé dans cette feuille de route.

## Phase 6 — Migrer vers OpenAI et refondre les prompts

Traiter une fonctionnalité à la fois, en associant migration du fournisseur, adaptation du prompt et validation des résultats.

### 6A — Analyse d’images

- [ ] Distinguer observations visuelles, inférences et incertitudes.
- [ ] Définir la taxonomie : produit, thème, niche, style, éléments visuels et audience potentielle.
- [ ] Préciser ce qui ne doit pas être inféré et gérer les ambiguïtés.
- [ ] Définir un schéma de sortie structuré et les informations utiles au SEO Etsy.

### 6B — Génération de mots-clés

- [ ] Confier au modèle la compréhension du produit et la génération sémantique de variantes pertinentes.
- [ ] Utiliser DataForSEO pour les données de marché, avec leur provenance et leurs limites.
- [ ] Calculer le scoring/ranking dans PennySEO lorsque les règles sont déterministes.
- [ ] Interdire l’invention de volumes, de concurrence ou d’autres métriques de marché.

### 6C à 6F — Autres fonctions

- [ ] Sélection/scoring : distinguer les décisions déterministes de celles nécessitant un modèle.
- [ ] Titres Etsy : prompt spécialisé et contraintes vérifiées.
- [ ] Descriptions Etsy : prompt dédié au produit, à la clarté et à l’objectif commercial.
- [ ] Chatbot/aide : vérifier le corpus, le contexte, les instructions et les hallucinations.

Pour chaque prompt : version, objectif, entrées, sortie attendue, contraintes, modèle, paramètres compatibles, exemples et évaluations.

Résultat attendu : fonctions migrées progressivement et prompts versionnés. Un remplacement de modèle doit inclure une révision du prompt.

## Phase 7 — Évaluer les prompts objectivement

Préparer le jeu d’évaluation avant les premières modifications de la phase 6, puis l’utiliser pendant toute la migration.

- [ ] Constituer environ vingt produits représentatifs : affiche vintage, t-shirt, mug personnalisé, bijou, art mural, fichier imprimable, cadeau de mariage, etc.
- [ ] Définir les critères, les cas ambigus et les résultats attendus.
- [ ] Comparer les anciens et nouveaux prompts sur les mêmes cas.
- [ ] Mesurer classification, pertinence des mots-clés, répétitions, hallucinations, qualité des titres, longueurs, validité JSON, coût et latence.
- [ ] Conserver les résultats et définir des seuils d’acceptation avant généralisation.

Résultat attendu : améliorations démontrées par des évaluations reproductibles.

## Phase 8 — Supabase et base reproductible

Les vérifications de sécurité urgentes sont traitées en phase 1; cette phase complète l’audit et la reproductibilité.

- [ ] Auditer RLS, Storage, permissions et fonctions `SECURITY DEFINER`.
- [ ] Reconstituer le schéma, les vues et les migrations manquantes.
- [ ] Créer une migration de référence et vérifier la reconstruction sur un environnement isolé.
- [ ] Envisager une configuration Supabase locale.

Résultat attendu : base documentée et reconstructible.

## Phase 9 — Nettoyage technique progressif

- [ ] Découper progressivement `ProductStudio.jsx`, `SEOLab.jsx` et `ResultsDisplay.jsx` si les constats du rapport sont confirmés.
- [ ] Réduire la complexité de `server.mjs`.
- [ ] Isoler ou retirer les archives n8n obsolètes, puis nettoyer l’ancien multi-mode et les UUID en dur.
- [ ] Retirer les logs sensibles et améliorer le responsive.

Résultat attendu : maintenance facilitée sans refonte globale préalable.

## Phase 10 — Reprendre les évolutions fonctionnelles

- [ ] Prioriser les améliorations du Studio et du workflow Etsy/Magic Sync.
- [ ] Traiter les fonctions incomplètes, notamment le mot de passe oublié si confirmé.
- [ ] Évaluer analyse boutique, recommandations SEO, tendances et traitement groupé.
- [ ] Prioriser les fonctionnalités premium, l’UX et les nouvelles fonctions OpenAI.

Résultat attendu : développement orienté vers les besoins utilisateurs sur la base stabilisée.

## Prochaine action

Poursuivre la phase 1 avec l’audit et la sécurisation des API : validation des JWT Supabase, identité dérivée du token, contrôle de propriété des ressources, prise en compte de `is_blocked`, ainsi que revue des RLS et permissions. Le nettoyage de l’historique Git reste reporté jusqu’à une coordination explicite.

Ensuite : instructions Codex → validations → audit IA → architecture OpenAI → migration et refonte → évaluations → reproductibilité Supabase → nettoyage → évolutions.

## Utilisation dans le projet

Emplacement recommandé dans le dépôt local : `docs/ROADMAP.md`. Ajouter dans `AGENTS.md` une référence à ce fichier et mettre à jour les cases uniquement après validation des travaux. Ce document constitue le contexte de référence; sa création n’ajoute pas automatiquement le fichier au dépôt GitHub ou à l’application Codex locale.
