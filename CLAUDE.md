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

### Style & structure
- **Nommage** : composants React en **PascalCase** (`ScoreRing.tsx`), helpers/actions/lib en **camelCase / kebab** tels qu'existants (`scoring.ts`, `auth-server.ts`). Suivre l'existant, ne pas renommer.
- **Langue** : commentaires et docs en **français**, identifiants (variables, fonctions, types) en **anglais**. Un commentaire explique le *pourquoi*, pas le *quoi*.
- **Pas de `any`, pas de `@ts-ignore`.** En cas de doute sur un type, demander.
- **Logique métier dans `app/lib/` uniquement** (jamais dans un composant React). Les pages orchestrent et affichent ; la logique vit dans `lib/` et les Server Actions.
- **Placement d'une nouvelle feature** : logique pure/persistance dans `app/lib/`, mutation dans `app/lib/actions/`, écran dans `app/(app)/…`, composant partagé dans `app/components/`. Créer un composant dès qu'un bloc JSX est réutilisé ou porte une responsabilité distincte.
- **Taille de fichier** : viser **< 250 lignes** (cible souple). Toléré **250–300** pour une composition UI cohésive. **> 300 = interdit** (échec `lint-dette.ts`) → découper.

### Erreurs & logs
- **Pas de `try/catch` silencieux** : toute erreur est **re-throw** ou **loggée via `app/lib/logger.ts`** (`logError` / `logWarn`), jamais avalée. Utiliser `errorMessage(err)` pour normaliser le `catch`.
- Reculs best-effort **assumés et documentés + tracés** : scraping dans `resolveContent` (`logWarn`), `refreshSource` (erreur remontée dans `RefreshResult`), parsing de sortie LLM dans `ai.ts` (`logWarn`).
- **Contrat des Server Actions de formulaire** : type unique `ActionState` (`app/lib/actions/types.ts`) → `{ ok?: boolean; error?: string }`. Ne pas redéclarer un type d'état par fichier. Les actions « fire-and-forget » (toggle/delete) ne renvoient rien.

### Tests
- Écrire un test **pour toute fonction déterministe de `lib/`** (scoring, RSS, parsing) et pour la **validation + le scoping `userId`** des Server Actions. Pas de test de rendu UI.
- Pas de barre de couverture chiffrée ; règle : « la logique métier et les invariants sont couverts ».

### UI / styling
- Les **valeurs littérales de layout Tailwind** (`px-[34px]`, `rounded-[13px]`…) sont **assumées** (design pixel-perfect) et **exemptées** de « no magic number ». Préférer les tokens du thème (`bg-surface`, `text-accent`…) quand ils existent. La règle « no magic number » s'applique aux **valeurs métier** uniquement.

### Base de données & dépendances
- **Migrations Prisma sur une base locale d'abord**, jamais directement sur la prod/partagée. Toute commande à effet de bord externe (migration, réseau, déploiement) : **confirmer avant** (cf. Autonomie).
- **Nouvelle dépendance** = justifiée et minimale. Outil de dev léger (ex. `tsx`) : OK. Dépendance runtime : demander avant.

### IA / LLM
- LLM **uniquement dans `ai.ts`**, pour **résumer / suggérer** (jamais calculer). Toujours **garder l'entrée** (skip si vide/trop courte) et **tronquer** (`MAX_INPUT_CHARS`). Absence de `ANTHROPIC_API_KEY` → erreur claire re-throw (jamais un faux résultat silencieux). Modèle centralisé dans la constante `MODEL`.

### Sécurité & données
- Traiter toute entrée externe comme **non fiable** : valider les URL (`new URL`), n'afficher que du **texte extrait** (Readability), jamais du HTML brut scrapé. Endpoints sensibles protégés par secret (`CRON_SECRET`). Secrets via l'environnement, jamais en dur (y compris dans `.mcp.json`).
- Suppression de compte → **cascade** sur toutes les données applicatives (déjà en place).

### Git & livraison
- **Conventional Commits** : `feat|fix|refactor|chore|docs(scope): …`. Petits commits cohérents.
- **Ne pas committer sans demande explicite** ; ne jamais committer sur `main` sans validation (créer une branche sinon).
- **`npm run gate` doit être vert avant tout commit** (lint + types + tests + dette + invariants + gate scoring). Hook fourni : `.githooks/pre-commit` (activer une fois via `git config core.hooksPath .githooks`).

### Autonomie
- Agir directement sur le **réversible** (lecture, code, refactor sous tests) et rendre compte. **Confirmer avant** tout **effet de bord externe** : migration sur base partagée, appel réseau mutant, déploiement.

## Modules déterministes à appeler (ne pas réinventer)

- `app/lib/session.ts` → `requireUser()` / `getCurrentUser()` (gate d'accès + userId)
- `app/lib/scoring.ts` → `recomputeUserScores(userId)` (persistance) ; ré-exporte `computeScore` / `explainScore`
- `app/lib/scoring-core.ts` → cœur **pur** du scoring (`computeScore`, `explainScore`, types) — sans Prisma, importable en script
- `app/lib/rss.ts` → `parseFeed()`, `refreshSource()`, `refreshActiveSources()`
- `app/lib/scrape.ts` → `scrapeArticle()` (extraction Readability)
- `app/lib/ai.ts` → `summarize()`, `suggestTags()` (seuls appels au LLM)
- `app/lib/logger.ts` → `logError` / `logWarn` / `errorMessage` (convention de log unique)
- `app/lib/actions/types.ts` → `ActionState` (contrat de retour des Server Actions de formulaire)
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
- `npm run gate` → **garde-fou complet** : lint + types + tests + dette + invariants + gate scoring (à lancer avant tout commit)
- `npm run debt` / `npm run invariants` / `npm run score:check` → garde-fous individuels
- `npx prisma migrate dev` → migration **locale d'abord** (nécessite `SHADOW_DATABASE_URL` ; jamais directement sur la prod)
- `npx prisma generate` → régénère le client Prisma
- `npm run build` → build prod (Vercel utilise `vercel-build` : generate + migrate deploy + build)

## Skills (`.claude/skills/`)

- **`curio-veille`** (métier) → domaine veille : entités, formule de scoring, pipeline d'ingestion, invariants multi-tenant. À charger pour toute évolution RSS/scoring/tagging/digests.
- **`curio-simuler-scoring`** (métier) → rejoue le scoring dans le chat, adossé à `scripts/simulate-scoring.ts` (mode `--check` = gate I/O). À charger pour démontrer/déboguer un score.
- **`curio-e2e`** (métier) → teste l'app de bout en bout en pilotant un navigateur via le MCP Playwright : pré-vols serveur, 5 parcours de référence (auth, RSS, article manuel, scoring, seuil), compte de test jetable + nettoyage obligatoire.
- **`quality-gate`** (transverse) → garde-fou anti-dette réutilisable : lance lint + types + tests + `scripts/lint-dette.ts` + `scripts/check-invariants.ts`, rappelle les 7 commandements.

## Fichiers de référence

- [PROJECT_RULES.md](./PROJECT_RULES.md) → règles métier détaillées, formule de scoring, machine d'ingestion, edge cases
- [ARCHITECTURE.md](./ARCHITECTURE.md) → flux pages ↔ Server Actions ↔ `app/lib` ↔ Prisma ↔ DB, modèle multi-tenant
- [DECISIONS.md](./DECISIONS.md) → journal des décisions techniques (ADR léger)
- [DEPLOY.md](./DEPLOY.md) → déploiement gratuit (Supabase + Vercel)
- [README.md](./README.md) → présentation, mise en route, entités
- `docs/plans/*.plan.md` → plans-contrats (workflow « plan = contrat »)
- `.mcp.json` → serveur **Playwright MCP** pour piloter le navigateur et jouer les parcours e2e
- `AGENTS.md` → spécificités Next.js 16 (lire la doc locale avant de coder)
