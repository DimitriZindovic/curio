---
name: curio-simuler-scoring
description: À utiliser pour rejouer à la main le scoring de pertinence de Curio directement dans le chat, sans lancer le serveur ni la DB. Donne un article (titre / résumé / extrait / contenu) et des centres d'intérêt (mot-clé + poids), obtiens le score exact et le détail du calcul. Skill MÉTIER de simulation, 100% déterministe.
---

# Simuler le scoring Curio dans le chat

Rejoue **exactement** `computeScore()` (`app/lib/scoring.ts`) à la main, sans exécuter le code. Utile pour démontrer, débugger ou vérifier un score attendu. Logique de référence : [PROJECT_RULES.md](../../../PROJECT_RULES.md).

## Formule (à appliquer telle quelle, JAMAIS via approximation ni LLM)

```
haystack = (titre + " " + résumé + " " + extrait + " " + contenu)  # champs vides ignorés
         puis .toLowerCase()

score = Σ poids(interest)  pour chaque Interest dont  keyword.trim().toLowerCase()
        est une sous-chaîne (includes) de haystack
```

Règles fidèles au code source :
- Concaténation dans l'ordre **titre → résumé → extrait → contenu**, séparés par une espace, champs `null`/vides filtrés.
- Comparaison **insensible à la casse** (tout en minuscule des deux côtés).
- Match par **`includes`** (sous-chaîne brute) : `"ia"` matche `"média"`. Pas de frontière de mot, pas de stemming.
- Un mot-clé qui apparaît plusieurs fois **ne compte qu'une fois** (son poids est ajouté une seule fois).
- Un `keyword` vide après `trim()` est ignoré.
- `haystack` vide → score `0`.

## Entrée attendue

- **Article** : au moins un des champs `title`, `summary`, `excerpt`, `content`.
- **Centres d'intérêt** : liste de `{ keyword, weight }`.

Si l'utilisateur fournit juste un titre et quelques mots-clés, c'est suffisant. Un ou plusieurs articles peuvent être fournis (pour un mini-tri de veille).

## Sortie attendue

1. Le **haystack** en minuscule (tronqué si long) pour transparence.
2. Un tableau **mot-clé → poids → matché ? → contribution**.
3. Le **score total** (somme des contributions).
4. Si plusieurs articles : le **classement** par score décroissant.

## Exemple

**Article** — titre : « Nouveau framework **React** pour l'IA », contenu : « … serverless … »
**Intérêts** : `{react: 5}`, `{ia: 3}`, `{rust: 4}`

| mot-clé | poids | dans le haystack ? | contribution |
|---|---|---|---|
| react | 5 | oui | 5 |
| ia | 3 | oui (« l'**ia** ») | 3 |
| rust | 4 | non | 0 |

**Score = 8**

## Script déterministe adossé (source de vérité)

Le calcul « en tête » doit correspondre au script qui rejoue le **vrai** `computeScore` (`app/lib/scoring-core.ts`, importé — rien n'est réimplémenté) :

```bash
# Simulation sur un scénario JSON { article, interests }
npx tsx scripts/simulate-scoring.ts <input.json>

# Gate I/O : valide la sortie contre des cas golden (exit 1 si KO)
npx tsx scripts/simulate-scoring.ts --check
```

En cas de doute sur un score dans le chat, écrire le scénario en JSON et lancer le script : sa sortie fait foi. Le script **valide aussi l'entrée** (structure, types) et échoue bruyamment sur une entrée malformée (pas de silent fail).

## Limites (à annoncer si pertinent)

- Simulation en tête : ne remplace pas `npm test` ni le script `--check`. Pour trancher, lancer `simulate-scoring.ts`.
- N'écrit rien en base : `recomputeUserScores()` (persistance + `where: { userId }`) n'est **pas** simulée ici, seul le calcul pur l'est.
