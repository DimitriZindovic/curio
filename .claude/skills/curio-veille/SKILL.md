---
name: curio-veille
description: À utiliser pour toute évolution des fonctionnalités de veille de Curio — sources RSS, ingestion d'articles, scraping, résumé IA, tagging, scoring de pertinence, digests. Décrit le domaine, la formule de scoring, le pipeline d'ingestion et les invariants multi-tenant à respecter. Skill MÉTIER.
---

# Veille Curio — domaine & règles métier

Skill domaine pour travailler correctement sur les fonctionnalités de veille sans casser les invariants. Détail complet : [PROJECT_RULES.md](../../../PROJECT_RULES.md).

## Entités

`Source` (RSS | MANUAL), `Article`, `Tag`, `Interest` (mot-clé + poids), `Digest`.
**Chaque modèle porte un `userId`** (multi-tenant, cascade sur l'utilisateur).

## Modules déterministes à APPELER (ne jamais réécrire la logique)

- **Scoring** : `app/lib/scoring.ts` → `computeScore()` (pur) · `recomputeUserScores(userId)`
- **RSS** : `app/lib/rss.ts` → `parseFeed()` · `refreshSource()` · `refreshActiveSources()`
- **Scraping** : `app/lib/scrape.ts` → `scrapeArticle()` (linkedom + Readability)
- **IA** : `app/lib/ai.ts` → `summarize()` · `suggestTags()` — **seuls appels au LLM**
- **Accès** : `app/lib/session.ts` → `requireUser()` (gate + userId)

## Formule de scoring (déterministe, JAMAIS via LLM)

```
score = Σ poids(interest)  pour chaque Interest dont le mot-clé (minuscule)
        apparaît dans  titre + résumé + extrait + contenu  (insensible à la casse)
```
Recalcul via `recomputeUserScores(userId)` après tout changement d'`Interest`.

## Pipeline d'ingestion

`parseFeed(url)` → dédoublonnage sur `(userId, url)` → `create Article` (`userId = source.userId`) + `computeScore` → maj `lastFetchedAt`.
Résumé IA : si le contenu stocké fait moins de 600 caractères, **scraper l'URL** d'abord (cas Hacker News) puis `summarize()`.

## Invariants à NE JAMAIS casser

1. **Multi-tenant** : `requireUser()` en tête de chaque action/page ; toute requête `where: { userId }` ; vérifier l'appartenance avant `update`/`delete`.
2. **Scoring** uniquement dans `lib/scoring.ts`.
3. **LLM** uniquement dans `ai.ts`, et seulement pour résumer / suggérer des tags.
4. **Unicité** par utilisateur : `(userId,url)`, `(userId,label)`, `(userId,keyword)`.

## Avant de finir une évolution veille

- `npx tsx scripts/check-invariants.ts` → doit être vert (vérifie requireUser, LLM scopé, etc.).
- `npm test` → la logique de scoring/RSS est couverte par Vitest.
