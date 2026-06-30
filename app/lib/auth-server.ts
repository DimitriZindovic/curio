import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/app/lib/prisma";

// Origines de confiance : localhost (le port 3000 peut être pris → 3001/3002)
// + les domaines fournis par Vercel en prod/preview. Évite « Invalid origin ».
const trustedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
];
for (const origin of [
  process.env.BETTER_AUTH_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL &&
    `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
  process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
]) {
  if (origin) trustedOrigins.push(origin);
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    // Pas de serveur d'email configuré : on n'exige pas la vérification.
    requireEmailVerification: false,
    autoSignIn: true,
  },
  user: {
    deleteUser: {
      enabled: true,
    },
  },
  // Doit rester en dernier : pose les cookies dans les Server Actions Next.
  plugins: [nextCookies()],
});
