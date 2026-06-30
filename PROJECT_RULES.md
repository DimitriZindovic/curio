# Curio — Règles métier détaillées

Détail des invariants résumés dans [CLAUDE.md](./CLAUDE.md). Référence pour les formules, la machine d'ingestion et les edge cases.

## Entités & multi-tenant

Modèles applicatifs (chacun porte un `userId`, relation `User` en `onDelete: Cascade`) :

| Modèle | Unicité | Notes |
|---|---|---|
| `Source` | `@@unique([userId, url])` | `type` = `RSS` ou `MANUAL`. Une source `MANUAL` virtuelle (`url = "curio://manual"`, `active = false`) regroupe les ajouts par URL d'un utilisateur. |
| `Article` | `@@unique([userId, url])` | `relevanceScore` (Int), `read` (Bool), `sourceId` nullable (`onDelete: SetNull`). |
| `Tag` | `@@unique([userId, label])` | labels en minuscules, par utilisateur. |
| `Interest` | `@@unique([userId, keyword])` | mot-clé (minuscules) + `weight` (Int ≥ 1). Pilote le scoring. |
| `Digest` | — (par `userId`) | snapshot N..N d'`Article`. |

Tables Better Auth : `user`, `session`, `account`, `verification` (gérées par la lib, ne pas modifier le schéma à la main au-delà des relations applicatives).

**Règle d'or** : aucune opération ne traverse les comptes. Lecture → `where: { userId }`. Écriture/suppression → `findFirst({ where: { id, userId } })` puis mutation, ou `updateMany/deleteMany({ where: { id, userId } })`.

## Scoring de pertinence

Formule (dans `app/lib/scoring.ts → computeScore`) :

```
score = Σ poids(intérêt)  pour chaque intérêt dont le mot-clé (minuscule)
        apparaît dans  [titre + résumé + extrait + contenu]  (insensible à la casse)
```

- Correspondance par **sous-chaîne** (`includes`), insensible à la casse. Un mot-clé répété ne compte qu'une fois.
- Sans aucun `Interest`, tous les scores valent **0**.
- Recalcul via `recomputeUserScores(userId)` : déclenché à l'ajout/suppression d'un `Interest` et par le bouton « Recalculer » (`/settings`). Aussi calculé à l'ingestion d'un article et après génération d'un résumé.
- **Paliers de couleur** (UI, `scoreColor`) : `≥ 85` accent vif · `70–84` accent sourd · `< 70` gris.

> ⚠️ Dette connue : la correspondance par sous-chaîne crée des faux positifs (`go` ⊂ `google`). Évolution possible : correspondance par mot entier.

## Ingestion RSS (`app/lib/rss.ts`)

1. `parseFeed(url)` : `rss-parser` → items normalisés `{ title, url(link), content, excerpt, publishedAt }`. Titre de repli = le lien. Entrées sans lien ignorées. Extrait dérivé du HTML si pas de `contentSnippet`.
2. `refreshSource(sourceId)` : charge la source ; pour chaque item, **dédoublonne** sur `(userId, url)` ; crée l'`Article` manquant avec `userId = source.userId` et un `relevanceScore` calculé ; met à jour `lastFetchedAt`. Erreurs renvoyées dans `RefreshResult` (pas d'exception silencieuse non documentée).
3. `refreshActiveSources()` : itère **toutes** les sources actives de type RSS (tous comptes) — utilisé par le cron. L'ingestion reste scopée car chaque source porte son `userId`.

## Ajout manuel d'article (`addManualArticle`)

`scrapeArticle(url)` (Readability + jsdom) → crée l'`Article` rattaché à la source `MANUAL` de l'utilisateur, dédoublonné sur `(userId, url)`.

## Résumé IA (`summarizeArticle`)

1. Si le contenu stocké < 600 caractères et que l'URL est externe (≠ `curio://`), **scraper** l'article pour récupérer le vrai texte (cas Hacker News : le flux ne donne qu'un lien commentaires).
2. Appeler `summarize()` (`claude-sonnet-4-6`, `thinking: adaptive`, contenu tronqué ~24k car.).
3. Persister `summary` + le contenu scrapé + recalculer le score.
4. Le LLM ne reçoit **que** du texte ; il n'accède jamais au web.

## Tagging

- Manuel : `addTag` (connectOrCreate sur `(userId, label)`), `removeTag` (disconnect). Vérifient l'appartenance de l'article.
- Suggestions IA : `suggestArticleTags` → `suggestTags()` (structured output `{ tags: string[] }`), réutilise les tags existants de l'utilisateur, exclut ceux déjà posés.

## Digest hebdomadaire

`generateWeeklyDigest` : prend les ≤ 10 meilleurs articles (par score) de l'utilisateur créés sur les 7 derniers jours, crée un `Digest` reliant ce snapshot.

## Authentification

- Comptes email + mot de passe (Better Auth, `requireEmailVerification: false`, `autoSignIn: true`, `deleteUser` activé).
- `requireUser()` (`app/lib/session.ts`) : récupère la session via `auth.api.getSession({ headers })`, redirige vers `/login` sinon.
- Gate de premier niveau dans `proxy.ts` (`getSessionCookie`) ; validation réelle (DB) dans le layout et les actions.
- Suppression de compte : cascade sur toutes les données via les `onDelete: Cascade`.
