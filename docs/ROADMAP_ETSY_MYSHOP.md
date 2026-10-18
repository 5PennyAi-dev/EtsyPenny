# PennySEO — Feuille de route : gestion des produits Etsy et refonte de My Shop

> **Document de suivi et de transfert de contexte**
> **Date de création :** 17 octobre 2026
> **Dernière mise à jour :** 17 octobre 2026
> **Statut global :** cadrage terminé, audit initial reçu; vérification ciblée de sécurité à lancer
> **Phase active :** 0B — Permissions Supabase validées en production ; validation des associations à déployer
> **Dépôt :** https://github.com/5PennyAi-dev/EtsyPenny
> **Destination recommandée dans le dépôt :** `docs/ROADMAP_ETSY_MYSHOP.md`
> **Document directeur complémentaire :** `docs/ROADMAP.md` (vérifier la casse et l'existence dans le dépôt avant de créer un lien).

## 1. À quoi sert cette feuille de route ?

Conserver **le contexte, les décisions, les constats de l'audit, les travaux restant à faire, les validations et l'historique des changements** pour pouvoir reprendre le chantier sans repartir de zéro, y compris dans une nouvelle session ChatGPT ou Codex.

**Règle de tenue à jour :** après chaque intervention, mettre à jour la phase active, les cases à cocher, les preuves de validation, les décisions et le journal de progression. Ne jamais marquer une tâche comme terminée sur la seule base d'une proposition ou d'un prompt.

### Légende des statuts

- `[x]` : terminé et vérifié selon le niveau de preuve indiqué.
- `[ ]` : non terminé / non confirmé.
- **Confirmé par lecture du code** : conclusion du premier rapport Codex, *sans validation en conditions réelles*.
- **À confirmer en production** : les migrations ou le code ne suffisent pas à garantir l'état déployé.
- **Orientation proposée** : recommandation à valider avant d'en faire un engagement fonctionnel.

## 2. Contexte du projet

PennySEO est un SaaS d'optimisation SEO pour les vendeurs Etsy, avec React/Vite/Tailwind, Supabase, Vercel, des routes API et des services OpenAI. Les fonctionnalités existantes impliquent une connexion OAuth Etsy, l'affichage de listings, l'importation, la préparation des produits pour Studio, le scoring, la génération SEO et la publication manuelle vers Etsy.

**Contexte antérieur :** le chantier de modernisation des fonctions IA vers OpenAI a été priorisé; l'utilisateur souhaite désormais ouvrir un chantier distinct consacré à la gestion des produits et à l'expérience **My Shop**. Les évolutions IA ne font pas partie de la présente refonte, sauf adaptation nécessaire du parcours existant.

**Objectif produit :** qu'un vendeur puisse gérer les produits de sa boutique et suivre un chemin clair :

```text
Connecter Etsy → Parcourir le catalogue → Choisir un produit
         → Optimiser dans PennySEO → Examiner les changements
         → Publier explicitement les changements approuvés sur Etsy
```

**Principes directeurs :**

1. Priorité aux actions compréhensibles, au faible nombre de clics et à une progression visible.
2. **Aucune publication sur Etsy sans action et confirmation explicites** de l'utilisateur.
3. **Ne jamais écraser silencieusement** des modifications faites directement dans Etsy.
4. Distinguer les données publiées sur Etsy, les copies locales/importées et les brouillons d'optimisation PennySEO.
5. La sécurité, la fiabilité et la possibilité de reprendre après une erreur priment sur l'esthétique.
6. Éviter une réécriture globale si des évolutions progressives suffisent.
7. Conserver la parité entre les routes Vercel (`api/etsy/`) et leurs équivalents Express locaux (`server.mjs`).
8. Respecter les protections Supabase JWT, la propriété des ressources et les permissions RLS.

## 3. État de référence au 17 octobre 2026

### 3.1 Travaux réalisés

- [x] Premier audit **en lecture seule** par Codex du parcours Etsy / My Shop (rapport transmis le 17 octobre 2026).
- [x] Cartographie des principaux fichiers, routes et tables identifiés par l'audit.
- [x] Identification des anomalies fonctionnelles et des points à confirmer côté sécurité.
- [x] Proposition initiale d'un workflow plus simple et d'une organisation cible de My Shop.
- [x] Définition d'une démarche par phases avec la sécurité en préalable.
- [x] Audit ciblé de sécurité de la phase 0A exécuté et rapport reçu.
- [ ] Risques corrigés et testés.
- [ ] Workflow cible et arbitrages fonctionnels officiellement validés.
- [ ] Maquettes UX validées.
- [ ] Code modifié, testé, committé et déployé pour ce nouveau chantier.

**Important :** le premier audit n'a modifié aucun fichier ni donnée. L'arbre Git était propre selon son rapport. Les observations d'interface provenaient du code : **aucun parcours réel authentifié Etsy n'a encore été observé dans cet audit**.

### 3.2 Parcours existant observé dans le code

1. Connexion Etsy par OAuth PKCE (`Connect with Etsy`), puis callback.
2. My Shop affiche les imports locaux `etsy_listings` et une page de **25 listings actifs** récupérés depuis Etsy.
3. L'utilisateur sélectionne des cartes puis choisit une action dépendant de l'état : `Import`, `Score` ou `Push to Etsy`.
4. L'import crée un snapshot local dans `etsy_listings`.
5. My Shop tente automatiquement de préparer le produit pour Studio dans `listings`; l'image est également recopiée dans le stockage.
6. Studio prend en charge analyse visuelle, mots-clés, sélection et création de brouillon (`Magic Draft`).
7. La publication manuelle montre des différences par champ, demande confirmation, utilise un PATCH Etsy et écrit dans `etsy_export_logs`.

**Terminologie importante :** le premier audit ne trouve **aucune fonction active nommée « Magic Sync »**. L'opération existante est une publication manuelle **« Push to Etsy »**, avec une limite observée de **5 listings par requête**. Ne pas décrire une synchronisation complète comme déjà implémentée.

### 3.3 Cartographie technique (à revalider au fil des changements)

| Domaine | Fichiers / tables identifiés |
|---|---|
| Page My Shop | `src/pages/MyShopPage.jsx` |
| Catalogue, cartes, actions | `src/components/shop/EtsyListingGrid.jsx`, `src/components/shop/ImportActionBar.jsx` |
| OAuth Etsy | `api/etsy/oauth/authorize.ts`, `api/etsy/oauth/exchange.ts`, `src/pages/EtsyCallbackPage.jsx` |
| Lecture catalogue | `api/etsy/shop-listings.ts`, `lib/etsy/etsy-client.ts` |
| Importation et Studio | `api/etsy/import-listings.ts`, `api/etsy/prepare-listing.ts` |
| Scoring | `api/etsy/score-listings.ts`, `lib/etsy/score-etsy-listing.ts` |
| Export Etsy | `api/etsy/export-listings.ts`, `src/components/shop/ExportToEtsyModal.jsx` |
| Studio et SEO Lab | `src/pages/ProductStudio.jsx`, `src/pages/SEOLab.jsx` |
| Tables | `etsy_shop_connections`, `etsy_listings`, `listings`, `etsy_export_logs` |
| Migrations repérées | `supabase/migrations/20260330_create_etsy_tables.sql`, `supabase/migrations/20260331_etsy_export.sql` |
| Exécution locale | `server.mjs` (routes Express correspondant aux routes de production Vercel) |

**Source de vérité de cette section :** rapport d'audit Codex remis dans la conversation du 17 octobre 2026. Le dépôt et le schéma Supabase en production restent les sources à vérifier pendant l'implémentation.

## 4. Constats à traiter et priorisation

| ID | Priorité | Constat du premier audit | État / preuve requise |
|---|---|---|---|
| SEC-01 | P0 | Politiques `SELECT`/`UPDATE` sur `etsy_shop_connections` pouvant permettre à un client authentifié d'accéder à ses tokens Etsy ou de modifier les colonnes sensibles | **Risque relevé dans les migrations ; confirmer les privilèges et le schéma déployé.** Aucun secret ne doit être exposé. |
| SEC-02 | P1, avant extension export | La route d'export vérifie la propriété des deux ressources, mais pas leur lien métier (`etsy_listings.listing_id` ↔ `listing_id` transmis) | Vérifier le chemin effectif puis ajouter le contrôle côté serveur. |
| SAFE-01 | P0 pour toute publication étendue | Absence de relecture/version/hash et de contrôle de conflit avant publication ; risque d'écraser des éditions faites directement dans Etsy | Protéger le flux actuel puis enrichir l'UX de résolution des conflits. |
| REL-01 | P1 | `Load more` remplace la liste au lieu d'ajouter la page suivante ; filtres et compteurs incomplets | Pagination cumulée, sans doublons ni perte de sélection. |
| REL-02 | P1 | L'interface offre un scoring de reprise sur état `error`, mais l'API n'accepte que `pending` | Contrat API/UI cohérent et mécanisme de retry contrôlé. |
| REL-03 | P1 | Erreur de chargement pouvant laisser un spinner permanent ; Sync pouvant signaler un succès malgré un échec | Gestion explicite de `loading / success / error`, propagation des échecs. |
| UX-01 | P2 | Statuts ambigus : `Imported` peut masquer une erreur ; `Published` indique un précédent export réussi, pas une égalité actuelle avec Etsy | Modèle d'états compréhensible et exact. |
| UX-02 | P2 | Sélection de cartes et mode d'action implicites, parfois réinitialisés ; états différents entre My Shop et Studio | Action principale explicite par produit ; navigation prévisible. |
| UX-03 | P2 | Recherche limitée au titre, filtres incomplets, mise en page mobile potentiellement inadéquate | UX responsive, recherche/filtre/tri validés. |
| SYNC-01 | P1/P3 | Bouton `Sync` ne réconcilie pas les snapshots déjà importés | Vraie synchronisation définie puis réalisée ; libellé honnête avant cela. |
| SYNC-02 | P3 | Modifications, inactivation et suppressions sur Etsy non réconciliées ; catalogue actuellement limité aux actifs | Politique de réconciliation / retrait / archivage à spécifier. |
| UX-04 | P1/P2 | Une préparation Studio peut échouer silencieusement après un import pourtant annoncé comme réussi | État partiel visible, retry ou reprise à partir de l'étape échouée. |

**Lecture correcte des priorités :** un problème « confirmé par audit de code » n'est pas automatiquement un incident confirmé en production. `SEC-01` est particulièrement important à **vérifier sur la base déployée**.

## 5. Modèle UX cible — orientation à valider

### 5.1 My Shop comme centre de gestion

My Shop devrait permettre de :

- Voir la boutique connectée, l'état de connexion et la dernière vérification réussie du catalogue.
- Parcourir un catalogue paginé, rechercher, filtrer, trier et afficher clairement les états.
- Choisir un produit et lancer directement son optimisation.
- Reprendre une préparation ou une analyse interrompue.
- Voir ce qui est prêt à publier et comparer les changements.
- Publier **uniquement** les champs choisis après contrôle de conflit et confirmation.
- Connaître le résultat exact de la publication et consulter son historique.

**Orientation ergonomique proposée, non encore validée :** masquer la mécanique « Import » dans le parcours courant. Lors d'une première optimisation, importer et préparer automatiquement *si nécessaire*, avec progression et erreurs explicites. Garder éventuellement une action d'import séparée pour des usages avancés.

### 5.2 Ne pas confondre trois axes de statut

| Axe | Exemples | Source logique |
|---|---|---|
| **État Etsy** | actif, brouillon, inactif, expiré, indisponible | Données publiées / disponibilité côté Etsy |
| **Progression PennySEO** | non commencé, préparation, analyse, mots-clés, brouillon prêt, prêt à publier, erreur | Workflow local des optimisations |
| **État de cohérence** | jamais vérifié, à jour lors de la dernière vérification, changement externe, conflit, échec de vérification | Comparaison entre références Etsy et données locales |

Les libellés et transitions exacts restent à concevoir. En particulier, **« publié » ne doit pas signifier « actuellement synchronisé »** si cette égalité n'a pas été vérifiée.

### 5.3 Proposition de disposition (wireframe fonctionnel, non validé)

```text
My Shop                                    [Vérifier / synchroniser]
Boutique Etsy : Connectée                   Dernière vérification : date/heure

[Catalogue] [En optimisation] [Prêts à publier] [Erreurs]
[Recherche __________________] [État ▾] [Type ▾] [Trier ▾]

[Image]  Produit A       Etsy : Actif  | SEO : Non commencé | [Optimiser]
[Image]  Produit B       Etsy : Actif  | SEO : Brouillon    | [Reprendre]
[Image]  Produit C       Etsy : Actif  | SEO : Prêt         | [Examiner]
[Image]  Produit D       Etsy : Actif  | SEO : Erreur       | [Réessayer]

[Afficher plus / page suivante]
Actions groupées disponibles seulement si elles ont un sens pour la sélection.
```

**Mobile :** une carte lisible par ligne, filtres accessibles, pas de barre d'action coupée; comportement à vérifier sur de vrais écrans.

## 6. Décisions à prendre (aucune ne doit être considérée comme définitivement validée)

| ID | Sujet | Préférence initiale | Statut |
|---|---|---|---|
| DEC-01 | Source de vérité | Etsy pour les données effectivement publiées, PennySEO pour les brouillons et optimisations locales ; historique séparé | **Proposition** |
| DEC-02 | Import visible ou automatique | Automatique lors du premier besoin d'optimisation, avec messages de progression et reprise | **Proposition** |
| DEC-03 | Conflits avant export | Ne jamais écraser en silence; bloquer la publication des champs en conflit et permettre un arbitrage explicite | **Proposition** |
| DEC-04 | Étendue du catalogue | Commencer par les listings actifs, puis définir brouillons / inactifs / expirés et supprimés | **À arbitrer** |
| DEC-05 | Préparation Studio | Automatisée si nécessaire, mais transparente et récupérable en cas d'échec | **Proposition** |
| DEC-06 | Publication partielle | Autoriser titre, description et/ou tags selon le choix explicite et les règles Etsy | **À arbitrer et vérifier** |
| DEC-07 | Traitements groupés | Petits lots fiables au départ; file serveur seulement si la volumétrie le justifie | **Proposition** |
| DEC-08 | Conservation des snapshots | Versionner ou conserver un référentiel comparable au lieu d'écraser sans historique | **À arbitrer** |
| DEC-09 | UX principale | Produit → Optimiser → Examiner → Publier, sans imposer l'apprentissage d'états techniques | **Orientation proposée** |
| DEC-10 | Bouton de synchronisation | Définir s'il s'agit d'un rafraîchissement d'affichage ou d'une vraie réconciliation ; ne pas appeler l'un comme l'autre | **À arbitrer** |

Lorsqu'une décision est validée, renseigner : **date, choix, justification, impacts et approbation** dans le journal de décisions (§ 10).

## 7. Phases, tâches et critères de sortie

### Phase 0A — Audit ciblé de sécurité Etsy (terminée)

**Objectif :** établir les faits et préparer des correctifs limités *sans modifier le code*.

- [x] Auditer les politiques RLS, privilèges sur `etsy_shop_connections` et exposition des colonnes `access_token`/`refresh_token`, en distinguant migrations et schéma déployé.
- [x] Vérifier les lectures/écritures de la connexion Etsy depuis le frontend, les routes API et le renouvellement des tokens.
- [x] Vérifier, dans `export-listings.ts` et l'équivalent Express, la correspondance réelle entre listing Etsy et listing PennySEO.
- [x] Examiner le risque de collision avec des modifications externes Etsy et reporter son traitement à la phase dédiée.
- [x] Obtenir le rapport : confirmé / probable / non vérifié, impacts, correctifs, migrations, tests et risques de régression.
- [x] Valider le plan de correctifs avant modification.

**Critère de sortie :** atteint : rapport de vérification reçu et plan technique accepté.

### Phase 0B — Correctifs de sécurité et protection minimale de publication

**Objectif :** éliminer les risques prioritaires vérifiés sans modifier l'expérience utilisateur plus que nécessaire.

- [x] Appliquer manuellement en production, le 17 octobre 2026, `20261017_secure_etsy_shop_connection_permissions.sql` : les tokens ne sont plus lisibles ni modifiables côté client et la lecture des métadonnées reste autorisée.
- [x] Vérifier les privilèges SQL de production : le rôle `authenticated` pouvait lire/modifier les tokens et supprimer la connexion ; correction appliquée et pages My Shop / Settings validées en production.
- [x] Implémenter localement la validation serveur du lien exact entre le listing Etsy, le listing PennySEO et la connexion Etsy active, en plus du JWT et de la propriété.
- [x] Déployer puis valider en production la protection d'association Etsy/PennySEO, identique pour Vercel et Express local.
- [x] Couvrir la parité Vercel/Express et les cas d'échec par une validation partagée.
- [x] Exécuter les tests ciblés sans afficher de secrets ; les permissions effectives sont validées en production.
- [x] Constater la désynchronisation des historiques de migrations locales et distantes ; ne jamais exécuter `supabase db push` avant leur réconciliation explicite.

**Critère de sortie :** absence d'exposition des tokens par les voies testées, lien métier contrôlé et export qui refuse les conflits connus sans écrasement silencieux. Les aspects évolués de comparaison UX restent pour la phase 4.

### Phase 0C — Protection des publications Etsy (migration appliquée, code prêt à déployer)

**Décision validée :** avant chaque publication, le serveur relit Etsy et compare seulement `title`, `description` et `tags` avec la dernière baseline Etsy explicitement acceptée. Les brouillons et optimisations PennySEO restent inchangés quand un conflit est détecté.

- [x] Ajouter une migration locale créant les baselines serveur-only et les données d'audit d'export. Les imports futurs créent une baseline uniquement à partir de la réponse Etsy qui vient d'être lue.
- [x] Traiter les listings historiques sans baseline comme inconnus : aucune baseline n'est inférée depuis les données locales. Toute différence demande une confirmation explicite.
- [x] Relire Etsy lors de la prélecture, puis une seconde fois après le PATCH. Une confirmation est enregistrée dans le journal côté serveur et ne contourne ni JWT, ni propriété, ni connexion active.
- [x] Ajouter dans la modale d'export une comparaison `Etsy actuel` / `proposition PennySEO`, confirmation par champ et publication partielle explicite.
- [x] Préserver le traitement indépendant des autres listings d'un lot lorsque l'un est bloqué.
- [x] Couvrir la comparaison et les parcours serveur simulés sans appel Etsy réel.
- [x] Appliquer manuellement en production, le 18 octobre 2026, `20261017120000_etsy_export_conflicts.sql`.
- [ ] Déployer le code 0C et actualiser ce statut après confirmation Vercel, puis vérifier le parcours avec une boutique de test sans publication réelle. **Ne pas utiliser `supabase db push` : les historiques local et distant restent désynchronisés.**

**Critère de sortie :** après déploiement, une modification externe Etsy ne peut pas être remplacée silencieusement; les utilisateurs peuvent confirmer le remplacement d'un champ historique ou choisir une publication partielle.

### Phase 1 — MVP de fiabilité du catalogue et de la reprise

- [ ] Corriger le chargement cumulatif : ajouter la page suivante sans remplacer les éléments chargés, éviter doublons et désynchronisation des compteurs.
- [ ] Traiter proprement les états chargement/succès/échec, y compris reconnexion et retry.
- [ ] Éviter tout message « Sync successful » après échec réel; aligner le libellé de l'action sur son effet actuel.
- [ ] Rendre le retry de scoring compatible avec le contrat backend (inclure idempotence/coûts/quotas).
- [ ] Rendre visibles les erreurs de préparation Studio et permettre de reprendre sans tout réimporter.
- [ ] Ajouter un filtre « Erreurs » utile.
- [ ] Préserver la sélection et la navigation dans les scénarios convenus.

**Critère de sortie :** un vendeur peut parcourir plus de 25 produits, comprendre les erreurs et reprendre sans impasse ni faux message de réussite.

### Phase 2 — UX et nouveau workflow My Shop

- [ ] Valider les décisions ouvertes de la section 6 et les principaux scénarios d'utilisation.
- [ ] Définir et documenter le modèle d'états à trois axes : Etsy / progression SEO / cohérence.
- [ ] Produire maquettes desktop/mobile et libellés des actions explicites par produit.
- [ ] Implémenter une liste ou grille responsive et des états vides/erreurs/chargement cohérents.
- [ ] Ajouter recherche, filtres et tri cohérents avec l'ensemble des résultats chargés (ou stratégie serveur documentée).
- [ ] Fluidifier le chemin vers Studio ; traiter l'import/préparation en interne si DEC-02 est validée.
- [ ] Maintenir les coûts et limites visibles avant les actions payantes.
- [ ] Effectuer une revue de scénarios utilisateur débutant et vendeur avec gros catalogue.

**Critère de sortie :** un nouvel utilisateur sait quoi faire sur chaque produit, progresse sans connaître les détails techniques et peut reprendre son travail.

### Phase 3 — Vraie synchronisation et réconciliation

- [ ] Spécifier le comportement du bouton « Synchroniser » : périmètre, états, durée, fréquence et erreurs.
- [ ] Définir la structure de référence : données Etsy observées, version/date/hash appropriés, modifications PennySEO non publiées.
- [ ] Concevoir des importations/synchronisations idempotentes sans effacement des brouillons PennySEO.
- [ ] Détecter les changements externes pertinents, les états inactifs et les disparitions selon les décisions prises.
- [ ] Présenter la dernière vérification réellement réussie et son périmètre.
- [ ] Tester les catalogues volumineux, la pagination et les synchronisations partielles/interrompues.

**Critère de sortie :** l'état local reflète fidèlement ce qui a été vérifié chez Etsy, avec divergences explicites et conservation des travaux locaux.

### Phase 4 — Publication sûre et expérience de résolution des conflits

- [ ] Concevoir une comparaison par champ `Etsy actuel` / `PennySEO proposé`, avec source/date.
- [ ] Faire relire Etsy juste avant le PATCH, selon la protection serveur validée.
- [ ] Afficher clairement conflit, différence non conflictuelle, champ inchangé et échec réseau.
- [ ] Ne publier que les champs choisis et réellement validés.
- [ ] Mettre à jour les statuts selon les champs effectivement publiés et les réponses Etsy, pas seulement selon « un export a réussi ».
- [ ] Donner accès à un historique compréhensible (utilisant les journaux existants si possible).
- [ ] Couvrir le scénario de modification concurrente entre prévisualisation et publication, avec stratégie de réduction du risque documentée.

**Critère de sortie :** une modification externe n'est jamais silencieusement remplacée par un brouillon local et l'utilisateur sait exactement ce qui a été publié.

### Phase 5 — Améliorations évolutives (après mesure des besoins)

- [ ] Valider si les volumes justifient une file serveur et des reprises durables.
- [ ] Étudier import/optimisation/publication en lots avec coût et limites transparents.
- [ ] Étudier recommandations de priorisation des produits à optimiser.
- [ ] Étudier support plus large des statuts Etsy et, seulement si requis, gestion de plusieurs boutiques.

**Critère de sortie :** améliorations justifiées par des besoins et données d'usage, sans complexité prématurée.

## 8. Scénarios de validation transversaux

À décliner en tests unitaires, intégration et parcours manuels autorisés. Ne pas appeler une API payante sans approbation préalable.

- [ ] Boutique connectée et déconnectée : messages clairs et récupération sans spinner permanent.
- [ ] Pagination de 26, 50, 100+ produits : aucune perte d'élément, compteur cohérent, absence de doublons.
- [ ] Import répété du même listing : idempotence, réutilisation des identifiants, pas d'écrasement des optimisations.
- [ ] Échec de préparation / scoring : état identifiable et reprise sans double facturation injustifiée.
- [ ] Produit modifié directement sur Etsy après import : conflit visible, pas d'export silencieux.
- [ ] Produit Etsy supprimé/inactif entre lecture et action : message approprié et absence de publication dangereuse.
- [ ] Export avec `listing_id` appartenant au même utilisateur mais non lié au listing Etsy : rejet serveur.
- [ ] Accès direct client aux secrets Etsy : accès refusé par les mécanismes validés.
- [ ] Export de champs partiels : vérification précise des champs demandés, réellement envoyés, réussis et journalisés.
- [ ] Vue mobile et desktop : cartes, filtres et actions utilisables, clavier et états d'accessibilité essentiels.
- [ ] Parité Vercel/Express local pour les parcours modifiés.
- [ ] Tests de régression sur OAuth, Studio, SEO Lab, scoring, génération et Stripe non affecté.

**Contrainte de validation :** tests d'abord mockés ou non destructifs; interventions authentifiées Etsy et changements de base réels uniquement après autorisation explicite et plan de retour arrière.

## 9. Garde-fous techniques et méthode Codex

- Ne jamais afficher ou committer de secrets, `access_token`, `refresh_token`, clés privées ni données sensibles.
- Conserver validation JWT côté serveur, utilisateur dérivé du jeton, contrôles de propriété et de correspondance métier.
- Analyser RLS, privilèges et migration avant toute modification des tables Supabase.
- Prévoir sauvegarde/rollback lorsque des schémas ou processus de synchronisation changent.
- Pas de Docker Desktop requis et pas de création inutile d'environnements parallèles.
- Garder Vercel production et Express local cohérents ; déploiement depuis `main` selon le processus actuel.
- Ne jamais exécuter d'appel OpenAI payant, de publication Etsy, de migration de production ou de déploiement sans consigne explicite.
- Demander d'abord un **audit/plan**, puis un **correctif ciblé**, puis une **validation**, puis un **commit/déploiement autorisés**.
- Réviser les chemins de fichiers, les scripts et la documentation au moment de chaque phase : ils peuvent évoluer.
- Ne jamais présumer qu'un test de build prouve la sécurité ou le fonctionnement réel sur Etsy.

### Modèle de compte rendu après chaque intervention Codex

```text
Date : AAAA-MM-JJ
Phase / IDs de tâches :
Objet :
Changements réalisés (fichiers / migrations) :
Décisions prises :
Tests exécutés et résultats :
Non testé / risques restants :
Commit SHA / branche / état Git :
Push : oui/non ; destination :
Vercel : non déployé / Preview / Production (+ référence si disponible)
Prochaine action précise :
```

## 10. Journal des décisions

| Date | ID | Décision | Justification | Statut |
|---|---|---|---|---|
| 2026-10-17 | CADRAGE-01 | Traiter la gestion Etsy et My Shop comme un chantier distinct après la modernisation IA | Simplifier l'expérience utilisateur | **Validé : lancement du chantier** |
| 2026-10-17 | CADRAGE-02 | Faire précéder la refonte UX d'une revue ciblée des risques Etsy | Éviter de prolonger des failles potentielles | **Validé : ordre de travail** |
| 2026-10-17 | DEC-01 à DEC-10 | Orientations proposées à la section 6 | À détailler avant implémentation fonctionnelle | **Non validées individuellement** |

_Ajouter ici chaque arbitrage formel, et mettre à jour la section 6._

## 11. Journal de progression

| Date | Phase | Événement / livrable | État | Preuve / référence |
|---|---|---|---|---|
| 2026-10-17 | Cadrage | Discussion de la refonte de My Shop, objectif « plus user friendly » | Terminé | Conversation PennySEO |
| 2026-10-17 | Audit initial | Rapport Codex en lecture seule sur Etsy/My Shop | Reçu | Fichier transmis : `Texte collé(5).txt` (175 lignes) |
| 2026-10-17 | Phase 0A | Prompt d'audit ciblé de sécurité préparé (tokens, lien export, conflits) | **Préparé mais non encore exécuté** | Prompt préparé dans la conversation PennySEO |
| 2026-10-17 | Phase 0B | Permissions Supabase Etsy corrigées manuellement en production | Validé : métadonnées lisibles, tokens non lisibles/non modifiables et suppression client refusée ; My Shop et Settings fonctionnels | `20261017_secure_etsy_shop_connection_permissions.sql` |
| 2026-10-17 | Phase 0B | Validation d'association Etsy/PennySEO ajoutée aux exports Vercel et Express | Déployée et validée en production | `lib/etsy/validate-export-listing.ts` ; commit `f45b6db777153e9ee8456522410b9b4426b98c68` |
| 2026-10-17 | Phase 0B | Historique des migrations Supabase inspecté | Désynchronisé : interdiction de `supabase db push` jusqu'à réconciliation | `supabase migration list --linked` |
| 2026-10-18 | Phase 0C | Migration de baselines, journaux et protections client appliquée manuellement dans Supabase Production | Migration validée; code prêt à déployer, confirmation Vercel en attente | `20261017120000_etsy_export_conflicts.sql` |
| 2026-10-17 | Suivi | Création et actualisation de cette feuille de route | Prête à être ajoutée au dépôt | `ROADMAP_ETSY_MYSHOP.md` |

## 12. Prochaine action immédiate

**Déployer les correctifs Phase 0C, confirmer le déploiement Vercel, puis vérifier le parcours avec une boutique de test sans publication réelle.** Réconcilier séparément les historiques de migrations Supabase avant tout usage futur de `supabase db push`.

## 13. Reprise du chantier dans une nouvelle conversation

Copier ce message avec la feuille de route actualisée :

> Nous reprenons le chantier « PennySEO — Gestion Etsy / Refonte My Shop ». Utilise `docs/ROADMAP_ETSY_MYSHOP.md` comme état de référence. Respecte le journal de progression, distingue constats confirmés et orientations non validées et ne suppose aucune tâche achevée sans preuve. Indique la phase active, les risques ouverts et la prochaine action. Nous travaillons par audits Codex, correctifs ciblés et validations avant commits et déploiements. Conserve l'objectif UX : Choisir un produit → Optimiser → Examiner → Publier explicitement, sans écraser les changements Etsy. Voici le dernier rapport Codex : [coller le rapport].

---

**Rappel de gouvernance :** ce document est une feuille de route de développement, pas une preuve d'exécution. Sa présence dans une conversation ou dans un fichier téléchargé **ne signifie pas qu'il a été intégré au dépôt GitHub**. Répercuter les jalons consolidés dans la feuille de route globale lorsque pertinent, sans effacer les autres chantiers PennySEO.
