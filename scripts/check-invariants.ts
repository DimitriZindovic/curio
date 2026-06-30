/**
 * Vérificateur d'invariants SPÉCIFIQUES à Curio — déterministe (zéro LLM).
 *
 * Fait respecter les règles métier qui ne doivent jamais être cassées
 * (cf. CLAUDE.md / PROJECT_RULES.md) :
 *   1. Chaque Server Action de `app/lib/actions/` appelle `requireUser()`.
 *   2. Le SDK Anthropic n'est utilisé QUE dans `app/lib/ai.ts`.
 *   3. `schema.prisma` ne met pas d'`url` dans le bloc `datasource` (Prisma 7).
 *   4. Pas de `middleware.ts` (c'est `proxy.ts` en Next.js 16).
 *
 * Code de sortie : 0 si tout est respecté, 1 sinon.
 * Usage : npx tsx scripts/check-invariants.ts
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const violations: string[] = [];

// 1. Toute action gate l'accès via requireUser()
const actionsDir = "app/lib/actions";
if (existsSync(actionsDir)) {
  for (const file of readdirSync(actionsDir)) {
    if (!file.endsWith(".ts")) continue;
    const content = readFileSync(join(actionsDir, file), "utf8");
    if (!content.includes("requireUser(")) {
      violations.push(
        `[multi-tenant] ${actionsDir}/${file} : aucune Server Action n'appelle requireUser() — risque de fuite inter-comptes.`,
      );
    }
  }
}

// 2. Le SDK Anthropic uniquement dans app/lib/ai.ts
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (full.endsWith(".ts") || full.endsWith(".tsx")) out.push(full);
  }
  return out;
}
for (const file of walk("app")) {
  if (file.replace(/\\/g, "/") === "app/lib/ai.ts") continue;
  const content = readFileSync(file, "utf8");
  if (/@anthropic-ai\/sdk|new\s+Anthropic\b/.test(content)) {
    violations.push(
      `[LLM] ${file} : usage du SDK Anthropic hors de app/lib/ai.ts (le LLM ne sert qu'à résumer/suggérer des tags).`,
    );
  }
}

// 3. schema.prisma sans `url` dans datasource (Prisma 7)
const schemaPath = "prisma/schema.prisma";
if (existsSync(schemaPath)) {
  const schema = readFileSync(schemaPath, "utf8");
  const datasource = schema.match(/datasource\s+\w+\s*\{([^}]*)\}/);
  if (datasource && /\burl\s*=/.test(datasource[1] ?? "")) {
    violations.push(
      `[Prisma 7] ${schemaPath} : le bloc datasource ne doit pas contenir d'url (config dans prisma.config.ts).`,
    );
  }
}

// 4. Pas de middleware.ts (Next 16 → proxy.ts)
for (const candidate of ["middleware.ts", "src/middleware.ts", "app/middleware.ts"]) {
  if (existsSync(candidate)) {
    violations.push(
      `[Next 16] ${candidate} existe : le middleware s'appelle proxy.ts en Next.js 16.`,
    );
  }
}

console.log("");
console.log("============================================================");
console.log("  INVARIANTS CURIO — vérification déterministe");
console.log("============================================================\n");

if (violations.length === 0) {
  console.log("  OK — tous les invariants sont respectés");
  console.log("\n============================================================");
  process.exit(0);
} else {
  for (const v of violations) console.log(`  ✖ ${v}`);
  console.log(`\n  KO — ${violations.length} invariant(s) violé(s)`);
  console.log("============================================================");
  process.exit(1);
}
