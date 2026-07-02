# DECISIONS — journal des décisions techniques (ADR léger)

Une entrée par décision structurante. Format : **contexte → décision → conséquences**.
Ordre antéchronologique (la plus récente en haut).

---

## ADR-009 — MCP : Playwright pour les tests e2e (remplace le MCP Postgres)

- **Date** : 2026-07-02
- **Contexte** : le premier `.mcp.json` exposait un serveur Postgres en lecture. Utile mais peu aligné avec le besoin réel : valider les **parcours utilisateur** de bout en bout.
- **Décision** : retirer le MCP Postgres, déclarer le **Playwright MCP** (`@playwright/mcp`) dans `.mcp.json`. L'agent pilote un vrai navigateur pour jouer login → sources → article → scoring.
- **Conséquences** : aucun secret dans `.mcp.json` (le serveur gère son propre navigateur). Le serveur MCP doit être **approuvé** au démarrage de Claude Code avant que ses outils soient disponibles. ⚠️ Les parcours qui **écrivent** (signup, ajout de source) frappent la base pointée par `DATABASE_URL` : à faire viser une **base de test locale**, jamais la prod (cf. règle « migrations locales d'abord »).

## ADR-008 — Suggestion de centres d'intérêt via `suggestTags` (pas un nouvel appel LLM)

- **Date** : 2026-07-01
- **Contexte** : proposer automatiquement des centres d'intérêt à partir des articles les mieux notés. Tentation d'ajouter un prompt LLM dédié « propose des mots-clés d'intérêt ».
- **Décision** : réutiliser `suggestTags()` (déjà dans `app/lib/ai.ts`) sur le corpus des top-articles, puis filtrer les mots-clés déjà présents. **Aucun nouveau type d'appel LLM.**
- **Conséquences** : l'invariant « LLM uniquement dans `ai.ts`, seulement résumé/tags » tient. Le LLM ne *calcule* rien ; il dégage des thèmes. Le poids d'un intérêt suggéré est une constante nommée (`SUGGESTED_INTEREST_WEIGHT`).

## ADR-007 — Seuil de pertinence comme *plancher*, filtre d'URL par-dessus

- **Date** : 2026-07-01
- **Contexte** : permettre de masquer le bruit sous un score donné, sans casser le filtre `minScore` ad-hoc déjà présent sur le dashboard.
- **Décision** : champ `User.minRelevanceScore` (défaut 0). Score effectif = `max(filtre d'URL, plancher enregistré)` : le filtre de session ne peut que **relever** le seuil, jamais l'abaisser sous le plancher.
- **Conséquences** : sémantique claire et déterministe. Migration additive (`ADD COLUMN ... DEFAULT 0`), non destructive. Better Auth tolère la colonne applicative sur la table `user` (défaut → inserts intacts).

## ADR-006 — Cœur de scoring pur isolé dans `scoring-core.ts`

- **Date** : 2026-07-02
- **Contexte** : un script CLI déterministe doit rejouer `computeScore` sans tirer Prisma ni l'alias `@/` (non résolu par `tsx`).
- **Décision** : extraire la logique pure (`computeScore`, `explainScore`, types) dans `app/lib/scoring-core.ts`. `app/lib/scoring.ts` la ré-exporte et garde la persistance (`recomputeUserScores`). `computeScore` dérive désormais de `explainScore` (source unique du haystack).
- **Conséquences** : API publique inchangée (`@/app/lib/scoring` exporte toujours `computeScore`), 19 tests toujours verts. L'invariant « scoring dans un seul module déterministe » est renforcé (une seule implémentation du haystack).

## ADR-005 — Skill de simulation adossé à un script déterministe

- **Date** : 2026-07-01
- **Contexte** : démontrer/déboguer le scoring dans le chat sans lancer serveur ni DB, tout en garantissant la fidélité au code.
- **Décision** : skill `curio-simuler-scoring` + `scripts/simulate-scoring.ts` qui **importe** le vrai `computeScore`. Mode `--check` = gate d'I/O sur cas golden.
- **Conséquences** : la simulation en langage naturel a une contrepartie exécutable qui fait foi ; aucune réimplémentation de la formule.

## ADR-004 — Garde-fous déterministes plutôt que revue LLM

- **Contexte** : éviter la dette introduite par génération IA.
- **Décision** : `scripts/lint-dette.ts` (TODO, `any`, catch vide, god files…) et `scripts/check-invariants.ts` (requireUser, LLM scopé, Prisma 7, `proxy.ts`), regroupés par le skill `quality-gate`. Zéro LLM dans la vérification.
- **Conséquences** : ce qui doit être fiable passe par un script, pas par l'IA. Exécutable en CI/pré-commit.

## ADR-003 — Scraping serverless : `linkedom` (pas `jsdom`)

- **Contexte** : extraire le contenu d'articles avec `@mozilla/readability` sur Vercel.
- **Décision** : `linkedom` au lieu de `jsdom` (qui casse sur Vercel : dépendance ESM chargée en `require()`).
- **Conséquences** : `scrapeArticle()` fonctionne en environnement serverless.

## ADR-002 — Scoring déterministe, jamais via le LLM

- **Contexte** : la pertinence doit être reproductible et explicable.
- **Décision** : score = somme des poids des intérêts dont le mot-clé apparaît dans titre/résumé/extrait/contenu (insensible à la casse, `includes`). Le LLM n'y touche jamais.
- **Conséquences** : recalcul à volonté via `recomputeUserScores`. Testable unitairement.

## ADR-001 — Multi-tenant par `userId` sur chaque modèle applicatif

- **Contexte** : app multi-comptes, isolation stricte des données.
- **Décision** : `userId` sur `Source`, `Article`, `Tag`, `Interest`, `Digest` ; `requireUser()` en tête de chaque page/action ; toute requête scopée ; vérification d'appartenance avant `update`/`delete` ; unicité `(userId, url|label|keyword)`.
- **Conséquences** : invariant vérifié automatiquement par `check-invariants.ts`. Cascade sur suppression de compte.
