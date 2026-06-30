@AGENTS.md

# Curio — Notes pour Claude

## Pitch

App web de **veille technologique personnelle, multi-comptes** : chaque utilisateur agrège ses flux RSS et des articles ajoutés par URL, avec résumé IA, tagging (manuel + suggestions IA), scoring de pertinence configurable et digests hebdomadaires.

## Stack technique

- **Langage** : TypeScript (strict)
- **Framework** : Next.js 16 (App Router, Server Components + Server Actions) · React 19
- **DB** : PostgreSQL via **Prisma 7** (driver adapter `@prisma/adapter-pg`). Pas d'`url` dans `schema.prisma` → config dans `prisma.config.ts`. Prod : Supabase ; local : Postgres.
- **Auth** : **Better Auth** (email + mot de passe), `app/lib/auth-server.ts` / `auth-client.ts`, endpoints `/api/auth/*`.
- **Styling** : **Tailwind CSS v4** (tokens dans `app/globals.css` via `@theme inline`). Thème dark / accent vert.
- **IA** : Anthropic SDK, modèle **`claude-sonnet-4-6`** (`app/lib/ai.ts`).
- **RSS / scraping** : `rss-parser` (`app/lib/rss.ts`) · `@mozilla/readability` + `linkedom` (`app/lib/scrape.ts`) — linkedom car compatible serverless (jsdom casse sur Vercel : dépendance ESM en `require()`)
- **Tests** : **Vitest** (`tests/`)

> ⚠️ Next.js 16 a des conventions qui diffèrent des versions précédentes (voir `AGENTS.md`). Notamment : le middleware s'appelle **`proxy.ts`** ; mutations via **Server Actions** ; `searchParams`/`params` sont des **Promises** (à `await`).

## Règles métier critiques (à NE JAMAIS casser)

Détail + edge cases dans [PROJECT_RULES.md](./PROJECT_RULES.md). Les invariants :

1. **Isolation multi-tenant** : chaque modèle applicatif porte un `userId`. **Toute** requête et **toute** Server Action commence par `requireUser()` (`app/lib/session.ts`) et est scopée par `userId`. Avant tout `update`/`delete`, vérifier l'appartenance (`findFirst({ where: { id, userId } })` ou `deleteMany/updateMany` scopés). Jamais exposer les données d'un autre utilisateur.
2. **Scoring déterministe** : le score se calcule **uniquement** via `app/lib/scoring.ts` (somme des poids des centres d'intérêt présents dans titre/résumé/extrait/contenu). Jamais inline dans une page/composant, **jamais via le LLM**.
3. **Résumé IA = texte fourni uniquement** : le LLM n'accède pas au web. `summarizeArticle` **scrape l'URL** quand le contenu stocké est trop maigre (< 600 car., cas Hacker News) avant d'appeler `summarize()`.
4. **Dédoublonnage par `(userId, url)`** : `Article` et `Source` sont uniques par `(userId, url)`. L'ingestion RSS ne recrée jamais un article déjà présent pour cet utilisateur.

## Conventions de code

- **Nommage** : composants React en **PascalCase** (`ScoreRing.tsx`), helpers/actions/lib en **camelCase / kebab** tels qu'existants (`scoring.ts`, `auth-server.ts`). Suivre l'existant, ne pas renommer.
- **Pas de `any`, pas de `@ts-ignore`.** En cas de doute sur un type, demander.
- **Logique métier dans `app/lib/` uniquement** (jamais dans un composant React). Les pages orchestrent et affichent ; la logique vit dans `lib/` et les Server Actions.
- **Pas de `try/catch` silencieux** : toute erreur est loggée ou re-throw. Exceptions assumées et documentées : le scraping best-effort dans `summarizeArticle`, et `refreshSource` qui renvoie ses erreurs dans un `RefreshResult`.

## Modules déterministes à appeler (ne pas réinventer)

- `app/lib/session.ts` → `requireUser()` / `getCurrentUser()` (gate d'accès + userId)
- `app/lib/scoring.ts` → `computeScore()` (pur) et `recomputeUserScores(userId)`
- `app/lib/rss.ts` → `parseFeed()`, `refreshSource()`, `refreshActiveSources()`
- `app/lib/scrape.ts` → `scrapeArticle()` (extraction Readability)
- `app/lib/ai.ts` → `summarize()`, `suggestTags()` (seuls appels au LLM)
- `app/lib/prisma.ts` → client Prisma (singleton + adapter pg) ; ne pas en créer un autre
- `app/lib/auth-server.ts` → instance Better Auth ; auth côté client via `auth-client.ts`

## Anti-patterns SPÉCIFIQUES au projet

- ❌ Faire une requête Prisma sans filtre `userId` (fuite inter-comptes).
- ❌ Calculer/ajuster un score ailleurs que dans `lib/scoring.ts`, ou le déléguer au LLM.
- ❌ Appeler le LLM pour autre chose que résumer / suggérer des tags (jamais pour du calcul ou de la « devinette »).
- ❌ Mettre `url` dans le bloc `datasource` de `schema.prisma` (Prisma 7 l'interdit — tout passe par `prisma.config.ts`, runtime via l'adapter).
- ❌ Utiliser `middleware.ts` (c'est `proxy.ts` en Next 16) ou oublier d'`await searchParams`/`params`.
- ❌ Modifier la logique métier en touchant à l'UI lors d'une refonte graphique (la refonte est purement front).

## Anti-patterns d'INGÉNIERIE (7 commandements transverses)

Claude les connaît mal — à rappeler :

1. ❌ **Big bang refacto** : pas de feature flag ni de coexistence ancien/nouveau. On remplace, on nettoie, on commit.
2. ❌ **No stub / no TODO** : pas de `return null; // TODO`. Si c'est commité, ça MARCHE.
3. ❌ **No silent fail** : pas de `try/catch` qui avale. Logger ou re-throw.
4. ❌ **No revert** : on corrige forward, jamais backward.
5. ❌ **No god file** : viser < 250 lignes, une responsabilité par fichier ; découper sinon.
6. ❌ **No magic number** : valeurs business → constantes nommées / config, pas en dur.
7. ❌ **No vibe-prompt** : prompt précis ou pas de prompt.

## Commandes utiles

- `npm run dev` → serveur de dev (port 3000, ou 3001 si occupé)
- `npm test` → tests Vitest · `npm run test:watch`
- `npm run lint` → ESLint
- `npx prisma migrate dev` → migration locale (nécessite `SHADOW_DATABASE_URL`)
- `npx prisma generate` → régénère le client Prisma
- `npm run build` → build prod (Vercel utilise `vercel-build` : generate + migrate deploy + build)

## Fichiers de référence

- [PROJECT_RULES.md](./PROJECT_RULES.md) → règles métier détaillées, formule de scoring, machine d'ingestion, edge cases
- [ARCHITECTURE.md](./ARCHITECTURE.md) → flux pages ↔ Server Actions ↔ `app/lib` ↔ Prisma ↔ DB, modèle multi-tenant
- [DEPLOY.md](./DEPLOY.md) → déploiement gratuit (Supabase + Vercel)
- [README.md](./README.md) → présentation, mise en route, entités
- `AGENTS.md` → spécificités Next.js 16 (lire la doc locale avant de coder)
