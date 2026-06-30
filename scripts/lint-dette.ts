/**
 * Linter de dette IA — déterministe (100 % statique, zéro LLM).
 *
 * Scanne `app/` et signale les anti-patterns d'ingénierie (cf. CLAUDE.md) :
 *   - TODO / FIXME restants
 *   - `any` / `@ts-ignore` (interdits)
 *   - try/catch silencieux (catch vide `{}`)
 *   - stubs (`return null; // TODO`)
 *   - god files (> 400 lignes)
 *
 * Code de sortie : 0 si propre, 1 si dette détectée.
 * Usage : npx tsx scripts/lint-dette.ts [dossier]   (défaut : app)
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";

const TARGET = process.argv[2] ?? "app";
const GOD_FILE_MAX = 400;
const SCANNED_EXT = new Set([".ts", ".tsx"]);

type Finding = { file: string; line: number; rule: string; text: string };

const RULES: { name: string; pattern: RegExp }[] = [
  { name: "TODO/FIXME", pattern: /\b(?:TODO|FIXME)\b/ },
  { name: "any / @ts-ignore", pattern: /:\s*any\b|\bas\s+any\b|<any>|@ts-ignore/ },
  { name: "catch vide", pattern: /catch\s*(?:\([^)]*\))?\s*\{\s*\}/ },
  { name: "stub TODO", pattern: /return\s+(?:null|0|undefined)\s*;\s*\/\/\s*TODO/ },
];

function listFiles(dir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      result.push(...listFiles(full));
    } else if (SCANNED_EXT.has(extname(full))) {
      result.push(full);
    }
  }
  return result;
}

let files: string[];
try {
  files = listFiles(TARGET);
} catch {
  console.error(`✖ Dossier introuvable : ${TARGET}`);
  process.exit(2);
}

const findings: Finding[] = [];
const godFiles: { file: string; lines: number }[] = [];

for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  if (lines.length > GOD_FILE_MAX) {
    godFiles.push({ file, lines: lines.length });
  }
  lines.forEach((text, index) => {
    for (const rule of RULES) {
      if (rule.pattern.test(text)) {
        findings.push({ file, line: index + 1, rule: rule.name, text: text.trim() });
      }
    }
  });
}

console.log("");
console.log("============================================================");
console.log(`  LINTER DE DETTE IA — scan de ${TARGET}`);
console.log("============================================================\n");

for (const f of findings) {
  console.log(`  [${f.rule}] ${relative(".", f.file)}:${f.line}`);
  console.log(`      ${f.text}`);
}
if (godFiles.length > 0) {
  for (const g of godFiles) {
    console.log(`  [god file > ${GOD_FILE_MAX}] ${relative(".", g.file)} (${g.lines} lignes)`);
  }
}

const total = findings.length + godFiles.length;
console.log("\n============================================================");
if (total === 0) {
  console.log("  OK — aucune dette détectée");
  console.log("============================================================");
  process.exit(0);
} else {
  console.log(`  KO — ${total} problème(s) détecté(s)`);
  console.log("============================================================");
  process.exit(1);
}
