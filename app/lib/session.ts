import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth-server";

/**
 * Renvoie l'utilisateur connecté (Server Component ou Server Action).
 * Redirige vers /login si aucune session valide.
 */
export async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }
  return session.user;
}

/** Variante sans redirection (renvoie null si non connecté). */
export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}
