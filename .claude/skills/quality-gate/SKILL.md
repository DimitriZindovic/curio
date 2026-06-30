---
name: quality-gate
description: À utiliser avant de terminer une tâche ou de committer, dans n'importe quel projet JS/TS, pour garantir qu'aucune dette technique n'est introduite. Lance les vérifications déterministes (lint, types, tests, linter de dette, invariants) et applique les 7 commandements anti-dette IA. Skill TRANSVERSE réutilisable.
---

# Quality gate — garde-fou anti-dette (réutilisable)

Skill transverse : à appeler systématiquement avant de considérer une tâche « terminée » ou de committer. Tout repose sur des **outils déterministes (zéro LLM)** — c'est la méthode : ce qui doit être fiable passe par un script, pas par l'IA.

## 1. Lancer les vérifications

```bash
npm run lint                          # ESLint (règles du projet)
npx tsc --noEmit                      # typage TypeScript
npm test                              # tests (Vitest)
npx tsx scripts/lint-dette.ts         # dette générique : TODO/FIXME, any/@ts-ignore, catch vide, stubs, god files
npx tsx scripts/check-invariants.ts   # invariants spécifiques au projet
```

**Tout doit être vert avant de committer.** Ne jamais contourner un hook avec `--no-verify`.

## 2. Les 7 commandements (rappel à respecter)

1. **No big-bang refacto** : pas de coexistence ancien/nouveau ; on remplace, on nettoie, on commit.
2. **No stub / no TODO** : si c'est commité, ça marche.
3. **No silent fail** : pas de `try/catch` qui avale ; logger ou re-throw.
4. **No revert** : on corrige forward, jamais backward.
5. **No god file** : viser < 250 lignes, une responsabilité par fichier.
6. **No magic number** : valeurs métier → constantes nommées / config.
7. **No vibe-prompt** : prompt précis ou pas de prompt.

## 3. Quand un check échoue

Corriger **la cause, pas le symptôme** :
- ❌ ajouter `eslint-disable` / `@ts-ignore` pour faire taire l'outil ;
- ❌ baisser un seuil juste pour passer ;
- ✅ comprendre le finding, puis le résoudre (ou, si c'est un vrai faux positif d'outil, ajuster l'outil de façon principielle — pas le code).

## 4. Commits

Petites étapes, un commit = un changement cohérent et qui passe la gate. Jamais un seul gros dépôt en fin de tâche.
