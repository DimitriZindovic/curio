import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/app/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  // Le port 3000 peut être pris (Docker…) : Next se rabat sur 3001/3002.
  // On autorise ces origines locales pour éviter l'erreur « Invalid origin ».
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
  ],
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
