import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";
import ts from "typescript";

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
 *   - fonctions trop longues (> 50 lignes, detection AST)
 *
 * Les mots-cles recherches sont fragmentes (assembles a l'execution) pour
 * qu'un scanner de dette ne se signale pas lui-meme sur ce fichier.
 *
 * Code de sortie : 0 si propre, 1 si dette detectee.
 * Usage : npx tsx scripts/lint-dette.ts [dossier]   (defaut : app)
 */

const TARGET = process.argv[2] ?? "app";
const GOD_FILE_MAX = 300;
// Une fonction de plus de 50 lignes fait trop de choses : dure à lire, à tester.
const FUNCTION_MAX_LINES = 50;
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

/** Toute forme de fonction porteuse d'un corps (fn, fléchée, méthode, accesseur). */
function isFunctionWithBody(node: ts.Node): node is ts.FunctionLikeDeclaration {
  return (
    (ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)) &&
    node.body !== undefined
  );
}

/** Nom lisible d'une fonction (déclaration, méthode, ou variable porteuse). */
function functionName(node: ts.FunctionLikeDeclaration, sf: ts.SourceFile): string {
  if (node.name) return node.name.getText(sf);
  const parent = node.parent;
  if (ts.isVariableDeclaration(parent) || ts.isPropertyAssignment(parent)) {
    return parent.name.getText(sf);
  }
  return "(anonyme)";
}

type LongFunction = { file: string; line: number; name: string; length: number };

/** Détection AST : toute fonction (fn, fléchée, méthode) dépassant le plafond. */
function findLongFunctions(file: string, content: string): LongFunction[] {
  const sf = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
  const found: LongFunction[] = [];
  const visit = (node: ts.Node): void => {
    if (isFunctionWithBody(node)) {
      const start = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line;
      const end = sf.getLineAndCharacterOfPosition(node.end).line;
      const length = end - start + 1;
      if (length > FUNCTION_MAX_LINES) {
        found.push({ file, line: start + 1, name: functionName(node, sf), length });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

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
const longFunctions: LongFunction[] = [];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");
  if (lines.length > GOD_FILE_MAX) godFiles.push({ file, lines: lines.length });
  longFunctions.push(...findLongFunctions(file, content));
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
for (const fn of longFunctions) {
  line(
    `  [fonction > ${FUNCTION_MAX_LINES} lignes] ${relative(".", fn.file)}:${fn.line} — ${fn.name} (${fn.length} lignes)`,
  );
}

const total = findings.length + godFiles.length + longFunctions.length;
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
