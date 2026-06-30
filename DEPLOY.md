# Curio — Déploiement gratuit (Supabase + Vercel)

Stack : **Vercel** (Hobby, gratuit) pour le Next.js + **Supabase** (gratuit) pour Postgres. Seule l'API Claude est facturée à l'usage (quelques centimes).

## 1. Base de données — Supabase

1. Crée un projet sur **supabase.com** (« curio »), note le **mot de passe** de la base.
2. Bouton **Connect** → **Connection string** → onglet **ORMs**. Récupère deux URLs (forme `postgresql://postgres.<REF>:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:<PORT>/postgres`) :

| Variable | Source Supabase | Port |
|---|---|---|
| `DATABASE_URL` | **Transaction pooler** (runtime serverless) | `6543` |
| `DIRECT_URL` | **Session pooler** (migrations) | `5432` |

Ajouter `?pgbouncer=true&connection_limit=1` à la fin de `DATABASE_URL`.

> ⚠️ Ne pas utiliser la « Direct connection » (`db.<ref>.supabase.co`) : IPv6-only sur le tier gratuit, inatteignable depuis Vercel. Le **pooler** sert pour les deux.

## 2. Pousser sur GitHub

```bash
git add -A && git commit -m "Préparation déploiement" && git push
```

`.env` est ignoré par git → les secrets ne partent pas. Ils se définissent dans Vercel.

## 3. Vercel

1. **vercel.com** → connexion GitHub → **Add New… → Project** → importer le repo.
2. Vercel détecte Next.js et lance **`vercel-build`** (`prisma generate && next build`). Les migrations ne tournent **pas** dans le build (voir § Migrations) — le build ne dépend donc pas de la base.
3. **Environment Variables** (scope Production) :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | Supabase transaction pooler (6543) |
| `DIRECT_URL` | Supabase session pooler (5432) |
| `ANTHROPIC_API_KEY` | clé Claude |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | *(étape 4)* |
| `CRON_SECRET` | chaîne aléatoire |

4. **Deploy**.

## 4. Finaliser `BETTER_AUTH_URL`

L'URL n'est connue qu'après le 1er déploiement (ex. `https://curio-xxx.vercel.app`). La renseigner dans `BETTER_AUTH_URL` puis **redéployer** (Deployments → Redeploy). Better Auth fait confiance automatiquement à cette origine (plus d'erreur « Invalid origin »).

## 5. En ligne

Aller sur l'URL → **créer un compte** → ajouter ses flux. Le cron (`vercel.json`) rafraîchit les sources **1×/jour** (limite Hobby), authentifié par le `CRON_SECRET` que Vercel envoie automatiquement.

## Migrations (manuelles, hors build)

Les migrations ne tournent **pas** dans le build : le pooler transaction (6543) fait *hang* `prisma migrate deploy` (advisory locks non supportés). On migre une fois à la main, via le **session pooler (5432)** :

```bash
DIRECT_URL="postgresql://postgres.<REF>:<PWD>@aws-0-<REGION>.pooler.supabase.com:5432/postgres" \
  npx prisma migrate deploy
```

La base étant vide, ça crée toutes les tables. À relancer uniquement quand le schéma change (après un `npx prisma migrate dev` local + push).

## Adaptations déjà en place pour le gratuit

- `vercel-build` = `prisma generate && next build` (pas de DB au build).
- Migrations manuelles via `DIRECT_URL` (session pooler 5432).
- Cron quotidien (`0 6 * * *`) — conforme au plan Hobby (max 1×/jour).
- `maxDuration = 60` sur la route cron (évite le timeout serverless).

## Limites du tier gratuit

- **Supabase** : projet mis en pause après ~1 semaine d'inactivité (à réactiver depuis le dashboard).
- **Vercel Hobby** : cron 1×/jour, fonctions ≤ 60 s.
- **Claude** : payant à l'usage ; plafonner les dépenses dans la console Anthropic.

## Migrations ultérieures

Au changement de schéma : créer la migration en local (`npx prisma migrate dev`), commit, push → le `vercel-build` applique `prisma migrate deploy` au prochain déploiement.
