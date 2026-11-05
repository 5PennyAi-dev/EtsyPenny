# Roadmap — Unification de SEO Listings

Date : 4 novembre 2026
Statut : Phases 0 à 3 terminées localement ; phase 4 reste ouverte, en attente d’une validation UX authentifiée.
Référence : cette feuille de route est le document de référence pour la refonte de SEO Listings. Toute décision ultérieure doit être ajoutée au journal ci-dessous.

## A1. Contexte et problématique

PennySEO manipule deux origines de listings dans une expérience Studio commune :

- **Manuel** : une ligne `listings` créée depuis `ProductStudio`. L’utilisateur téléverse l’image, lance l’analyse, génère et sélectionne des mots-clés, puis produit un titre et une description. Les résultats sont à copier manuellement dans Etsy.
- **Etsy** : une ligne importée dans `etsy_listings`, reliée de façon canonique à une unique ligne `listings` lors de la préparation ou du scoring. Elle peut suivre le même travail SEO dans le Studio et, si une proposition enregistrée existe, être publiée vers Etsy.

Aujourd’hui, SEO Listings (`src/pages/ListingsByStatusPage.jsx`) lit `v_dashboard_listings` et présente le pipeline calculé du Studio, alors que My Shop (`src/pages/MyShopPage.jsx`) présente un autre vocabulaire, construit par `getMyShopUxState()` dans `src/lib/my-shop-utils.js`. My Shop distingue en plus l’avancement SEO de l’état de publication. Le résultat est fonctionnel, mais la terminologie, les filtres et les actions ne sont pas homogènes entre les deux origines.

Le but n’est pas de changer My Shop ni les règles métier : il est de rendre SEO Listings plus clair en affichant **un statut SEO commun**, une **origine explicite**, et, uniquement pour Etsy, un état de publication complémentaire.

## A2. Objectifs UX et techniques

- Harmoniser le libellé du progrès SEO des listings manuels et Etsy à partir de données réellement disponibles.
- Rendre l’origine immédiatement lisible : `Etsy` ou `Manuel`.
- Séparer dans l’interface le progrès SEO, la préparation technique et la publication Etsy ; un listing préparé ne doit pas être présenté comme ayant des mots-clés prêts.
- Conserver une vue unifiée, des filtres et des actions simples, cohérents avec les informations déjà rendues par My Shop.
- Réutiliser les vues et utilitaires existants plutôt que créer un second workflow ou modifier le schéma.
- Préserver les capacités exclusives à Etsy : import, préparation, scoring d’un listing importé, pré-vérification et publication.
- Préserver les capacités manuelles : analyse d’image, génération/sélection de mots-clés, génération de brouillon et copie manuelle.
- Conserver la parité utile entre les handlers Vercel dans `api/` et le miroir Express `server.mjs` si une évolution de présentation nécessitait finalement une donnée backend.

## A3. Décisions validées

### Décisions validées

L’option B est retenue : **statut SEO commun + origine distincte**.

1. SEO Listings reste une vue unifiée de tous les listings.
2. Chaque ligne affiche une origine explicite, Etsy ou Manuel.
3. Les étapes SEO utilisent une terminologie commune lorsque l’état métier est comparable.
4. Préparation technique, génération SEO et publication Etsy restent des dimensions distinctes.
5. Une action Etsy ne doit jamais être proposée pour un listing manuel.
6. La simplicité, la réutilisation et la cohérence avec My Shop priment sur une modification de schéma ou de pipeline.
7. Les libellés SEO validés sont : `NEW` → « À analyser », `ANALYZED` → « À générer », `SEO_READY` → « Mots-clés disponibles », `DRAFT_READY` → « Prêt à rédiger », `OPTIMIZED` → « Contenu généré ».
8. SEO Listings conserve une action principale unique « Ouvrir le Studio » ; les opérations Etsy restent des informations secondaires et leurs actions restent dans les flux existants.

### Hypothèses à examiner, non validées

- Les cinq libellés provisoires « À analyser », « À générer », « En cours », « Mots-clés prêts », « Erreur » ne couvrent pas explicitement le brouillon prêt, l’optimisation terminée ni les états Etsy déjà publiés.
- Le statut commun doit être dérivé de la vue `v_listing_status`/des données du listing, ou une projection légère, et non d’une copie des états `etsy_listings`.
- La publication Etsy doit être une colonne ou un badge secondaire, pas un statut SEO principal.
- `source = 'etsy'` est l’indice prévu, mais le lien `etsy_listings.listing_id` est le signal le plus fiable pour autoriser une action Etsy.

## A4. Périmètre et exclusions

### Périmètre

- La page SEO Listings, ses colonnes, filtres, badges, lignes, actions et états vides/chargement/erreur.
- La représentation de l’origine et la dérivation de libellés à partir des données existantes.
- Les tests unitaires ou d’interface nécessaires à cette présentation, après validation de la conception.

### Exclusions

- Toute réécriture de My Shop, de son modèle de préparation atomique, de ses retries ou de son affichage actuel.
- Toute migration Supabase, changement de RLS, de pipeline IA, de prompts, de modèle, de crédit, de configuration Etsy ou Vercel.
- Toute modification des imports Etsy, de la canonicalisation, du scoring, des propositions, de l’export Etsy ou de leurs règles d’autorisation.
- Toute réparation automatique de données historiques ou de liens canoniques incohérents.

## A5. Phases de réalisation

| Phase | Objectif | État initial | Livrables | Critères de sortie |
|---|---|---|---|---|
| 0 — Audit | Comprendre l’architecture et les statuts existants | En cours | Cette roadmap, inventaire des états, matrice proposée, risques | États, sources et limites documentés ; état passé à Terminé le 4 novembre 2026 |
| 1 — Conception UX | Valider statuts, colonnes, filtres et actions | Terminé | Conception validée, contrat de rendu, libellés définitifs, cas limites | Décisions produit consignées le 4 novembre 2026 |
| 2 — Plan technique | Définir les modifications minimales | Terminé | Plan de réalisation, dépendances, risques et stratégie de tests (A11) | Aucun changement de schéma/pipeline requis ; périmètre d’implémentation déterminé |
| 3 — Implémentation | Adapter SEO Listings localement | À faire | Interface et tests ciblés | Origine, statuts et restrictions Etsy fonctionnent dans les parcours retenus |
| 4 — Validation | Tests fonctionnels et régression | À faire | Résultats de tests, recette manuelle des scénarios | Parcours manuels/Etsy, retry, historique et non-export manuel validés |
| 5 — Déploiement | Publier et vérifier en Production | À faire | Procédure et vérification Production | Déploiement approuvé, contrôlé et sans régression constatée |

## A6. Critères d’acceptation globaux

- Les listings Etsy et manuels existants sont affichés sans disparition ni doublon.
- L’origine est immédiatement identifiable et ne dépend pas seulement d’un titre ou d’une image.
- Le statut SEO est cohérent, lisible et ne confond pas préparation, analyse, mots-clés, brouillon et publication.
- L’action principale correspond à la capacité et à l’état réels du listing.
- Aucun chemin d’export Etsy n’est rendu disponible à un listing manuel ; le serveur reste l’autorité qui le bloque.
- Les erreurs et retries de préparation/scoring Etsy restent accessibles et compréhensibles.
- Les listings historiques restent accessibles, y compris avec une association canonique à examiner.
- My Shop conserve son comportement actuel, notamment ses onglets, filtres, appels et protections de concurrence.
- Aucune régression n’est détectée dans l’analyse d’image, la génération de mots-clés, la sélection, le brouillon, l’import, le scoring ou l’export Etsy.

## A7. Résultats de l’audit technique et fonctionnel

### Architecture et responsabilités confirmées

| Domaine | Fichiers principaux | Responsabilité confirmée |
|---|---|---|
| SEO Listings | `src/pages/ListingsByStatusPage.jsx`, `src/lib/listingStatuses.js` | Lit `v_dashboard_listings`, filtre `computed_status`, affiche les cinq étapes du Studio et lance les actions de masse Studio |
| My Shop | `src/pages/MyShopPage.jsx`, `src/components/shop/EtsyListingGrid.jsx`, `src/lib/my-shop-utils.js` | Charge le catalogue Etsy et les imports, assemble les lignes, filtre et dérive progrès/publication/action avec `getMyShopUxState()` |
| Création manuelle et Studio | `src/pages/ProductStudio.jsx`, `src/components/studio/ImageUpload.jsx`, `src/components/studio/ResultsDisplay.jsx` | Crée/hydrate `listings`, lance analyse, SEO et brouillon ; présente les résultats et les copies manuelles |
| Analyse image | `api/seo/analyze-image.ts`, `lib/ai/vision-analysis.ts`, `lib/ai/taxonomy-mapping.ts`, `server.mjs` | Vérifie le propriétaire, analyse l’image, mappe la taxonomie et persiste via l’Edge Function ; le serveur Express a la route miroir |
| Mots-clés et sélection | `api/seo/generate-keywords.ts`, `lib/seo/generate-keyword-pool.ts`, `lib/seo/enrich-keywords.ts`, `lib/seo/score-keywords.ts`, `lib/seo/select-and-score.ts`, `lib/seo/persist-seo.ts` | Génère, enrichit, score, sélectionne et persiste ; `reset-pool`, `recalculate-scores`, `user-keyword` et `add-from-favorite` complètent le parcours |
| Import/préparation Etsy | `api/etsy/import-listings.ts`, `api/etsy/prepare-listing.ts`, `lib/etsy/preparation-state.ts`, `lib/etsy/get-or-create-canonical-listing.ts`, `lib/etsy/prepare-etsy-image.ts` | Importe le snapshot Etsy, verrouille une préparation avec expiration, crée/réutilise une ligne Studio canonique |
| Scoring Etsy | `api/etsy/score-listings.ts`, `lib/etsy/claim-scoring.ts`, `lib/etsy/score-etsy-listing.ts` | Réserve atomiquement les imports scorables, analyse/scoring leurs tags et rattache la même ligne canonique |
| Publication Etsy | `api/etsy/export-listings.ts`, `lib/etsy/process-etsy-export.ts`, `lib/etsy/validate-export-listing.ts`, `lib/etsy/export-conflicts.ts`, `lib/etsy/proposals.ts` | Vérifie l’appartenance/lien, une proposition enregistrée, les conflits et la confirmation avant publication et relecture |

Les routes Etsy ci-dessus sont également présentes dans `server.mjs` (import, scoring, préparation, export). La lecture a confirmé la parité fonctionnelle de ces chemins ; elle ne remplace pas une recette exécutée des deux environnements.

### Origine et identité canonique

La migration `supabase/migrations/20260330_add_source_to_listings.sql` ajoute `listings.source` avec défaut `manual`; elle l’expose dans `v_dashboard_listings`. La fonction SQL de `supabase/migrations/20261018120000_etsy_canonical_listing.sql` crée une ligne avec `source = 'etsy'`, relie `etsy_listings.listing_id` et protège le lien par un index unique partiel. Le wrapper serveur est `getOrCreateCanonicalEtsyListing()`.

Pour l’affichage, `source` est l’indice prévu. Pour une capacité Etsy, l’interface ne doit pas se fonder sur lui seul : un lien `etsy_listings` appartenant à l’utilisateur, dont `listing_id` correspond, est requis côté serveur par `getOwnedLinkedEtsyListingForExport()` et les vérifications de publication. Les données historiques peuvent avoir une valeur `source` inattendue/absente ou un lien antérieur : le SQL de canonicalisation échoue volontairement plutôt que de remplacer une association incohérente. L’état réel de la base de production n’a pas été interrogé dans cet audit, donc ce risque n’est pas vérifié.

### Inventaire des états réellement utilisés

#### Pipeline Studio commun (`listings` / vue calculée)

`src/lib/listingStatuses.js` et `src/pages/ListingsByStatusPage.jsx` exposent les valeurs calculées suivantes :

| Valeur technique | Libellé actuel | Conditions/rôle observés | Action actuelle | Provenance |
|---|---|---|---|---|
| `NEW` | New | Listing créé ou remis au statut de départ ; image non analysée | Analyze Images / Analyze design | `v_listing_status` (définition non présente dans les migrations versionnées lues), `STATUS_CONFIG`, `ProductStudio` |
| `ANALYZED` | Analyzed | Analyse visuelle disponible, prêt pour la génération SEO | Generate Keywords | mêmes sources ; `is_image_analysed` est aussi suivi dans `ProductStudio` |
| `SEO_READY` | SEO Ready | Mots-clés générés, prêts à être revus/sélectionnés | Review, sans action de masse | mêmes sources |
| `DRAFT_READY` | Draft Ready | Sélection de 13 mots-clés, prêt pour le brouillon | Generate Drafts | mêmes sources |
| `OPTIMIZED` | Complete dans SEO Listings ; Optimized dans la configuration partagée | Titre, description et mots-clés prêts | View | mêmes sources |

`status_id` reste également écrit avec des UUID historiques (`NEW`, `SEO_DONE`, `COMPLETE`) dans `ProductStudio.jsx` et les handlers SEO. Les noms `ANALYZED`, `SEO_READY`, `DRAFT_READY` et `OPTIMIZED` sont donc des états **calculés de vue**, pas une seconde énumération stockée à substituer sans vérification de `v_listing_status`. La définition versionnée de cette vue n’est pas présente dans les fichiers examinés : les conditions exactes de ses transitions doivent être confirmées sur le schéma cible avant toute logique nouvelle.

`is_image_analysed` est un indicateur de fin d’analyse, et `is_generating_seo` est un indicateur de travail en cours/récupération de polling ; ils ne sont pas, seuls, les statuts UX complets. Les échecs du pipeline manuel sont remontés par la réponse API/toast et ne correspondent pas à une valeur d’erreur durable, homogène et exposée par `v_dashboard_listings` dans les fichiers lus.

#### Workflow Etsy (`etsy_listings`)

| Dimension / valeur technique | Rôle, apparition et transition | Libellé/action My Shop actuels | Provenance |
|---|---|---|---|
| `preparation_status = pending` | Import existant sans préparation terminée ; peut être revendiqué | Preparation required / Optimize ou Ready to score / Score SEO selon `listing_id` | migration `20261103120000`, `getMyShopUxState()` |
| `preparing` | Revendication serveur active, expirant après 10 minutes ; `pending`/`error` ou claim expiré → `preparing` | Preparing for Studio / In progress | `claimEtsyListingForPreparation()` |
| `prepared` | Ligne Studio canonique valide créée/réutilisée ; la préparation n’implique ni analyse ni mots-clés | Sert de précondition ; la suite dépend de `scoring_status` | `completeEtsyListingPreparation()` |
| `error` (préparation) | Échec de préparation, retry autorisé ; l’erreur utilisateur est persistée | Preparation needs retry / Retry preparation | `failEtsyListingPreparation()`, `getMyShopUxState()` |
| claim `preparing` expiré | État bloqué récupérable ; le navigateur offre un retry, serveur autoritaire | Preparation needs retry / Retry preparation | `isPreparationClaimExpired()` |
| `scoring_status = pending` | Import non scoré ; score possible seulement avec `listing_id` et hors préparation active | Ready to score / Score SEO, sinon Preparation required | `claim-scoring.ts`, `getMyShopUxState()` |
| `scoring` | Travail de scoring réservé atomiquement | Scoring in progress / In progress | `claimScoreableEtsyListingsForScoring()` |
| `scored` | Score des tags de l’import calculé ; ne prouve ni sélection finale ni proposition publiable | Continue in Studio, ou SEO proposal ready si proposition sauvegardée | `score-etsy-listing.ts`, `getMyShopUxState()` |
| `error` (scoring) | Analyse/enrichissement/scoring a échoué ; retry autorisé | Scoring failed / Retry | `scoreEtsyListing()` |
| `export_status = pending` | Pas de publication vérifiée | Not ready | migration export et `getMyShopUxState()` |
| `exported` | Publication vérifiée ; redevient « ready » si une nouvelle proposition sauvegardée existe | Published (verified) / View details | `processEtsyExportItem()` |
| `partial` | Publication d’une partie des champs ; attention requise | Publication partial / Review & publish | mêmes sources |
| `error` (export) | Échec de publication | Publication failed / Review & publish | mêmes sources |
| `conflict` | Changement Etsy/conflit de baseline exige une revue | Review required / Review & publish | migration `20261017120000`, export conflict flow |
| `published_unverified` | PATCH probablement réussi, mais relecture non complète | Publication needs verification / Verify publication | mêmes sources |

Les valeurs historiques documentées comprennent donc les UUID `status_id`, `SEO_DONE` et `COMPLETE`, l’ancien statut d’export étendu par migration, et les imports antérieurs à `preparation_status`. La migration de préparation marque les liens canoniques valides existants comme `prepared`, mais conserve les liens suspects à `pending`; elle ne les répare pas.

### Matrice d’harmonisation proposée — à valider en phase 1

Cette matrice est une proposition de présentation, pas une décision validée ni une nouvelle machine d’état. Elle montre que les cinq libellés provisoires ne suffisent pas seuls : « En cours » doit conserver une précision accessible et « Mots-clés prêts » ne doit pas couvrir un brouillon ou une publication.

| Origine | État réel prioritaire | Analyse image | Mots-clés | Statut SEO proposé | Action principale | État Etsy complémentaire |
|---|---|---|---|---|---|---|
| Manuel | `NEW`, pas d’analyse | Disponible | Non disponible | À analyser | Analyser l’image | — |
| Etsy | Import sans lien canonique / préparation `pending` | Non disponible avant préparation | Non disponible | À préparer | Préparer pour le Studio | Non publié |
| Etsy | préparation `preparing` ou scoring `scoring` | Selon étape | Selon étape | En cours — préparation/scoring | Attendre | Non publié |
| Etsy | préparation/scoring `error` ou claim expiré | Retry applicable | Non fiable | Erreur — préparation/scoring | Réessayer | Non publié |
| Manuel ou Etsy | `ANALYZED` | Prête | À générer | À générer | Générer les mots-clés | Etsy : Non publié |
| Manuel ou Etsy | génération SEO active (`is_generating_seo`) | Prête | En cours | En cours — génération SEO | Attendre | Etsy : Non publié |
| Manuel ou Etsy | `SEO_READY` | Prête | Disponibles, sélection à revoir | Mots-clés prêts | Ouvrir et sélectionner | Etsy : Non publié |
| Manuel ou Etsy | `DRAFT_READY` | Prête | Sélectionnés | Prêt pour le brouillon | Générer le brouillon | Etsy : Non publié |
| Manuel | `OPTIMIZED` | Prête | Sélectionnés | Optimisé — à copier | Ouvrir / Copier | — |
| Etsy | `OPTIMIZED`, proposition sauvegardée et `scored` | Prête | Sélectionnés/proposition prête | Optimisé — à publier | Réviser et publier | Prêt à réviser |
| Etsy | export `exported`, aucune proposition nouvelle | Prête | Historique disponible | Optimisé | Voir les détails | Publié (vérifié) |
| Etsy | export `partial`, `error`, `conflict` ou `published_unverified` | Inchangé | Inchangé | Optimisé (SEO) | Réviser / vérifier | Attention requise |

Priorité de présentation recommandée : erreur/claim expiré > travail en cours > précondition de préparation > pipeline SEO commun > publication Etsy. Ainsi, une erreur de publication ne masque pas le fait que le SEO est prêt, mais elle garde une alerte Etsy visible et actionnable.

### Composants et fonctions réutilisables

- `src/lib/listingStatuses.js` : libellés, ordre et métadonnées du pipeline Studio à consolider plutôt que dupliquer.
- `src/lib/my-shop-utils.js` : `getMyShopUxState()`, `isScoreableEtsyListing()`, `isReviewableListing()` et les protections de retry/expiration. À consommer ou extraire prudemment, sans modifier le comportement de My Shop.
- `src/components/shop/EtsyListingGrid.jsx` : structure responsive de ligne, badges publication et vocabulaire d’action Etsy ; une réutilisation directe doit éviter de coupler SEO Listings à My Shop.
- `src/pages/ListingsByStatusPage.jsx` : la source actuelle des statuts calculés, des filtres par onglet et des actions de masse manuelles.
- `src/pages/ProductStudio.jsx` et `src/components/studio/ResultsDisplay.jsx` : hydratation et actions du Studio, à conserver comme destination des actions « Ouvrir/Continuer ».
- `src/lib/my-shop-utils.js#mergeEtsyListings` et la contrainte canonique SQL : à préserver pour ne pas réintroduire les doublons.

## A8. Risques et points ouverts

1. **Vue de statut non versionnée dans les migrations lues.** `v_dashboard_listings` consomme `v_listing_status`, mais sa définition n’est pas disponible dans les migrations inspectées. Les conditions exactes de `computed_status` doivent être lues sur le schéma cible avant de dériver de nouveaux états client.
2. **Erreur manuelle non normalisée.** Les erreurs d’analyse/génération manuelles semblent être des erreurs de requête/polling et non une valeur persistée dans la projection de SEO Listings. Un badge « Erreur » commun ne doit pas inventer une donnée durable sans décision technique.
3. **Préparation ≠ SEO.** `prepared` signifie seulement qu’une ligne canonique est prête. La mapper à « Mots-clés prêts » serait incorrect.
4. **Concurrence et expirations.** Les claims de préparation expirent en dix minutes et les claims de scoring sont atomiques. Toute UI de retry doit conserver le serveur comme autorité et ne jamais contourner les prédicats actuels.
5. **Historique et identité.** Les associations Etsy/listing incohérentes sont volontairement bloquées par la canonicalisation. Les données réelles n’ont pas été inspectées ; aucun correctif de masse ne doit être ajouté à cette refonte.
6. **Publication distincte.** `export_status` peut être `conflict`, `partial` ou `published_unverified`; réduire ces cas à un seul « Erreur » ferait perdre des actions importantes.
7. **Restrictions Etsy.** Une origine affichée ne doit pas devenir le contrôle d’accès. L’export doit continuer à vérifier côté serveur le lien, l’utilisateur, la connexion, le scoring et les propositions.
8. **Parité Vercel/Express.** Toute future extension backend exige une comparaison des routes `api/etsy/*` et de `server.mjs` ; l’audit ne justifie aucun changement backend à ce stade.

### Points à décider en phase 1

- Valider le jeu final de statuts : conserver les cinq proposés, ou ajouter explicitement « À préparer », « Prêt pour le brouillon » et « Optimisé ».
- Choisir le rendu de publication : colonne dédiée (recommandée) ou badge secondaire.
- Définir la source des états Etsy dans SEO Listings : jointure/projection existante si disponible, ou enrichissement client minimal ; ne pas choisir une migration sans preuve qu’elle est nécessaire.
- Définir le comportement des lignes avec origine inconnue ou lien Etsy historique incohérent (afficher et orienter vers support, sans autoriser l’export).
- Confirmer si SEO Listings doit proposer les mêmes actions de masse aux imports Etsy ; ce n’est pas requis par l’option B et présente un risque plus élevé qu’un lien vers My Shop/Studio.

## Stratégie d’implémentation minimale recommandée

Après validation UX, limiter l’intervention à SEO Listings : conserver `v_dashboard_listings` pour le pipeline Studio, afficher `source` sous forme de badge, et joindre/lire les métadonnées Etsy strictement nécessaires pour un badge de publication et une navigation sûre. Réutiliser les définitions de statut et des helpers purs ; ne pas modifier My Shop, les tables, les routes ni les transitions. Pour les états sans donnée persistée fiable (notamment erreur manuelle), afficher le dernier statut calculé et traiter les erreurs de requête dans le flux qui les déclenche, plutôt que créer un faux statut global.

La validation de phase 1 doit au minimum couvrir, dans une maquette ou un contrat de rendu : manuel `NEW`/`ANALYZED`/`SEO_READY`/`DRAFT_READY`/`OPTIMIZED`; Etsy non préparé, préparation/scoring en cours/en erreur, Etsy avec proposition prête, export vérifié, conflit/partiel/non vérifié ; et un historique ambigu sans action Etsy.

## A9. Journal des décisions

| Date | Décision / constat | Statut | Justification |
|---|---|---|---|
| 4 novembre 2026 | Option B : statut SEO commun + origine distincte | Validé | Décision UX fournie avec la mission |
| 4 novembre 2026 | La publication Etsy est une dimension complémentaire, pas le statut SEO principal | Validé par les principes | Évite de confondre travail SEO et synchronisation distante |
| 4 novembre 2026 | La matrice de cette roadmap et ses libellés supplémentaires restent à décider | À valider | Ils sont déduits du code, pas fournis comme décision produit |
| 4 novembre 2026 | Phase 0 terminée | Confirmé | Roadmap créée, architecture/stats/origine/matrice/risques audités en lecture seule |
| 4 novembre 2026 | Phase 1, libellés SEO, filtres origine et action « Ouvrir » | Validé | Décisions UX communiquées pour la phase 2 |
| 4 novembre 2026 | Définition de `v_listing_status` | Confirmé | Ordre Supabase : titre+description, 13 évaluations, pool, analyse, nouveau |
| 4 novembre 2026 | Phase 2 — plan technique | Terminé | Plan A11 complet ; aucune implémentation autorisée avant validation explicite |

## A10. Phase 1 — Conception UX validée

Cette section formalise la conception minimale validée. Elle ne modifie pas le pipeline, le schéma ni My Shop. Les précisions de la phase 2 (statut SQL confirmé, libellés finaux et plan) prévalent lorsqu’elles complètent cette section.

### Vérification du pipeline SEO commun

La définition SQL actuellement déployée de `v_listing_status` n’est pas présente dans les migrations versionnées du dépôt. `supabase/config.toml` ne fournit pas non plus un environnement local de base de données utilisable pour une interrogation sûre. Aucune connexion Supabase n’a donc été ouverte pendant cette phase.

Les sources locales corroborent cependant le contrat suivant :

| Statut calculé | Signification confirmée par le code local | Preuves locales |
|---|---|---|
| `NEW` | Aucun état aval ne s’applique. L’image doit être analysée. | `src/lib/listingStatuses.js`; le seeder crée les exemples `NEW` avec `is_image_analysed = false` |
| `ANALYZED` | L’analyse image est achevée, mais aucun pool SEO courant ne place le listing plus loin dans le pipeline. | `supabase/functions/save-image-analysis/index.ts` écrit `is_image_analysed = true`; `scripts/seed-dashboard-mock.sql` |
| `SEO_READY` | Un pool de mots-clés courant existe ; l’utilisateur doit encore revoir/sélectionner les mots-clés. Ce statut ne garantit pas 13 sélections. | `scripts/seed-dashboard-mock.sql` (pool courant et moins de 13 `is_current_eval`); `src/components/dashboard/NextActions.jsx` |
| `DRAFT_READY` | Au moins 13 mots-clés sont dans l’évaluation courante, mais le listing ne possède pas encore simultanément un titre et une description générés. Il est prêt pour la génération de brouillon. | `scripts/seed-dashboard-mock.sql`; `src/pages/ListingsByStatusPage.jsx`; `src/components/dashboard/NextActions.jsx` |
| `OPTIMIZED` | `generated_title` et `generated_description` existent. Pour un manuel, cela signifie que le contenu est prêt à consulter/copier ; ce n’est pas une publication Etsy. | `scripts/seed-dashboard-mock.sql`; `api/seo/generate-draft.ts` persiste les deux champs avant de marquer l’ancien `status_id` COMPLETE |

L’ordre de priorité documentaire issu de `docs/context.md` est : titre **et** description générés → `OPTIMIZED`; 13+ `is_current_eval` → `DRAFT_READY`; au moins un `is_current_pool` → `SEO_READY`; `is_image_analysed` → `ANALYZED`; sinon `NEW`. Cette description est cohérente avec le seeder et les composants, mais ne remplace pas la définition SQL déployée : elle reste à vérifier avant toute implémentation qui s’y appuierait.

Pour cette vérification manuelle, exécuter strictement les requêtes de lecture suivantes dans le SQL Editor Supabase :

```sql
-- Définition effective de la vue utilisée par SEO Listings.
SELECT pg_get_viewdef('public.v_listing_status'::regclass, true) AS view_definition;

-- Vues et relations directement référencées par v_listing_status.
SELECT
  dependent_ns.nspname AS view_schema,
  dependent.relname AS view_name,
  referenced_ns.nspname AS referenced_schema,
  referenced.relname AS referenced_relation,
  referenced.relkind AS referenced_kind
FROM pg_depend AS dependency
JOIN pg_rewrite AS rewrite_rule ON rewrite_rule.oid = dependency.objid
JOIN pg_class AS dependent ON dependent.oid = rewrite_rule.ev_class
JOIN pg_namespace AS dependent_ns ON dependent_ns.oid = dependent.relnamespace
JOIN pg_class AS referenced ON referenced.oid = dependency.refobjid
JOIN pg_namespace AS referenced_ns ON referenced_ns.oid = referenced.relnamespace
WHERE dependent.oid = 'public.v_listing_status'::regclass
  AND dependency.deptype = 'n'
ORDER BY referenced_ns.nspname, referenced.relname;
```

Résultat attendu : confirmer les prédicats et leur ordre, notamment le seuil exact des `is_current_eval`, la présence éventuelle de filtres d’archivage/soft-delete, et toute dépendance non visible dans le dépôt. Aucun résultat n’est présumé dans cette roadmap.

### Statuts UX : simplification recommandée

**Recommandation à valider :** conserver exactement les cinq étapes du pipeline SEO comme seuls statuts principaux.

| Valeur technique | Libellé UX proposé | Action de consultation |
|---|---|---|
| `NEW` | À analyser | Ouvrir le listing |
| `ANALYZED` | À générer | Ouvrir le listing |
| `SEO_READY` | Mots-clés prêts | Ouvrir le listing |
| `DRAFT_READY` | Brouillon prêt | Ouvrir le listing |
| `OPTIMIZED` | Optimisé | Ouvrir le listing |

`En cours` et `Erreur` ne doivent pas devenir des étapes supplémentaires ni des filtres de pipeline. Ce sont des **indicateurs contextuels de la ligne**, affichés à côté/sous le statut SEO lorsqu’une donnée fiable les justifie :

- **En cours** : seulement quand une opération active est réellement observable — `is_generating_seo = true` pour une génération SEO, `preparation_status = preparing` ou `scoring_status = scoring` pour Etsy. Le statut SEO principal reste le dernier état calculé connu.
- **Attention / erreur** : seulement pour les erreurs Etsy persistées (`preparation_status = error`, claim de préparation expiré, `scoring_status = error`, ou les états publication `error`/`partial`/`conflict`/`published_unverified`). Le libellé doit préciser l’étape : « Préparation à réessayer », « Scoring à réessayer » ou « Publication à vérifier ».
- **Erreur manuelle** : ne pas afficher un badge persistant global. Les sources lues remontent l’échec d’analyse/génération à l’appel qui l’a déclenché, sans état d’erreur homogène dans `v_dashboard_listings`. Le créer serait une modification métier non justifiée.

Cette simplification masque une information nécessaire si elle réduit une erreur de publication à « Erreur » ou si elle présente `prepared` comme « Mots-clés prêts ». La première conserve donc le statut SEO et ajoute un indicateur Etsy, la seconde reste une précondition technique Etsy hors du pipeline principal.

### Interface minimale recommandée

Conserver la structure de table actuelle de `src/pages/ListingsByStatusPage.jsx`; aucune nouvelle grille ni nouveau composant de ligne n’est nécessaire à la conception.

1. **En-tête et recherche existants** : préserver recherche, tri/date et navigation actuelle. La recherche doit continuer de porter au minimum sur le titre.
2. **Filtres d’origine** : ajouter un contrôle compact `Tous | Etsy | Manuel`, indépendant du filtre de statut SEO existant. La valeur par défaut est `Tous`.
3. **Filtre de statut SEO** : conserver les cinq filtres actuels, avec les libellés français proposés ci-dessus. Il filtre exclusivement `computed_status`, jamais la préparation/scoring/publication Etsy.
4. **Ligne unifiée** : conserver image, nom, score, statut principal, date et action. Sous le nom, remplacer/compléter le thème actuel par un badge ou texte discret `Etsy` / `Manuel` ; cette disposition est déjà compatible avec la zone secondaire de la ligne.
5. **Information Etsy complémentaire** : seulement pour une relation Etsy fiable, afficher un texte secondaire compact : `Préparation en cours`, `Scoring à réessayer`, `Prêt à publier`, `Publié`, ou `Publication à vérifier`. Une ligne manuelle n’affiche aucun équivalent artificiel.
6. **Action primaire unique** : `Ouvrir` vers le Studio dans tous les cas. Elle n’exécute ni analyse, ni génération, ni export depuis la liste. Les actions détaillées et l’export restent dans le Studio/My Shop existants.

Cette proposition est plus sûre que de réutiliser les actions de masse de SEO Listings pour Etsy : les boutons de masse actuels transmettent directement les routes de pipeline Studio et ne sont pas conditionnés par le lien Etsy canonique. La conservation d’`Ouvrir` comme action primaire évite de créer une seconde surface de workflow.

### Matrice des actions

| Origine / intégrité | Statut SEO | Indicateur contextuel | Action dans SEO Listings | Capacités conservées hors de la liste |
|---|---|---|---|---|
| Manuel (`source = manual` ou absent sans lien Etsy) | N’importe lequel | Aucun | Ouvrir | Analyse, génération, sélection, brouillon et copie dans Studio ; jamais export Etsy |
| Etsy lié canoniquement et appartenant à l’utilisateur | `NEW` / `ANALYZED` / `SEO_READY` / `DRAFT_READY` / `OPTIMIZED` | Aucun | Ouvrir | Opérations Studio ; préparation/scoring/import depuis My Shop ; export seulement via le flux existant validé côté serveur |
| Etsy lié canoniquement | N’importe lequel | `preparing` ou `scoring` | Ouvrir (lecture/attente) | My Shop reste l’autorité de progression et retry |
| Etsy lié canoniquement | N’importe lequel | préparation/scoring en erreur ou claim expiré | Ouvrir ; signaler l’action à effectuer dans My Shop | Retry via le workflow existant, soumis aux claims serveur |
| Etsy lié canoniquement | `OPTIMIZED` | Proposition prête / statut publication prêt | Ouvrir | Revue puis publication dans le flux Etsy existant, avec pré-vérification et confirmation |
| Etsy lié canoniquement | N’importe lequel | export vérifié ou attention publication | Ouvrir | Consulter/résoudre dans le flux d’export existant |
| `source = etsy` mais aucun lien Etsy fiable, ou lien incohérent | N’importe lequel | `Connexion Etsy à vérifier` | Ouvrir sans action Etsy | Ne proposer ni retry Etsy ni export ; journaliser/traiter par la procédure de réparation approuvée |
| `source = manual` mais lien Etsy existant | N’importe lequel | `Origine à vérifier` | Ouvrir sans action Etsy ajoutée par la liste | Ne pas corriger automatiquement ; le serveur reste l’autorité pour toute publication |

Une relation Etsy fiable signifie au minimum que la ligne `etsy_listings` correspondante possède le même `listing_id`, appartient à l’utilisateur et est liée à la connexion Etsy active. C’est la règle effectivement imposée par `getOwnedLinkedEtsyListingForExport()` dans `lib/etsy/validate-export-listing.ts`; `source` ne peut servir qu’à l’affichage/au filtrage initial.

### Réutilisation à privilégier

- `src/pages/ListingsByStatusPage.jsx` : page, chargement, filtres de pipeline, sélection/navigation et structure de ligne existants.
- `src/lib/listingStatuses.js` : ordre, action descriptive et métadonnées des cinq états. Centraliser les libellés français dans ce module lors de l’implémentation plutôt que définir une seconde table locale.
- `src/components/dashboard/ListingsTable.jsx` et `src/components/studio/RecentOptimizations.jsx` : précédent concret d’un badge Etsy rendu à partir de `source`; l’emplacement demandé sous le nom est cependant plus explicite et accessible.
- `src/lib/my-shop-utils.js` : lecture normalisée et non destructive des états de préparation, scoring et publication. Ne pas déplacer ni modifier ses règles dans cette phase.
- `src/components/shop/EtsyListingGrid.jsx` : vocabulaire existant des indicateurs de publication et actions de My Shop, à reprendre seulement si un texte/badge complémentaire est nécessaire.

### Ambiguïtés et décisions nécessitant validation

1. **Vue déployée à confirmer.** Exécuter les deux requêtes SQL de lecture ci-dessus et fournir le résultat avant que l’implémentation dépende de seuils exacts.
2. **Libellés retenus.** Valider les cinq libellés : « À analyser », « À générer », « Mots-clés prêts », « Brouillon prêt », « Optimisé ».
3. **Filtrage origine.** Valider le contrôle `Tous | Etsy | Manuel`, avec `source` pour le filtre visuel, tout en traitant les anomalies séparément.
4. **États Etsy visibles.** Valider l’affichage limité aux indicateurs contextuels ci-dessus et l’absence d’un filtre technique Etsy supplémentaire dans cette première itération.
5. **Surface d’action.** Valider `Ouvrir` comme unique action primaire. Cette décision conserve les actions Etsy sensibles dans leurs flux actuels et minimise le risque de régression.
6. **Anomalies historiques.** Décider si la ligne doit afficher un message discret « Origine/connexion à vérifier » ou être masquée d’un filtre Etsy tant que son lien canonique n’est pas validé. Aucune correction automatique n’est recommandée.

### Critères de sortie de la phase 1

La phase 1 ne sera terminée qu’après validation explicite des six décisions ci-dessus, et après réception/confirmation de la définition effective de `v_listing_status`. À ce stade, la conception est proposée, pas validée.

> Mise à jour phase 2 : la conception est désormais validée. La règle déployée de `v_listing_status` est confirmée, dans cet ordre : `OPTIMIZED` lorsque `generated_title` et `generated_description` sont non nuls ; `DRAFT_READY` à partir de 13 lignes `is_current_eval = true` ; `SEO_READY` avec au moins une ligne `is_current_pool = true` ; `ANALYZED` lorsque `is_image_analysed = true` ; sinon `NEW`.

## A11. Phase 2 — Plan technique proposé

### Données disponibles et lecture minimale

`v_dashboard_listings`, déjà interrogée par `src/pages/ListingsByStatusPage.jsx`, fournit `id` (navigation Studio), `source` (origine déclarée), `computed_status` (statut SEO), ainsi que titre, image, score et date. Elle ne fournit pas les états de préparation, scoring ou publication Etsy.

Le plan ne modifie ni la vue ni le backend : dans la page SEO Listings, ajouter une seconde lecture **en lecture seule** de `etsy_listings`, limitée aux champs `listing_id`, `preparation_status`, `preparation_claim_expires_at`, `scoring_status`, `export_status`, `prepared_at`, `scored_at` et `last_exported_at`, puis construire une map par `listing_id`.

| Cas de relation | Origine rendue | Capacité Etsy rendue |
|---|---|---|
| `source = etsy` + même `listing_id` dans `etsy_listings` | Etsy | Information secondaire seulement |
| Aucune relation Etsy + `source = manual`, absent ou historique | Manuel | Aucune |
| `source = etsy` sans relation, ou relation Etsy avec une autre source | Origine à vérifier | Aucune |

Cette map est une projection d’interface, jamais une autorisation. Toute publication reste protégée côté serveur par `getOwnedLinkedEtsyListingForExport()` (`user_id`, `listing_id`, connexion Etsy active).

### Nuance sur sélection, rédaction et publication

`is_current_eval = true` est bien la sélection courante utilisée par la rédaction : `api/seo/generate-draft.ts` lit ces mots-clés, `ProductStudio.jsx` les met à jour à la sélection/recalculation et `lib/seo/persist-strength.ts` les persiste. Il justifie donc le seuil `DRAFT_READY`.

Il ne signifie pas qu’une proposition Etsy est publiable. `is_proposal_selected` et `etsy_proposal_fields`, introduits par `supabase/migrations/20261101120000_explicit_etsy_tag_proposals.sql`, sont les données distinctes lues par `lib/etsy/process-etsy-export.ts`. `OPTIMIZED` signifie seulement que titre et description existent ; il ne confirme ni une proposition Etsy explicite ni une publication.

### Modifications minimales après validation

1. Créer un helper pur de présentation, par exemple `src/lib/seo-listings-utils.js`. Il reçoit une ligne de `v_dashboard_listings`, sa relation Etsy éventuelle et l’horodatage courant, puis retourne l’origine, le libellé SEO déjà calculé et une notice Etsy secondaire. Il ne recalcule jamais `computed_status`.
2. Ajouter ses tests unitaires selon la convention de `tests/unit/my-shop-utils.test.ts`.
3. Modifier `src/pages/ListingsByStatusPage.jsx` : charger les deux sources en parallèle, joindre en mémoire, ajouter le filtre d’origine `Tous | Etsy | Manuel`, puis combiner ce filtre avec le filtre `computed_status` et la recherche existante.
4. Conserver la grille et la navigation existantes. Sous le titre, afficher l’origine puis, seulement pour une relation Etsy fiable, une notice courte. Conserver une action unique « Ouvrir » vers le Studio.
5. Centraliser les libellés SEO validés dans `src/lib/listingStatuses.js` seulement si cela ne change pas les textes hors périmètre. Sinon, ajouter le mapping de présentation au nouveau helper plutôt que modifier Dashboard/My Shop.
6. Ne modifier ni `src/pages/MyShopPage.jsx`, ni `src/lib/my-shop-utils.js`, ni les routes Etsy/IA, ni `server.mjs`, ni les migrations ou vues SQL.

### Cas particuliers

| Situation | Présentation dans SEO Listings |
|---|---|
| Import Etsy sans ligne `listings` préparée | N’apparaît pas : il reste dans My Shop, ce qui évite un faux listing Studio |
| Préparation ou scoring Etsy en cours | Statut SEO inchangé + « Préparation en cours » / « Scoring en cours » |
| Préparation/scoring en erreur ou claim expiré | Statut SEO inchangé + « À réessayer dans My Shop » |
| Export `exported` | Statut SEO inchangé + « Publié » |
| Export `partial`, `error`, `conflict`, `published_unverified` | Statut SEO inchangé + « Publication à vérifier » |
| Manuel avec titre et description | `OPTIMIZED` / « Contenu généré », sans information Etsy |
| Lien canonique absent ou incohérent | « Origine à vérifier », ligne ouvrable, aucune action Etsy |
| Résultat vide après filtres | Conserver l’état vide, citer les filtres actifs et proposer de les effacer |

### Plan de tests

| Niveau | Couverture |
|---|---|
| Helper unitaire | Cinq statuts, trois rendus d’origine, opérations Etsy en cours/en erreur, claim expiré, publication vérifiée/à vérifier et incohérences |
| Page ciblée | Combinaisons `Tous`/`Etsy`/`Manuel` + statut + recherche, état vide, clic ligne/bouton vers le bon `listingId` |
| Régression | Limites/sélections d’actions de masse actuelles, aucune action d’export Etsy rendue ou appelée depuis SEO Listings |
| Régression My Shop | `tests/unit/my-shop-utils.test.ts` passe sans modification ; My Shop reste inchangé |
| Validation projet | Tests ciblés, `npm test`, `npm run typecheck`, `npm run build`, puis `npm run lint` en distinguant les écarts historiques des régressions nouvelles |

### Risques, dépendances et sortie de phase

- La lecture complémentaire dépend de l’accès RLS existant à `etsy_listings`, déjà consommé par My Shop. Si elle échoue, conserver la liste et les statuts SEO issus de la vue, masquer les notices Etsy et ne jamais inférer une capacité Etsy depuis `source`.
- Les données historiques incohérentes restent visibles et non réparées ; aucune action Etsy ne leur est proposée.
- Le helper de présentation ne remplace pas `getMyShopUxState()` : il évite ainsi de dupliquer ou altérer My Shop.

La phase 2 est terminée : le plan est complet, n’exige aucune migration, aucun changement backend et aucun changement de My Shop. L’implémentation attend la validation explicite de ce plan.

## A12. Phase 3 — Implémentation locale

Statut : implémentation locale terminée le 4 novembre 2026 ; phase 3 reste en attente de validation visuelle et produit avant commit ou déploiement.

### Réalisation

- Ajout de `src/lib/seo-listings-utils.js`, helper pur qui ne recalcule jamais `computed_status`. Il détermine l’origine présentée, les incohérences confirmées de lien, et les notices Etsy secondaires.
- Mise à jour de `src/pages/ListingsByStatusPage.jsx` : lecture groupée et en lecture seule de `v_dashboard_listings` et `etsy_listings`, fusion en mémoire par `listing_id`, filtre `Tous | Etsy | Manuel`, recherche titre, libellés SEO validés, origine sous le titre et notice Etsy secondaire.
- L’échec de la lecture Etsy conserve l’affichage SEO normal et masque les notices, sans transformer l’absence de données en incohérence.
- Aucune action Etsy n’est ajoutée : la seule action de ligne reste « Ouvrir » vers le Studio. My Shop, les routes, le pipeline IA, les migrations et les vues restent inchangés.

### Tests et validations exécutés

- `npm test -- tests/unit/seo-listings-utils.test.ts tests/unit/my-shop-utils.test.ts` : 2 fichiers, 20 tests réussis.
- `npm test` : 54 fichiers, 346 tests réussis.
- `npm run typecheck` : réussi.
- `npm run build` : réussi. Le premier essai a été bloqué par le sandbox Windows à la lecture de la configuration Vite ; le relancement autorisé a terminé avec succès. Le corpus d’aide régénéré par le build a été restauré, car il ne fait pas partie de cette modification.
- `npm run lint` : échec sur 100 erreurs et 36 avertissements historiques hors périmètre. Aucun nouvel erreur de lint n’est rapporté dans les fichiers modifiés ; `ListingsByStatusPage.jsx` conserve l’avertissement historique de dépendance `useEffect`.

### Limitations à vérifier visuellement

- Confirmer sur un compte comportant des imports Etsy que la RLS autorise la lecture client des métadonnées minimales `etsy_listings`.
- Vérifier les retours mobile de la barre filtres/recherche et la lisibilité des notices longues sous le titre.
- Vérifier avec des données historiques une origine absente, un lien canonique incohérent et un échec RLS ; aucune réparation automatique n’est déclenchée.

## A13. Phase 4B — Correctif React et préparation Preview

Statut : correctif local et validations automatisées terminés le 4 novembre 2026 ; aucun commit, push ni déploiement Preview n’a été réalisé. La phase 4 reste ouverte.

### Correctif minimal

- `fetchListings` est désormais mémorisé avec `useCallback` et dépend seulement de `user`.
- L’effet de chargement dépend de `user` et de cette fonction mémorisée. Les mises à jour de filtres, de chargement et de résultats ne recréent donc pas le callback et ne relancent pas les deux requêtes.
- Le comportement de chargement, l’échec non bloquant de lecture Etsy, les filtres et la navigation n’ont pas été modifiés. My Shop, les routes Etsy/IA, les migrations et les règles RLS restent inchangés.

### Validations exécutées

- `npm test -- tests/unit/seo-listings-utils.test.ts tests/unit/my-shop-utils.test.ts` : 20 tests réussis.
- `npm test` : 54 fichiers, 346 tests réussis.
- `npm run typecheck` : réussi.
- `npx eslint src/pages/ListingsByStatusPage.jsx src/lib/seo-listings-utils.js tests/unit/seo-listings-utils.test.ts` : réussi sans erreur ni avertissement.
- `npm run build` : réussi. Le corpus d’aide régénéré pendant le build a été restauré, car il est hors périmètre.
- `git diff --check` : réussi.

### Vérification Preview et condition d’arrêt

- Le remote GitHub est bien `origin` et `main` résout vers `1e2072907c07c1c444099d6bf6a91511abfb9606`. La branche distante `feature/seo-listings-unification` n’existe pas.
- `vercel.json` ne contient que les règles de build/réécriture. Le dépôt ne contient ni liaison de projet Vercel versionnée, ni workflow de déploiement, et le CLI Vercel n’est pas disponible dans l’environnement.
- Il est donc impossible de vérifier sans accès Vercel authentifié et sans exposer de secrets : les variables Preview (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, clés serveur requises), le projet Supabase ciblé, les URLs de redirection Supabase, `APP_URL`, `ETSY_OAUTH_REDIRECT_URI`, la protection d’accès Preview et le risque d’utilisation de données Production.
- Aucun commit, push, branche distante ni Preview n’est créé tant que ces éléments ne sont pas explicitement confirmés dans Vercel/Supabase. Aucun déploiement Production n’est autorisé.

### Validation UX restante

- Après publication Production, utiliser une session Supabase légitime, avec au moins un listing Etsy lié canoniquement et un listing manuel.
- Vérifier les cinq libellés, les filtres origine/statut/recherche combinés, les notices Etsy, « Ouvrir » vers le Studio, l’absence d’export Etsy pour le manuel, les états vide/erreur et les rendus desktop/mobile.
- Ne déclencher ni génération IA, ni préparation/scoring/publication Etsy, ni modification de données pendant cette validation.

## A14. Publication Production

Statut : publication autorisée après validations automatisées ; la validation UX et fonctionnelle authentifiée reste à effectuer manuellement sur `pennyseo.ai` après le déploiement.

La publication n’autorise aucune modification de My Shop, de Supabase, des routes Etsy/IA ni des données utilisateur. La phase 4 ne sera clôturée qu’après la validation Production documentée.

## A15. Correctif linguistique — SEO Listings en anglais

Statut : correctif local en attente de commit et de déploiement. Le périmètre est strictement linguistique : aucune règle métier, valeur technique, requête, filtre ou présentation structurelle n’est modifiée.

- Statuts : `To Analyze`, `To Generate`, `Keywords Available`, `Ready to Draft` et `Content Generated`.
- Origines et actions : `All`, `Etsy`, `Manual`, `Verify Origin` et `Open`.
- Recherche et état vide : `Search listings...` et `No listings match the current filters.`
- Notices Etsy : `Preparation in progress`, `Preparation needs retry in My Shop`, `Scoring in progress`, `Scoring needs retry in My Shop`, `Publication needs verification` et `Published`.

Les tests unitaires du helper couvrent ces chaînes visibles. La validation Production devra confirmer l’absence de texte français résiduel dans SEO Listings avant la clôture de la phase 4.
