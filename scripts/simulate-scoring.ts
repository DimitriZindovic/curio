import { readFileSync } from "node:fs";
import {
  computeScore,
  explainScore,
  type Interest,
  type ScoringInput,
} from "../app/lib/scoring-core";

/**
 * Simulateur déterministe du scoring Curio (zéro LLM, zéro DB).
 *
 * Rejoue le VRAI `computeScore` (`app/lib/scoring-core.ts`) — le script ne
 * réimplémente rien, il importe la source unique. Adossé au skill
 * `curio-simuler-scoring`.
 *
 * Deux usages :
 *   1. Simulation :   npx tsx scripts/simulate-scoring.ts <input.json>
 *      input.json = { "article": {title?,summary?,excerpt?,content?},
 *                     "interests": [{ "keyword": string, "weight": number }] }
 *   2. Gate I/O :     npx tsx scripts/simulate-scoring.ts --check
 *      Valide la sortie de `computeScore` contre des cas golden. Exit 1 si KO.
 *
 * Le mode simulation VALIDE aussi l'entrée (structure, types) et échoue
 * bruyamment sur une entrée malformée — pas de silent fail.
 */

const HAYSTACK_PREVIEW_CHARS = 200;

type Scenario = { article: ScoringInput; interests: Interest[] };

const line = (text = ""): void => {
  process.stdout.write(`${text}\n`);
};

// ─────────────────────────── validation d'entrée ───────────────────────────

function fail(message: string): never {
  process.stderr.write(`✖ ${message}\n`);
  process.exit(1);
}

function parseInterest(raw: unknown, index: number): Interest {
  if (typeof raw !== "object" || raw === null) {
    fail(`interests[${index}] doit être un objet { keyword, weight }.`);
  }
  const { keyword, weight } = raw as Record<string, unknown>;
  if (typeof keyword !== "string" || keyword.trim().length === 0) {
    fail(`interests[${index}].keyword doit être une chaîne non vide.`);
  }
  if (typeof weight !== "number" || !Number.isFinite(weight)) {
    fail(`interests[${index}].weight doit être un nombre fini.`);
  }
  return { keyword, weight };
}

const ARTICLE_FIELDS = ["title", "summary", "excerpt", "content"] as const;

function parseScenario(rawJson: string): Scenario {
  let data: unknown;
  try {
    data = JSON.parse(rawJson);
  } catch (err) {
    fail(`JSON invalide : ${err instanceof Error ? err.message : String(err)}`);
  }
  if (typeof data !== "object" || data === null) {
    fail("La racine doit être un objet { article, interests }.");
  }
  const { article, interests } = data as Record<string, unknown>;

  if (typeof article !== "object" || article === null) {
    fail("`article` doit être un objet.");
  }
  const art = article as Record<string, unknown>;
  const hasText = ARTICLE_FIELDS.some(
    (f) => typeof art[f] === "string" && (art[f] as string).trim().length > 0,
  );
  if (!hasText) {
    fail(`\`article\` doit avoir au moins un champ non vide parmi ${ARTICLE_FIELDS.join(", ")}.`);
  }
  if (!Array.isArray(interests)) {
    fail("`interests` doit être un tableau.");
  }

  return {
    article: art as ScoringInput,
    interests: interests.map(parseInterest),
  };
}

// ─────────────────────────── mode simulation ───────────────────────────

function renderSimulation(scenario: Scenario): void {
  const { score, haystack, matches } = explainScore(
    scenario.article,
    scenario.interests,
  );
  const preview =
    haystack.length > HAYSTACK_PREVIEW_CHARS
      ? `${haystack.slice(0, HAYSTACK_PREVIEW_CHARS)}…`
      : haystack;

  line("");
  line("Haystack (minuscule, tronqué) :");
  line(`  ${preview || "(vide)"}`);
  line("");
  line("  mot-clé            poids   matché   contribution");
  line("  ─────────────────  ─────   ──────   ────────────");
  for (const m of matches) {
    const kw = m.keyword.padEnd(17).slice(0, 17);
    const w = String(m.weight).padStart(5);
    const hit = (m.matched ? "oui" : "non").padEnd(6);
    const contrib = String(m.matched ? m.weight : 0).padStart(12);
    line(`  ${kw}  ${w}   ${hit}   ${contrib}`);
  }
  line("");
  line(`  SCORE = ${score}`);
  line("");
}

// ─────────────────────────── mode --check (gate I/O) ───────────────────────────

type GoldenCase = { name: string; scenario: Scenario; expected: number };

// Cas golden : figent le comportement observable de `computeScore`.
// Chaque cas encode une règle métier (substring, dédoublonnage, casse, vide).
const GOLDEN: GoldenCase[] = [
  {
    name: "substring insensible à la casse (ia ⊂ média)",
    scenario: {
      article: { title: "Le média couvre l'IA" },
      interests: [{ keyword: "ia", weight: 3 }],
    },
    expected: 3, // 'ia' matche 'média' ET 'ia', mais poids compté une seule fois
  },
  {
    name: "somme de plusieurs intérêts",
    scenario: {
      article: { title: "React et Rust", content: "serverless" },
      interests: [
        { keyword: "react", weight: 5 },
        { keyword: "rust", weight: 4 },
        { keyword: "kubernetes", weight: 2 },
      ],
    },
    expected: 9,
  },
  {
    name: "mot-clé absent ⇒ 0",
    scenario: {
      article: { summary: "un résumé neutre" },
      interests: [{ keyword: "blockchain", weight: 7 }],
    },
    expected: 0,
  },
  {
    name: "corpus vide ⇒ 0",
    scenario: {
      article: {},
      interests: [{ keyword: "ia", weight: 3 }],
    },
    expected: 0,
  },
  {
    name: "concatène tous les champs",
    scenario: {
      article: {
        title: "titre",
        summary: "résumé kubernetes",
        excerpt: "extrait",
        content: "contenu",
      },
      interests: [{ keyword: "kubernetes", weight: 6 }],
    },
    expected: 6,
  },
];

function runCheck(): void {
  let failures = 0;
  line("");
  line("============================================================");
  line("  GATE — validation I/O du scoring (cas golden)");
  line("============================================================");
  line("");
  for (const c of GOLDEN) {
    const got = computeScore(c.scenario.article, c.scenario.interests);
    const ok = got === c.expected;
    if (!ok) failures += 1;
    line(`  ${ok ? "✓" : "✖"} ${c.name} — attendu ${c.expected}, obtenu ${got}`);
  }
  line("");
  if (failures === 0) {
    line(`  OK — ${GOLDEN.length} cas golden validés`);
    line("============================================================");
    process.exit(0);
  }
  line(`  KO — ${failures}/${GOLDEN.length} cas en échec`);
  line("============================================================");
  process.exit(1);
}

// ─────────────────────────── entrée CLI ───────────────────────────

function main(): void {
  const args = process.argv.slice(2);

  if (args.includes("--check")) {
    runCheck();
    return;
  }
  const file = args[0];
  if (!file || file === "--help" || file === "-h") {
    line("Usage :");
    line("  npx tsx scripts/simulate-scoring.ts <input.json>   # simulation");
    line("  npx tsx scripts/simulate-scoring.ts --check        # gate I/O golden");
    process.exit(file ? 0 : 1);
  }

  let rawJson: string;
  try {
    rawJson = readFileSync(file, "utf8");
  } catch (err) {
    fail(`Lecture de ${file} impossible : ${err instanceof Error ? err.message : String(err)}`);
  }
  renderSimulation(parseScenario(rawJson));
}

main();
