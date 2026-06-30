# Curio — Architecture

Vue d'ensemble du flux et du modèle multi-tenant. Voir [PROJECT_RULES.md](./PROJECT_RULES.md) pour les règles métier.

## Flux général

```
Navigateur
   │
   ▼
proxy.ts ── (getSessionCookie) ──► redirige vers /login si pas de cookie
   │
   ▼
app/(app)/*  (Server Components)                 app/login, app/signup (Client)
   │  requireUser() → userId                          │  authClient.signIn / signUp
   │                                                   ▼
   ├── lecture : prisma.<model>.findMany({ where:{ userId } })   /api/auth/[...all]  (Better Auth)
   │                                                   │
   └── mutation : <form action={serverAction}>         ▼
            │                                       app/lib/auth-server.ts (Better Auth + prismaAdapter)
            ▼
   app/lib/actions/*  (Server Actions, "use server")
            │  requireUser() → vérif appartenance → scope userId
            ▼
   app/lib/{rss, scrape, ai, scoring}.ts   ◄── logique métier
            │
            ▼
   app/lib/prisma.ts (PrismaClient + adapter pg)
            │
            ▼
        PostgreSQL (Supabase en prod / local en dev)
```

## Couches & responsabilités

| Couche | Emplacement | Rôle |
|---|---|---|
| Gate edge | `proxy.ts` | Redirige vers `/login` sans cookie de session (pas d'accès DB — runtime Edge). |
| Pages | `app/(app)/**/page.tsx` | Server Components. `requireUser()`, lecture Prisma scopée, affichage. Orchestrent, ne contiennent pas de logique métier. |
| Composants | `app/components/*.tsx` | Présentation. Clients (`"use client"`) seulement si interactifs (formulaires `useActionState`/`useTransition`, toggles). |
| Server Actions | `app/lib/actions/*.ts` | Mutations. `requireUser()` en tête, validation, scope `userId`, `revalidatePath`. |
| Métier | `app/lib/{rss,scrape,ai,scoring}.ts` | Logique réutilisable et testable. Seul `ai.ts` parle au LLM. |
| Données | `app/lib/prisma.ts` | Client unique (singleton global + driver adapter `@prisma/adapter-pg`). |
| Auth | `app/lib/{auth-server,auth-client,session}.ts`, `app/api/auth/[...all]` | Better Auth (serveur + client) + helper `requireUser`. |

## Multi-tenant

- Chaque modèle applicatif (`Source`, `Article`, `Tag`, `Interest`, `Digest`) a un `userId` → `User`, en `onDelete: Cascade`.
- Unicité par utilisateur : `@@unique([userId, url])` (Source/Article), `@@unique([userId, label])` (Tag), `@@unique([userId, keyword])` (Interest).
- Toute requête passe par `where: { userId }` ; toute mutation vérifie l'appartenance. Voir PROJECT_RULES.md § « Règle d'or ».

## Prisma 7 (spécificités)

- `schema.prisma` : `datasource` **sans `url`** (interdit en v7).
- `prisma.config.ts` : porte l'URL des migrations (`DIRECT_URL` → repli `DATABASE_URL`) + `shadowDatabaseUrl` (local).
- Runtime : `app/lib/prisma.ts` instancie `PrismaPg({ connectionString: DATABASE_URL })` passé au `PrismaClient`.

## Cron

`app/api/cron/refresh/route.ts` (GET, protégé par `CRON_SECRET`, `maxDuration = 60`) → `refreshActiveSources()`. Planifié dans `vercel.json` (1×/jour sur Vercel Hobby).

## Tests

`tests/` (Vitest) : `scoring.test.ts` (pur), `rss.test.ts` (parser mické), `actions-sources.test.ts` (validation + scoping userId mické). Pas de DB requise — dépendances externes mockées.
