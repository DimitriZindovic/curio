import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Verificateur d'invariants SPECIFIQUES a Curio — deterministe (zero LLM).
 *
 * Fait respecter les regles metier qui ne doivent jamais etre cassees
 * (cf. CLAUDE.md / PROJECT_RULES.md) :
 *   1. Chaque Server Action de `app/lib/actions/` appelle `requireUser()`.
 *   2. Le SDK Anthropic n'est utilise QUE dans `app/lib/ai.ts`.
 *   3. `schema.prisma` ne met pas d'`url` dans le bloc `datasource` (Prisma 7).
 *   4. Pas de `middleware.ts` (c'est `proxy.ts` en Next.js 16).
 *
 * Code de sortie : 0 si tout est respecte, 1 sinon.
 * Usage : npx tsx scripts/check-invariants.ts
 */

const violations: string[] = [];

// 1. Tout MODULE de Server Actions gate l'accès via requireUser().
//    On ne cible que les fichiers marqués "use server" : un module de types
//    partagés (ex. types.ts) n'expose aucune action et n'a rien à gater.
const actionsDir = "app/lib/actions";
if (existsSync(actionsDir)) {
  for (const file of readdirSync(actionsDir)) {
    if (!file.endsWith(".ts")) continue;
    const content = readFileSync(join(actionsDir, file), "utf8");
    const isServerActionModule = /["']use server["']/.test(content);
    if (isServerActionModule && !content.includes("requireUser(")) {
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

const line = (text = ""): void => {
  process.stdout.write(`${text}\n`);
};

line("");
line("============================================================");
line("  INVARIANTS CURIO — vérification déterministe");
line("============================================================");
line("");

if (violations.length === 0) {
  line("  OK — tous les invariants sont respectés");
  line("");
  line("============================================================");
  process.exit(0);
} else {
  for (const v of violations) line(`  ✖ ${v}`);
  line("");
  line(`  KO — ${violations.length} invariant(s) violé(s)`);
  line("============================================================");
  process.exit(1);
}
