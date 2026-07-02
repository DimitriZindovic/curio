# Plan (contrat) — Features pertinence : seuil + suggestions d'intérêts

- **Statut** : ✅ Validé le 2026-07-01 · ✅ Exécuté le 2026-07-01 → 2026-07-02
- **Auteur** : Dimitri (validation) · Claude (exécution)
- **Périmètre** : 2 fonctionnalités veille cadrées, sans casser les invariants (multi-tenant, scoring déterministe, LLM scopé à `ai.ts`).

> **Règle « plan = contrat »** : rien n'est codé avant validation de ce fichier. Une fois validé, l'exécution ne sort pas du périmètre ci-dessous ; tout écart est re-négocié ici.

---

## Feature #2 — Seuil de pertinence configurable

**Intention** : masquer par défaut les articles sous un score plancher, par utilisateur.

**Contrat d'implémentation**

- [x] `schema.prisma` : `User.minRelevanceScore Int @default(0)` — migration additive, non destructive.
- [x] `app/lib/actions/settings.ts` : `updateRelevanceThreshold(formData)` — `requireUser()`, normalisation entier ≥ 0.
- [x] `app/(app)/page.tsx` : score effectif = `max(filtre URL, plancher)` — le filtre ad-hoc ne peut que relever.
- [x] `app/(app)/settings/page.tsx` : formulaire « Masquer les articles sous un score de … ».

**Hors périmètre** : édition inline du poids des intérêts ; seuil par source.

## Feature #3 — Suggestion de centres d'intérêt (IA)

**Intention** : proposer des mots-clés d'intérêt depuis les articles les mieux notés.

**Contrat d'implémentation**

- [x] `app/lib/actions/interests.ts` : `suggestInterests()` réutilise **`suggestTags()`** (aucun nouvel appel LLM) sur les 12 top-articles ; `addSuggestedInterest(formData)` ; helper partagé `insertInterest()` (pas de duplication).
- [x] `app/components/SuggestInterests.tsx` : bouton + chips cliquables (calqué sur `SuggestTags`).
- [x] Intégration dans `/settings`.

**Hors périmètre** : nouveau prompt LLM dédié (interdit — cf. ADR-008) ; suggestion de poids.

---

## Invariants à respecter (vérifiés en sortie)

- [x] `requireUser()` en tête de chaque Server Action ; requêtes scopées `userId`.
- [x] Scoring uniquement via `lib/scoring(-core).ts` ; recalcul après changement d'intérêt.
- [x] LLM uniquement dans `ai.ts` (via `suggestTags`).
- [x] Constantes nommées : `SUGGESTED_INTEREST_WEIGHT`, `TOP_ARTICLES_FOR_SUGGESTION`.

## Definition of Done

- [x] `npm run lint` · `npx tsc --noEmit` — verts
- [x] `npm test` — 19/19
- [x] `npx tsx scripts/check-invariants.ts` — vert
- [x] `npx tsx scripts/lint-dette.ts` — vert
- [x] Pas de commit tant que la gate n'est pas verte
