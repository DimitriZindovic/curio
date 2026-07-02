---
name: curio-e2e
description: À utiliser pour tester Curio de bout en bout en pilotant un vrai navigateur via le serveur MCP Playwright (outils browser_*). Décrit les pré-vols (serveur de dev sain), les 5 parcours de référence (auth, sources RSS, article manuel, scoring, seuil), les conventions de compte de test jetable et le nettoyage obligatoire. Skill MÉTIER de vérification e2e.
---

# Tester Curio en e2e via Playwright MCP

Piloter un **vrai navigateur** (outils `mcp__playwright__browser_*`) contre l'app en dev pour vérifier les parcours critiques. Ce n'est **pas** une suite `@playwright/test` versionnée : c'est du pilotage exploratoire, reproductible grâce aux scénarios ci-dessous.

## Prérequis & pré-vols (dans l'ordre, avant tout parcours)

1. **Outils MCP disponibles ?** Les outils `browser_*` viennent du serveur `playwright` déclaré dans `.mcp.json`. S'ils sont absents, demander à l'utilisateur de recharger Claude Code et d'autoriser le serveur.
2. **Serveur de dev sain ?** L'app tourne sur le port **3000, ou 3001 si occupé** (Docker prend souvent le 3000). Vérifier :
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 ; curl -s -o /dev/null -w "%{http_code}" http://localhost:3001
   ```
   `307` (redirect vers `/login`) ou `200` = OK. `000` sur les deux = serveur absent → lancer `npm run dev` en arrière-plan.
3. **⚠️ Piège du serveur stale** : un dev server qui tourne depuis plusieurs jours peut renvoyer des **404 sur des routes existantes** (HMR décroché après un gros refactor). Symptôme vu en vrai : `/signup` en 404 alors que `app/signup/page.tsx` existe. Réflexe : vérifier l'âge du process (`lsof -nP -iTCP:3001 -sTCP:LISTEN` puis `ps -o lstart -p <pid>`) et le **redémarrer** au moindre doute.
4. **Base réelle** : le dev pointe sur la base configurée dans l'environnement (souvent **Supabase**). Les règles de compte de test et de nettoyage ci-dessous sont donc **non négociables**.

## Conventions de compte de test (obligatoires)

- **Jamais** utiliser un compte réel ni toucher aux données d'un autre utilisateur (invariant multi-tenant).
- Créer un compte jetable dédié : `e2e+<horodatage>@curio.test` (horodatage via `date +%Y%m%d%H%M%S`), mot de passe ≥ 8 caractères, nom `E2E Test`.
- Toutes les données créées (sources, articles, intérêts, tags) vivent sous ce compte uniquement.
- **Nettoyage en fin de run, même si un parcours a échoué** : `/account` → « Supprimer mon compte » → confirmer par mot de passe (cascade sur toutes les données). Vérifier ensuite qu'une reconnexion renvoie bien « Invalid email or password » (401).

## Mode opératoire navigateur

- Travailler au **snapshot d'accessibilité** (`browser_snapshot` / snapshots retournés par chaque action), pas au screenshot. Les refs (`f2e10`…) **changent à chaque navigation** : reprendre un snapshot frais si « Ref not found ».
- `browser_fill_form` pour les formulaires multi-champs, `browser_click` pour soumettre, `browser_wait_for` sur un texte attendu (ex. attendre la disparition de « refresh : jamais » après un refresh RSS).
- Consulter les logs console retournés en cas de comportement inattendu (404, 401, erreurs réseau).

## Les 5 parcours de référence (jouer dans cet ordre, ils s'enchaînent)

### 1. Auth
`/signup` → créer le compte jetable → **attendu** : redirection `/` avec sidebar (Articles/Sources/Pertinence/Digests) et email affiché. Déconnexion → **attendu** : `/login`. Reconnexion → **attendu** : retour `/`.

### 2. Source RSS + ingestion
`/sources` → ajouter `Hacker News (e2e)` / `https://hnrss.org/frontpage` / catégorie `e2e` → **attendu** : « 1 source(s) · 1 active(s) ». Cliquer ↻ (Rafraîchir) → attendre la disparition de « refresh : jamais » → **attendu** : compteur d'articles > 0 (typiquement 20) et horodatage de refresh affiché.

### 3. Article manuel + scraping
`/` → coller `https://en.wikipedia.org/wiki/TypeScript` dans « Coller une URL d'article… » → Ajouter → **attendu** : article « TypeScript » rattaché à « Ajouts manuels ». Ouvrir sa page de détail → **attendu** : section Contenu remplie (extraction Readability complète, pas un extrait vide).

### 4. Scoring
`/settings` (Pertinence) → ajouter les intérêts `typescript` (poids 5) puis `javascript` (poids 2) → retour `/` → **attendu** : article TypeScript à **score 7** (5 : titre, 2 : contenu) et en tête du tri par pertinence ; les articles HN restent à 0. En cas d'écart, trancher avec le skill `curio-simuler-scoring` (le score se calcule uniquement dans `app/lib/scoring.ts`, jamais à l'œil).

### 5. Seuil de pertinence
`/settings` → « Masquer les articles sous un score de » = 5 → Enregistrer → `/` → **attendu** : seul l'article TypeScript visible, les articles à score 0 masqués, mais le compteur global (« 21 article(s) ») inchangé — le seuil filtre l'affichage, il ne supprime rien.

## Compte-rendu attendu

1. État des pré-vols (port utilisé, serveur redémarré ou non).
2. Par parcours : ✅/❌ + observation concrète (compteurs, score, message d'erreur).
3. Confirmation du nettoyage (compte supprimé + reconnexion refusée).
4. Anomalies hors périmètre notées sans être « corrigées » en douce (ex. date de publication scrapée exotique).

## Limites & garde-fous

- **Ne rien committer** depuis un run e2e ; ne pas modifier le code pour « faire passer » un parcours — un écart = un constat à remonter.
- Les parcours dépendent du réseau (hnrss.org, wikipedia.org) : un échec d'ingestion peut être un aléa réseau, à distinguer d'un bug (retenter une fois avant de conclure).
- Le résumé IA et les suggestions de tags (boutons « Générer le résumé », « Suggérer… (IA) ») consomment l'API Anthropic : ne les jouer que sur demande explicite.
- Les artefacts du MCP (`.playwright-mcp/` : snapshots `.yml`, logs console) sont **éphémères et gitignorés** : les supprimer en fin de run (`rm -rf .playwright-mcp`), ne jamais les committer.
