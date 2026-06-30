import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations : connexion DIRECTE (non-poolée) en prod (Neon) ; repli local.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
    shadowDatabaseUrl:
      process.env.SHADOW_DATABASE_URL ??
      "postgresql://dimitrizindovic@localhost:5432/curio_shadow",
  },
});
