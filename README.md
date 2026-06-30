# Curio — Veille technologique personnelle

App web de veille techno **multi-comptes** : chaque utilisateur a ses propres flux **RSS** et articles ajoutés **manuellement par URL**, avec **résumé IA** (Claude), **tagging** (manuel + suggestions IA), **scoring de pertinence** configurable et **digests** hebdomadaires.

Stack : Next.js 16 (App Router) · React 19 · TypeScript · Prisma 7 + Postgres (Neon) · Tailwind CSS · **Better Auth** (email/password) · Anthropic SDK (`claude-sonnet-4-6`). Thème dark/accent vert.

## Authentification

Comptes **email + mot de passe** via Better Auth (`app/lib/auth-server.ts`, endpoints sous `/api/auth/*`). Création de compte `/signup`, connexion `/login`, gestion + suppression du compte `/account`. Les données (sources, articles, tags, intérêts, digests) sont **isolées par utilisateur** (`userId` sur chaque modèle, requêtes scopées). Le gate d'accès est dans `proxy.ts` (cookie de session).

## Entités

- **User** — compte (géré par Better Auth : `user`/`session`/`account`/`verification`).
- **Source** — flux RSS ou regroupement « ajouts manuels » (nom, URL, catégorie, actif/inactif). Propre à un utilisateur.
- **Article** — titre, URL, contenu, date, statut lu/non-lu, score de pertinence, résumé IA.
- **Tag** — label libre (unique par utilisateur), associé à 0..N articles.
- **Interest** — centre d'intérêt (mot-clé + poids) pilotant le scoring.
- **Digest** (bonus) — snapshot hebdo des meilleurs articles.

## Mise en route

1. **Variables d'environnement** — copier `.env.example` vers `.env` puis renseigner :
   - `DATABASE_URL` : chaîne Postgres (Neon en prod, avec `sslmode=require`).
   - `SHADOW_DATABASE_URL` : base « shadow » pour les migrations Prisma (dev local).
   - `ANTHROPIC_API_KEY` : clé API Claude.
   - `BETTER_AUTH_SECRET` (`openssl rand -base64 32`) et `BETTER_AUTH_URL`.
   - `CRON_SECRET` : protège l'endpoint de refresh.

2. **Base de données** — appliquer les migrations :

   ```bash
   npx prisma migrate deploy   # ou: npx prisma migrate dev
   ```

3. **Lancer** :
   ```bash
   npm run dev
   ```
   Ouvrir http://localhost:3000 → **créer un compte** (`/signup`), puis se connecter.

## Fonctionnalités

| #   | Fonctionnalité                                             | Où             |
| --- | ---------------------------------------------------------- | -------------- |
| 1   | Gestion des sources RSS + refresh (manuel et auto)         | `/sources`     |
| 2   | Ajout manuel d'un article par URL (scraping titre/contenu) | Dashboard `/`  |
| 3   | Résumé IA de chaque article (Claude, runtime)              | Détail article |
| 4   | Tagging manuel + suggestion de tags par l'IA               | Détail article |
| 5   | Scoring de pertinence configurable (mots-clés pondérés)    | `/settings`    |
| +   | Digest hebdomadaire (bonus)                                | `/digests`     |

## Refresh automatique

`GET /api/cron/refresh` rafraîchit toutes les sources RSS actives. Protégé par `CRON_SECRET`
(en-tête `Authorization: Bearer <CRON_SECRET>` ou `?secret=`). Planifié toutes les 6 h via
`vercel.json` (Vercel Cron). Test local :

```bash
curl "http://localhost:3000/api/cron/refresh?secret=$CRON_SECRET"
```

## Tests

Suite [Vitest](https://vitest.dev) dans `tests/` :

```bash
npm test          # exécute la suite une fois
npm run test:watch
```

Couverture : logique de scoring (`computeScore`, `scoreColor`), normalisation des flux RSS (`parseFeed`), et couche Server Actions (validation + isolation par `userId`) via mocks.

## Architecture

- `app/(app)/` — pages authentifiées (dashboard, sources, settings, digests, détail article, compte) sous un layout commun avec sidebar.
- `app/login/`, `app/signup/` — pages d'authentification (hors gate).
- `proxy.ts` — gate d'authentification (le middleware renommé en Next.js 16), via `getSessionCookie`.
- `app/lib/` — logique métier : `prisma.ts`, `rss.ts`, `scrape.ts`, `ai.ts`, `scoring.ts`, `session.ts`, `auth-server.ts` / `auth-client.ts` (Better Auth).
- `app/lib/actions/` — Server Actions scopées par utilisateur (sources, articles, tags, interests, digests).
- `app/api/auth/[...all]/` — endpoints Better Auth.
- `prisma/schema.prisma` + `prisma.config.ts` — modèle de données (Prisma 7, driver adapter `@prisma/adapter-pg`).

## Cadrage de l'IA (méthode)

- **`CLAUDE.md`** — règles, invariants, conventions, modules déterministes à appeler. Détail dans `PROJECT_RULES.md`, `ARCHITECTURE.md`, `DEPLOY.md`.
- **Skills** (`.claude/skills/`) : `curio-veille` (métier — domaine veille & scoring) et `quality-gate` (transverse — garde-fou anti-dette réutilisable).
- **Scripts déterministes** (`scripts/`) : `lint-dette.ts` (dette générique) et `check-invariants.ts` (invariants multi-tenant), + la logique fiable centralisée dans `app/lib/` (`scoring.ts`, `rss.ts`, `scrape.ts`).
