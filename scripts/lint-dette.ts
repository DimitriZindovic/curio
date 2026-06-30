import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";

/**
 * Linter de dette IA — deterministe (100% statique, zero LLM).
 *
 * Scanne `app/` et signale les anti-patterns d'ingenierie (cf. CLAUDE.md) :
 *   - marqueurs de tache reportee
 *   - types non surs (echappatoire TS)
 *   - suppressions de verification (compilateur / linter)
 *   - catch silencieux (catch vide)
 *   - stubs non implementes
 *   - god files (> 300 lignes)
 *
 * Les mots-cles recherches sont fragmentes (assembles a l'execution) pour
 * qu'un scanner de dette ne se signale pas lui-meme sur ce fichier.
 *
 * Code de sortie : 0 si propre, 1 si dette detectee.
 * Usage : npx tsx scripts/lint-dette.ts [dossier]   (defaut : app)
 */

const TARGET = process.argv[2] ?? "app";
const GOD_FILE_MAX = 300;
const SCANNED_EXT = new Set([".ts", ".tsx"]);

// Mots-clés assemblés à partir de fragments (jamais en toutes lettres ici).
const MARK = ["TO", "DO"].join("");
const MARK2 = ["FIX", "ME"].join("");
const UNSAFE = ["an", "y"].join("");
const TS_SUPPRESS = ["@ts-", "ignore"].join("");
const LINT_SUPPRESS = ["eslint-", "disable"].join("");

const RULES: { name: string; pattern: RegExp }[] = [
  { name: "marqueur de tâche", pattern: new RegExp(`\\b(?:${MARK}|${MARK2})\\b`) },
  { name: "type non sûr", pattern: new RegExp(`:\\s*${UNSAFE}\\b|\\bas\\s+${UNSAFE}\\b|<${UNSAFE}>`) },
  { name: "suppression de vérification", pattern: new RegExp(`${TS_SUPPRESS}|${LINT_SUPPRESS}`) },
  { name: "catch silencieux", pattern: /catch\s*(?:\([^)]*\))?\s*\{\s*\}/ },
  { name: "stub", pattern: new RegExp(`return\\s+(?:null|0|undefined)\\s*;\\s*//\\s*${MARK}`) },
];

function listFiles(dir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) result.push(...listFiles(full));
    else if (SCANNED_EXT.has(extname(full))) result.push(full);
  }
  return result;
}

const line = (text = ""): void => {
  process.stdout.write(`${text}\n`);
};

let files: string[];
try {
  files = listFiles(TARGET);
} catch {
  process.stderr.write(`✖ Dossier introuvable : ${TARGET}\n`);
  process.exit(2);
}

type Finding = { file: string; line: number; rule: string; text: string };
const findings: Finding[] = [];
const godFiles: { file: string; lines: number }[] = [];

for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  if (lines.length > GOD_FILE_MAX) godFiles.push({ file, lines: lines.length });
  lines.forEach((text, index) => {
    for (const rule of RULES) {
      if (rule.pattern.test(text)) {
        findings.push({ file, line: index + 1, rule: rule.name, text: text.trim() });
      }
    }
  });
}

line("");
line("============================================================");
line(`  LINTER DE DETTE IA — scan de ${TARGET}`);
line("============================================================");
line("");

for (const f of findings) {
  line(`  [${f.rule}] ${relative(".", f.file)}:${f.line}`);
  line(`      ${f.text}`);
}
for (const g of godFiles) {
  line(`  [god file > ${GOD_FILE_MAX}] ${relative(".", g.file)} (${g.lines} lignes)`);
}

const total = findings.length + godFiles.length;
line("");
line("============================================================");
if (total === 0) {
  line("  OK — aucune dette détectée");
  line("============================================================");
  process.exit(0);
} else {
  line(`  KO — ${total} problème(s) détecté(s)`);
  line("============================================================");
  process.exit(1);
}
