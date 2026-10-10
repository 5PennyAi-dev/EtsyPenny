# Inventaire de l'IA actuelle

Date de l'audit : 7 octobre 2026. Portée : lecture du dépôt uniquement ; aucun appel aux fournisseurs, aucune consultation de variables d'environnement ni de la base de production.

## Limite importante : configuration effectivement en production

`system_ai_config` est la source de configuration à l'exécution. Les migrations versionnées renseignent des valeurs initiales, et `runAI()` possède les mêmes valeurs de repli si une clé de tâche est absente. Elles **ne prouvent pas** la configuration réellement présente dans Supabase production. Le dépôt ne permet pas non plus de confirmer quelles clés fournisseur sont configurées dans Vercel.

En conséquence, « Gemini 2.5 Flash » ci-dessous signifie « valeur initiale/documentée ou repli du code », sauf pour le chatbot en streaming, qui ne peut techniquement appeler que Gemini. Anthropic et OpenAI sont intégrés au routeur et peuvent devenir actifs après modification de `system_ai_config`, mais aucun appel statique à l'un ou l'autre n'est présent dans les flux applicatifs.

## Matrice des fonctionnalités

| Fonctionnalité | Fichiers actifs | Fournisseur / modèle configuré ou par défaut | Entrées / sorties | Prompt | Problèmes constatés |
| --- | --- | --- | --- | --- | --- |
| Analyse visuelle d'une fiche | `api/seo/analyze-image.ts`, `lib/logic/analyse-image-logic.ts`, `lib/ai/provider-router.ts`, `lib/ai/vision-analysis.ts` ; réutilisée par `lib/etsy/score-etsy-listing.ts` | Tâche `vision_analysis` : migration = Gemini / `gemini-2.5-flash`, température 0,4, max_tokens implicite 8192 ; production inconnue | Image d'URL Supabase + type de produit + notes. JSON attendu : `visual_analysis` avec style, typo, éléments, couleurs, audience et vibe ; sauvegardé via l'Edge Function | `PROMPT_VISUAL_ANALYST` sépare produit/design/mise en scène, traite les notes comme contexte, impose l'incertitude explicite et les six attributs | OpenAI télécharge maintenant l'URL et impose un JSON Schema strict ; les six champs sont validés avant persistance pour OpenAI et Gemini. Anthropic ne gère toujours que le base64. Les résultats et une partie des prompts sont loggés. |
| Classification thème / niche | `api/seo/analyze-image.ts`, `server.mjs`, `lib/etsy/score-etsy-listing.ts`, `lib/logic/analyse-image-logic.ts`, `lib/ai/taxonomy-mapping.ts`, `lib/ai/provider-router.ts` | `taxonomy_mapping` : Gemini / `gemini-2.5-flash`, 0,3, 8192 par migration ; production inconnue | Analyse visuelle + type/notes + listes de taxonomies utilisateur/système. JSON : `theme`, `niche`, `sub_niche` | `PROMPT_TAXONOMY_MAPPING` : un thème et une niche strictement issus des listes ; sous-niche créée comme requête Etsy | OpenAI reçoit maintenant un JSON Schema strict et Gemini conserve son JSON existant. Les trois champs, l'absence de propriétés supplémentaires et l'appartenance exacte de thème/niche aux listes chargées sont validés avant persistance. Le contexte complet de taxonomie peut devenir volumineux. |
| Génération sémantique de mots-clés | `api/seo/generate-keywords.ts`, `lib/seo/generate-keyword-pool.ts` | `keyword_generation` : Gemini / `gemini-2.5-flash`, 0,8, 8192 par migration ; production inconnue | Contexte produit, taxonomie, notes et données visuelles. Six réponses JSON `{keywords: string[]}` : core 40, style 30, buyer/occasion 30, adjacent 30, long-tail 30, broad 20 | Six prompts spécialisés, règles communes : minuscules, max 20 caractères, pas de marques/doublons, JSON seul | Commentaire/migration historiques parlent parfois de cinq appels ; le code en lance six. Toute réponse de segment en échec est silencieusement écartée (`allSettled`). Validation limitée à chaîne non vide et 20 caractères ; les interdictions de marques/caractères spéciaux ne sont pas contrôlées côté serveur. Prompts interpolés loggés. |
| Enrichissement des mots-clés (données de marché) | `lib/seo/enrich-keywords.ts`, `supabase/functions/check-keyword-cache/index.ts` | Pas d'IA : cache Supabase, puis DataForSEO | Mots-clés ; `search_volume`, `competition`, `cpc`, historique. Le volume Google est converti par la formule déterministe `round(3 * volume^0.75)` | Aucun | DataForSEO est la source des métriques ; le modèle ne les reçoit pas pour les inventer. Échec/cache absent : valeurs zéro / concurrence 0,5, ce qui doit être distingué d'une vraie donnée de marché. |
| Scoring de pertinence (niche) | `lib/seo/score-keywords.ts` | `niche_scoring` : Gemini / `gemini-2.5-flash`, 0,2, 8192 par migration ; production inconnue | Batches de 25 mots + contexte ; JSON `{keywords:[{keyword,niche_score}]}` avec score 10/7/4/1 | Prompt système dynamique : adéquation produit + style/audience ; exemples et distribution attendue | Trois tentatives de parsing **en plus** des trois essais du routeur. JSON réparé de façon heuristique ; scores hors liste convertis à 1, mots manquants à 4. Pas de contrôle que la réponse ne contient que les mots demandés. Prompt loggé. |
| Scoring d'intention transactionnelle | `lib/seo/score-keywords.ts` | `transactional_scoring` : Gemini / `gemini-2.5-flash`, 0,2, 8192 par migration ; production inconnue | Même batching ; JSON `{keywords:[{keyword,transactional_score}]}` à quatre paliers | Prompt système dynamique : 10 = déclencheur précis, 7 = achat produit avec attribut, 4 = navigation, 1 = non-achat | Mêmes limites de parsing/validation que le scoring niche. C'est une appréciation sémantique, pas une mesure DataForSEO. |
| Sélection, score de fiche et pool final | `lib/seo/select-and-score.ts`, `lib/seo/run-reset-pool.ts`, appelants `api/seo/generate-keywords.ts` et `lib/etsy/score-etsy-listing.ts` | Pas d'IA | Scores IA + données DataForSEO + poids utilisateur ; top N sélectionné et LSI/breakdown calculés | Aucun | Ce calcul est déterministe. Il ne doit pas être déplacé dans un prompt lors de la migration. Des valeurs de repli de l'enrichissement peuvent influencer le résultat. |
| Génération de titre et description Etsy | `api/seo/generate-draft.ts` | `draft_generation` : Gemini / `gemini-2.5-flash`, 0,9, 8192 par migration ; production inconnue | Brief produit/visuel/taxonomie + jusqu'à 13 mots-clés + contexte boutique. JSON `{title, description}`, persisté dans `listings` | Prompt copywriter : titre ≤140 caractères, titre SEO séparé par `|`, description 150–200 mots en deux sections ; style d'ouverture tournant | Seule présence de `title` est validée : aucune vérification de longueur, type, description, mots-clés ou contraintes du texte. Prompt intégral loggé. Le brief contient des métriques DataForSEO mais aucun garde-fou explicite contre une affirmation de métrique par le modèle. |
| Analyse de fiches Etsy importées | `api/etsy/score-listings.ts`, `lib/etsy/score-etsy-listing.ts` | Réemploie `vision_analysis`, `taxonomy_mapping`, puis les deux tâches de scoring ; valeurs effectives inconnues | Image Etsy stockée, description et tags existants ; analyse/classification, enrichissement DataForSEO, scoring puis LSI | Prompts partagés de vision/taxonomie/scoring | Le contexte image transmet un type de produit vide à la vision et à la taxonomie. Ce flux n'appelle pas la génération de mots-clés ; il évalue les tags existants. |
| Chatbot d'aide | `api/help/chat.ts`, `lib/help/chat-service.ts`, `lib/help/system-prompt.ts`, `lib/ai/provider-router.ts`, `lib/help/corpus.ts` | `help_chat` : insertion de migration Gemini / `gemini-2.5-flash`, 0,6, 1024 ; **streaming Gemini imposé par le code** | Message ≤2000 caractères, 10 derniers tours, contexte de page, corpus de docs injecté. SSE `conversation`, `delta`, `done`/`error`, texte persistant en base | Système : répondre strictement sur le corpus, FR/EN, ≤250 mots, pas d'actions de compte, pas de promesses SEO | `streamAI()` refuse OpenAI/Anthropic : changer cette ligne de config ferait échouer le chat. Pas de fallback ni retry au streaming. Historique fourni par le client est seulement limité en longueur, pas recoupé avec les messages persistés. |

## Routeur, modèles et fournisseurs

`runAI(taskKey, prompt, options)` lit toutes les lignes de `system_ai_config`, les met dans un cache mémoire de 60 secondes, puis choisit l'adaptateur Gemini, Anthropic ou OpenAI. Si la lecture échoue, ou si la tâche demandée est absente, le code utilise Gemini `gemini-2.5-flash`, température 1,0 et 8192 tokens. Le cache est propre à chaque processus ; `clearAIConfigCache()` est exportée mais n'est appelée nulle part. Une instance ayant déjà lu la configuration prend donc un changement en compte au plus tard lors de sa prochaine lecture après son TTL de 60 secondes ; il n'existe ni invalidation immédiate ni propagation entre instances Vercel.

Chaque modèle reçoit jusqu'à trois tentatives avec attente exponentielle de 1 s puis 2 s (trois tentatives au total), seulement pour les statuts 429, 500, 503, 504 et les erreurs sans statut. Les 400/401/403 arrêtent immédiatement. Après épuisement, Gemini passe à la chaîne suivante :

| Modèle Gemini principal | Chaîne de secours |
| --- | --- |
| `gemini-2.5-flash` | `gemini-2.5-pro` → `gemini-2.5-flash-lite` |
| `gemini-2.5-pro` | `gemini-2.5-flash` → `gemini-2.5-flash-lite` |
| `gemini-2.5-flash-lite` | `gemini-2.5-flash` → `gemini-2.5-pro` |

Anthropic et OpenAI sont retentés mais n'ont ni fallback inter-modèle ni fallback inter-fournisseur. Les clés sont instanciées paresseusement : l'absence de `ANTHROPIC_API_KEY` ou `OPENAI_API_KEY` ne se découvre qu'au premier appel. À l'inverse, le démarrage de `server.mjs` exige déjà `GOOGLE_API_KEY`, même si la config devait sélectionner un autre fournisseur.

Les modèles catalogués par la migration sont Gemini 2.5 Flash/Flash-Lite/Pro, Claude Sonnet 4/Haiku 4.5 et GPT-4o/GPT-4o Mini. Ce catalogue n'est pas une preuve de disponibilité fournisseur actuelle, ni un relevé de la configuration production.

### Paramètres et formats fournisseur

| Adaptateur | Entrée transmise | Paramètres | Format réellement demandé |
| --- | --- | --- | --- |
| Gemini non-stream | texte, image base64 ou image téléchargée depuis `imageUrl` | température, topP=1, topK=1, maxOutputTokens, filtres de sécurité medium+ | `responseMimeType: application/json` pour tous les appels `runAI()` |
| Gemini stream | historique texte + système | température, topP=1, maxOutputTokens, mêmes filtres | texte libre ; pas de JSON, pas de fallback |
| Anthropic | texte, et image **base64 uniquement** | `max_tokens`, température, système | aucun mode JSON / schéma ; agrège les blocs texte |
| OpenAI | texte, image base64 ou `imageUrl` téléchargée pour `vision_analysis` | Chat Completions : température et `max_completion_tokens` pour `vision_analysis` ; autres tâches conservent leur contrat existant | JSON Schema strict, refus/réponse incomplète et validation applicative pour `vision_analysis` seulement ; autres tâches n'ont pas encore de schéma |

Anthropic ignore encore `imageUrl`. OpenAI le traite désormais pour `vision_analysis` seulement ; aucun autre flux n'est modifié. Gemini reste le seul adaptateur avec streaming.

## Administration centralisée des modèles

L'écran existant `AIModelConfig`, rendu dans `AdminSystemPage`, doit rester le point central de configuration par tâche. Il n'appelle pas une route API : il utilise directement le client Supabase navigateur avec la clé publiable. Le succès de l'écran dépend donc des règles RLS de l'environnement. La migration qui crée les deux tables ne déclare ni activation RLS ni policy pour elles, et `AdminSystemPage` contient encore un commentaire indiquant qu'un contrôle de rôle admin côté page reste à faire. L'autorisation effective en production n'est pas vérifiable depuis ce dépôt ; elle doit être confirmée avant tout changement de sécurité.

### Ce que l'interface affiche et sauvegarde

| Élément | Implémentation constatée | Limite ou nuance |
| --- | --- | --- |
| Tâches | Une ligne par `system_ai_config`, lue et triée par `task_key` | L'écran ne crée ni ne supprime de tâche ; il ne peut régler que les lignes déjà présentes. Les migrations définissent vision, taxonomie, mots-clés, deux scorings, brouillon et chatbot. |
| Fournisseur | Liste fixe : `gemini`, `anthropic`, `openai` | Cette liste n'atteste pas qu'une clé fournisseur est présente. La sélection ne contrôle pas que le couple fournisseur/modèle est valide en base. |
| Modèle | `system_ai_models` actifs seulement, filtrés par fournisseur, avec nom, niveau de coût et indicateur visuel de tâche vision | Le catalogue est la liste d'options de l'écran, pas un test de disponibilité API. Il contient aujourd'hui GPT-4o et GPT-4o Mini ; seul GPT-4o est marqué `supports_vision`. |
| Vision | Au changement de fournisseur, le premier modèle catalogué compatible vision est choisi | Lors du rendu de la liste de modèles, le filtre est appelé avec `false`, donc un modèle non vision peut quand même être affiché/sélectionné ; un avertissement est montré mais n'empêche pas la sauvegarde. L'adaptateur ne contrôle pas `supports_vision`. |
| Température | Champ numérique de 0 à 2, pas 0,1 | Cette contrainte est seulement front-end. La colonne SQL est un `REAL` sans contrainte de plage ; rien ne tient compte des paramètres réellement admis par un modèle choisi. |
| Limite de tokens | Champ numérique par pas de 1024, minimum 1024 | Cette contrainte est aussi uniquement UI. La colonne SQL est un `INTEGER` sans borne et le même champ est passé tel quel aux trois SDK sous des noms différents. |
| Sauvegarde | `UPDATE system_ai_config SET provider, model_id, temperature, max_tokens, updated_at` sur l'id de la ligne, puis mise à jour optimiste de l'état React | Aucun appel à `clearAIConfigCache()`, aucune vérification serveur du rôle ou de la compatibilité, aucun test de clé/API ni test de modèle. |

Les tables ont une séparation utile : `system_ai_models` contient l'identifiant de modèle, fournisseur, libellé, capacité vision, niveau de coût, actif et ordre ; `system_ai_config` associe une tâche à un fournisseur, modèle, température, limite de tokens et drapeau `is_vision`. La seule intégrité relationnelle déclarée est la clé étrangère `model_id → system_ai_models.id`. Elle n'impose pas que `provider` corresponde au fournisseur du modèle ni que la tâche soit compatible avec le modèle.

### Lecture à l'exécution et délai de prise en compte

1. À la première demande d'une instance, `getTaskConfig()` fait un `SELECT *` sur `system_ai_config` avec `supabaseAdmin`, indexe les lignes par `task_key`, puis mémorise l'instant de lecture.
2. Pendant 60 secondes, `runAI()` et `streamAI()` réutilisent cette copie, y compris après une sauvegarde dans l'écran.
3. Après 60 secondes, la prochaine demande sur chaque instance recharge l'ensemble des lignes. Il n'y a pas de notification Supabase, de purge appelée après sauvegarde, ni de garantie qu'une autre instance chaude recharge au même instant.
4. Si la lecture échoue ou si une tâche manque, le routeur utilise son fallback codé en dur Gemini Flash. Une erreur de configuration peut ainsi être masquée par un retour au défaut au lieu d'être visible comme erreur de configuration.

La fonction exportée `clearAIConfigCache()` pourrait permettre une invalidation locale, mais aucun appelant ne l'utilise. Le composant d'administration ne peut pas l'appeler : il vit dans le navigateur, alors que le cache est dans les processus backend.

### Chemins qui ne suivent pas entièrement l'écran

| Chemin | Rapport à `system_ai_config` |
| --- | --- |
| `runAI()` pour vision, taxonomie, mots-clés, scorings et brouillon | Suit la tâche configurée, sous réserve du cache, du fallback par défaut et des limites de l'adaptateur. |
| `streamAI()` pour `help_chat` | Lit bien la ligne `help_chat` (modèle, température, tokens), mais refuse tout fournisseur autre que Gemini. La sélection OpenAI/Anthropic est donc enregistrable dans l'écran mais non exécutable pour cette tâche. |
| Chaîne de secours Gemini | Après échec, appelle des identifiants hardcodés, sans consulter `system_ai_models.is_active` ni les réglages par tâche des modèles de secours. |
| `lib/ai/gemini.ts` | Contourne entièrement la configuration avec Gemini 2.0 Flash ; le module est actuellement inutilisé par les flux actifs. |
| Scripts manuels `tests/test-generate-keywords.mjs` et `tests/test-seo-scoring.mjs` | Contournent entièrement la configuration avec Gemini 2.0 Flash. Ils ne font pas partie de Vitest et ne doivent pas être exécutés pendant l'audit. |

### État réel de l'adaptateur OpenAI

| Capacité | Interface/catalogue | Code réellement implémenté et vérifié par lecture | Conséquence actuelle |
| --- | --- | --- | --- |
| Appel texte synchrone | GPT-4o et GPT-4o Mini apparaissent comme options OpenAI | Oui : SDK OpenAI, endpoint Chat Completions, un message système optionnel et un message utilisateur | `vision_analysis` OpenAI a été validée en production ; les autres tâches texte non-stream restent non évaluées avec OpenAI. |
| Température / limite de sortie | Deux champs génériques affichés | Oui, transmis en `temperature` et `max_tokens` à Chat Completions pour les deux modèles catalogués | Compatible avec le contrat actuel de l'adaptateur ; l'écran ne sait pas adapter/masquer un paramètre si un futur modèle ne l'accepte pas. |
| Vision | GPT-4o est marqué vision ; GPT-4o Mini ne l'est pas dans le catalogue | Oui pour `vision_analysis` : l'adaptateur télécharge désormais `imageUrl`, l'envoie comme data URL, puis impose le schéma strict. Un essai OpenAI a réussi en production le 7 octobre 2026. | Le catalogue reste une indication d'interface, pas une vérification API exhaustive. |
| JSON / sorties structurées | Aucune option UI | Oui pour `vision_analysis` seulement : `response_format` JSON Schema strict, refus/fin incomplète détectés, puis validation des six champs avant persistance. Les autres tâches OpenAI conservent leur ancien texte non structuré. | La capacité ne doit pas être extrapolée aux autres tâches tant qu'elles n'ont pas leur propre schéma et validation. |
| Streaming | Aucune option UI | Non : pas d'appel OpenAI avec `stream: true`, pas de conversion des événements en `StreamChunk`, et `streamAI()` rejette OpenAI avant l'adaptateur | Le chatbot ne peut pas être migré en modifiant sa ligne de configuration. |
| Données d'usage / fin de réponse | Non affiché dans l'écran | Pour `vision_analysis` OpenAI : tokens prompt/completion lus et absence de choix, refus, fin incomplète ou contenu vide rejetés. Les autres tâches n'ont pas encore ce traitement. | Les diagnostics de sortie restent à compléter avant la bascule des autres tâches. |

L'API OpenAI fournit des mécanismes de sorties structurées et de streaming, mais ils ne sont pas activés dans cet adaptateur ; cette distinction est essentielle entre la capacité du fournisseur et la capacité actuellement livrée par PennySEO. [Documentation officielle OpenAI : sorties structurées](https://developers.openai.com/api/docs/guides/structured-outputs) et [streaming](https://developers.openai.com/api/docs/guides/streaming-responses).

### Mise à jour : OpenAI pour `vision_analysis`

La migration minimale de l'analyse visuelle est maintenant implémentée sans modifier la configuration de production ni le prompt. `runAI('vision_analysis', ...)` continue de lire le fournisseur, le modèle, la température et la limite de sortie depuis `system_ai_config`, donc l'écran **AI Model Configuration** reste l'unique point de sélection.

L'adaptateur OpenAI convertit désormais une `imageUrl` en données base64 avant de l'envoyer comme image data URL à Chat Completions. Pour cette tâche seulement, le routeur lui demande un `response_format` `json_schema` strict correspondant au contrat existant : l'objet racine contient `visual_analysis`, qui contient les six chaînes existantes (`aesthetic_style`, `typography_details`, `graphic_elements`, `color_palette`, `target_audience`, `overall_vibe`). Une validation applicative commune vérifie ensuite JSON, présence et contenu non vide de ces six champs avant toute consultation de taxonomie ou persistance. Elle s'applique aussi à Gemini.

L'adaptateur traite explicitement l'absence de choix, un refus, une fin différente de `stop`, une sortie vide, l'échec du téléchargement d'image et les paramètres invalides. Si OpenAI est la configuration sélectionnée, `runAI()` conserve sa politique existante de trois essais sur erreur transitoire OpenAI, puis échoue : il n'existe aucun fallback vers Gemini pour un fournisseur OpenAI.

#### Variables et modèles vérifiés

| Élément | État implémenté |
| --- | --- |
| Variable serveur | `OPENAI_API_KEY`, lue paresseusement par `lib/ai/adapters/openai-adapter.ts`. La valeur doit être ajoutée au secret Vercel et à l'environnement local seulement au moment de l'activation ; elle ne doit jamais être exposée au client ni committée. |
| Modèles OpenAI acceptés pour le schéma strict de vision | `gpt-4o`, `gpt-4o-mini`, `gpt-4o-2024-08-06`, `gpt-4o-mini-2024-07-18`. Ils sont autorisés explicitement pour éviter qu'un modèle ajouté au catalogue soit présumé compatible. |
| Entrée image vérifiée | GPT-4o et GPT-4o Mini acceptent texte et image ; l'implémentation envoie une image base64 via Chat Completions. |
| Paramètres vérifiés | Température finie entre 0 et 2 ; `max_completion_tokens` entier entre 1 et 16 384. Le routeur traduit la colonne existante `max_tokens` vers `max_completion_tokens`, car `max_tokens` est déprécié dans Chat Completions. |
| Sortie structurée vérifiée | Chat Completions utilise `response_format: { type: 'json_schema', json_schema: { strict: true, ... } }`, puis le serveur valide à nouveau le contrat. |

Ces capacités correspondent à la documentation officielle : [GPT-4o](https://developers.openai.com/api/docs/models/gpt-4o), [GPT-4o Mini](https://developers.openai.com/api/docs/models/gpt-4o-mini), [vision](https://developers.openai.com/api/docs/guides/images-vision), [sorties structurées](https://developers.openai.com/api/docs/guides/structured-outputs) et [Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create). Le catalogue local marque encore GPT-4o Mini comme non-vision ; cette valeur d'interface n'a pas été changée par cette tâche, même si la documentation fournisseur vérifie aujourd'hui l'entrée image. GPT-4o est donc le choix OpenAI actuellement proposé par l'écran pour cette tâche.

### Mise à jour : OpenAI pour `taxonomy_mapping`

**Implémenté localement, non validé en production.** La tâche `taxonomy_mapping` conserve l'écran **AI Model Configuration** et `system_ai_config` comme source unique de fournisseur, modèle, température et limite de sortie. Quand OpenAI est sélectionné, `runAI()` transmet maintenant un `response_format` JSON Schema strict nommé `taxonomy_mapping`, avec exactement trois chaînes obligatoires : `theme`, `niche` et `sub_niche`, sans propriété supplémentaire. Aucun thème ou niche dynamique n'est incorporé au schéma : les listes sont spécifiques à l'utilisateur et restent validées côté application.

`parseTaxonomyMappingResponse()` vérifie le JSON, l'objet, les trois chaînes non vides, l'absence de clé inattendue et l'appartenance exacte de `theme` et `niche` aux mêmes listes combinées utilisées dans le prompt. Il ne corrige pas les libellés, ne remplace pas les synonymes et conserve la clé historique `sub-niche` au moment du merge pour l'Edge Function. Cette validation est appliquée avant l'appel `save-image-analysis` dans l'analyse manuelle Vercel/Express et dans le scoring d'import Etsy. Une réponse invalide bloque donc la persistance de la taxonomie ; l'analyse manuelle ne débite son crédit qu'après cette persistance réussie. Le score Etsy conserve sa facturation existante au niveau de sa route appelante.

Gemini continue de recevoir le même prompt et son mode JSON actuel, puis passe par le même validateur applicatif. OpenAI conserve ses trois essais sur erreur transitoire et échoue ensuite sans fallback silencieux vers Gemini. L'adaptateur limite les sorties structurées aux modèles explicitement vérifiés (`gpt-4o`, `gpt-4o-mini` et snapshots listés) et traite refus, réponse vide ou fin incomplète. Cette utilisation suit les exigences de [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) : schéma strict, `additionalProperties: false` et gestion explicite des refus/réponses incomplètes. Aucun changement de fournisseur ou essai payant n'a été effectué ; l'activation doit être testée depuis l'administration après déploiement.

#### Procédure d'activation ultérieure

1. Ajouter `OPENAI_API_KEY` dans les secrets Vercel et, uniquement si nécessaire, dans l'environnement local non suivi.
2. Déployer le code et exécuter le jeu d'évaluation vision ; ne changer aucun prompt dans cette étape.
3. Dans **Admin System → AI Model Configuration**, modifier uniquement la ligne **Visual analysis** : fournisseur `openai`, modèle `gpt-4o`, température entre 0 et 2, limite de sortie entre 1 et 16 384.
4. Attendre jusqu'à 60 secondes après la sauvegarde pour les instances déjà chaudes ; un échec OpenAI reste un échec visible et ne déclenche pas Gemini.
5. Comparer les six champs et les erreurs avec les cas d'évaluation avant d'étendre OpenAI à la taxonomie ou aux mots-clés.

### Mise à jour : prompt actif de vision

**Modification effectuée le 7 octobre 2026.** `PROMPT_VISUAL_ANALYST` conserve exactement l'objet `visual_analysis` et ses six chaînes. Il demande maintenant de séparer dans le raisonnement le produit vendu, son design et la mise en scène ; d'exclure les accessoires de mockup ; de traiter type et notes vendeur comme contexte non probant ; et de ne pas déduire matériaux, fabrication ou caractéristiques invisibles. Il distingue `No visible text` de `Text present but illegible`. Une transcription lisible complète a priorité sur la cible de 15 mots : elle n'est jamais tronquée silencieusement. L'audience peut contenir un à cinq groupes étayés, ou la valeur prudente `General Etsy shoppers`.

**Contraintes réellement appliquées.** Le JSON Schema OpenAI, `VisualAnalysis` et le validateur serveur exigent toujours les mêmes six clés de type chaîne non vide ; ils ne contrôlent pas les plafonds de mots, l'exactitude d'une transcription, ni le niveau de certitude. Ces éléments sont donc des consignes sémantiques du prompt. Les six champs sont passés à la taxonomie. Après persistance, la génération et le scoring de mots-clés consomment style, éléments graphiques, couleurs, audience et vibe ; la typographie est persistée et utilisée pour les brouillons, mais pas par le générateur de mots-clés actuel.

**Qualité restant à évaluer.** Aucun jeu d'évaluation comparatif n'a encore mesuré l'exactitude de la séparation produit/mockup, les faux positifs de texte, la calibration de l'ambiguïté, la pertinence des audiences ou l'effet sur taxonomie et mots-clés. Cette validation doit utiliser les cas représentatifs de la phase 7 avant de conclure à une amélioration de qualité.

### Adaptations minimales recommandées, en conservant cet écran

Ces adaptations sont une proposition de phase suivante ; elles ne sont pas appliquées par cet audit.

1. **Conserver `system_ai_config` et l'écran comme source de vérité.** Ne pas introduire une configuration de modèle dans les routes ni les prompts. Faire enregistrer les mêmes quatre réglages par tâche, idéalement via une route admin authentifiée qui valide le rôle et purge le cache local ; conserver le rafraîchissement à 60 secondes comme repli pour les autres instances.
2. **Déclarer les capacités de modèle, plutôt que les supposer.** Compléter le catalogue par métadonnées exploitables : fournisseur, vision, streaming, sortie structurée, famille d'API et paramètres autorisés. L'écran doit désactiver les combinaisons incompatibles et présenter seulement les champs applicables ; le backend doit refaire exactement la même validation. Pour le catalogue actuel : Gemini non-stream utilise température/limite JSON ; GPT-4o/GPT-4o Mini utilisent aujourd'hui température/`max_tokens` via Chat Completions ; `help_chat` exige en plus streaming.
3. **Rendre la vision indépendante du fournisseur.** Extraire le téléchargement URL → bytes/base64 actuellement enfermé dans l'adaptateur Gemini et l'exécuter avant le choix d'adaptateur. Passer ensuite `imageBase64`/MIME à Gemini, OpenAI ou Anthropic. Tant que cette étape manque, l'écran doit empêcher OpenAI et Anthropic pour `vision_analysis` malgré leur libellé vision.
4. **Rendre les sorties structurées explicites par tâche.** Ajouter au contrat de `runAI()` une demande de format/schéma portée par la tâche (vision, taxonomie, mots-clés, scorings et brouillon), l'appliquer dans l'adaptateur OpenAI avec le mécanisme de sortie structurée approprié, puis valider le résultat côté serveur avant persistance. Garder le chat en texte libre. Cela remplace les réparations JSON heuristiques par un contrat contrôlable.
5. **Ajouter un adaptateur de streaming OpenAI avant de rendre OpenAI sélectionnable pour `help_chat`.** Il doit produire les mêmes `delta` et `done` que `callGeminiStream`, propager l'annulation, recueillir l'usage et préserver les mêmes règles de persistance. Avant cela, l'écran doit afficher la tâche chatbot comme Gemini-only au lieu d'autoriser une configuration qui échoue.
6. **Éprouver une tâche à la fois depuis l'écran.** Une fois l'adaptateur complété et `OPENAI_API_KEY` déployée, commencer par `vision_analysis`, puis `taxonomy_mapping`, puis `keyword_generation`. Ne sélectionner OpenAI dans l'écran qu'après comparaison sur le jeu d'évaluation de la phase 7. Ne pas présenter les options du catalogue comme une certification fournisseur ou une permission de basculer en production.

## Vercel et `server.mjs`

Les prompts et les appels IA des flux SEO sont largement partagés via `lib/` : `analyse-image-logic`, `generate-keyword-pool`, `score-keywords`, `provider-router`, `enrich-keywords` et les calculs. Les routes de production Vercel sont toutefois des handlers distincts de leurs routes Express locales : la parité ne découle pas automatiquement du partage des bibliothèques.

Différences observées :

- Vercel vérifie directement le JWT, dérive l'utilisateur et rapporte les exceptions à Sentry. `server.mjs` le fait par middlewares qui injectent `user_id` dans le body pour les routes SEO et chat ; les handlers locaux continuent donc à dépendre de ce champ injecté.
- `server.mjs` impose les variables Google, Supabase, DataForSEO et Stripe au démarrage ; Vercel laisse les erreurs de fournisseur apparaître à l'appel. Cela rend un test local OpenAI/Anthropic impossible sans `GOOGLE_API_KEY`.
- La route locale de brouillon accepte une éventuelle consigne de signature (`shop_context.signature_text`) dans le prompt ; le handler Vercel construit seulement l'identité boutique depuis le profil (nom et ton). Les prompts ne sont donc pas parfaitement identiques.
- Les deux environnements conservent des logs opérationnels, mais l'Express local logge davantage de prompts, réponses et payloads d'analyse. Les bibliothèques partagées loggent aussi actuellement les prompts complets des mots-clés et des scorings ; cela augmente le risque de journaliser notes vendeur/contexte boutique.

## Code actif, archives et code inutilisé

Actif : les handlers `api/`, leur miroir `server.mjs`, les modules `lib/ai/adapters/`, `provider-router`, les prompts et services listés dans la matrice. Les adaptateurs Anthropic/OpenAI sont du code actif au sens « atteignable par configuration dynamique », mais leur usage effectif n'est pas démontrable depuis Git.

À ne pas confondre avec le code actif :

- `lib/ai/gemini.ts` (`runVisionModel`/`runTextModel`) est une ancienne voie Gemini 2.0 Flash ; aucune route, bibliothèque de production ou script de test recensé ne l'importe. Le module est donc actuellement inutilisé.
- `tests/test-generate-keywords.mjs` et `tests/test-seo-scoring.mjs` appellent Gemini 2.0 Flash directement. Ce sont des scripts manuels de test, hors suite Vitest et potentiellement payants s'ils sont exécutés.
- `docs/PennySEO_n8nworkflow.json`, `docs/Transactionnal_scoring.json` et les mentions n8n dans `docs/context.md` sont des archives historiques ; ils ne prouvent aucun appel actif. n8n est explicitement abandonné par la feuille de route.

## Ordre proposé pour la migration OpenAI

Cette proposition ne change pas les modèles, prompts ou comportements actuels.

1. **Préparer la couche commune avant tout basculement.** Ajouter dans une phase dédiée les capacités manquantes : passage uniforme d'URL image en base64, JSON Schema/validation par tâche, observabilité sans prompts ni données utilisateur, et support streaming OpenAI si le chat doit migrer. Garder les appels, métriques et résultats comparables.
2. **Analyse d'images, puis classification.** Migrer `vision_analysis` en premier sur un jeu d'évaluation ; il faut transférer l'image, conserver les six attributs et valider strictement le JSON. Migrer ensuite `taxonomy_mapping`, avec validation de l'appartenance de thème/niche aux listes fournies. Cela fixe la qualité du contexte utilisé en aval.
3. **Génération sémantique de mots-clés.** Migrer les six segments ensemble, en conservant la limite Etsy de 20 caractères, la déduplication canonique et la tolérance aux échecs de segments. Le modèle génère des hypothèses lexicales et sémantiques uniquement : il ne produit aucune métrique de marché.
4. **Scorings sémantiques.** Migrer niche et intention transactionnelle avec des sorties enum strictes (1/4/7/10), puis comparer distributions et associations mot-à-mot avant généralisation.
5. **Titres et descriptions.** Une fois le contexte et les mots-clés stabilisés, migrer `draft_generation` avec un schéma, des validateurs de longueur et de présence, puis évaluer style, conformité Etsy et non-répétition.
6. **Chatbot en dernier.** Il nécessite un streaming OpenAI fonctionnel, une stratégie d'interruption, de persistance et d'erreur équivalente. Il ne peut pas simplement être reconfiguré aujourd'hui.

La séparation à préserver pendant cette migration est la suivante :

| Domaine | Responsabilité |
| --- | --- |
| Génération sémantique | Modèle : compréhension du produit, attributs visuels, taxonomie, variantes de mots-clés, pertinence et intention |
| Données DataForSEO | Cache/DataForSEO : volume, concurrence, CPC et historique, avec leur provenance ; jamais inventés par le modèle |
| Scoring déterministe | PennySEO : conversion du volume, pondération utilisateur, sélection top N, LSI/breakdown, persistance et pool final |

Avant toute modification, la phase 7 de la feuille de route doit fournir le jeu de produits, les sorties de référence, les critères de validité JSON, coûts et latences nécessaires à une comparaison reproductible.
