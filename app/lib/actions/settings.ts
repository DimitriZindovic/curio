"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { requireUser } from "@/app/lib/session";

/**
 * Met à jour le plancher de pertinence de l'utilisateur : les articles dont le
 * score est strictement inférieur sont masqués par défaut sur le dashboard.
 * Valeur normalisée à un entier ≥ 0 (0 = aucun filtre).
 */
export async function updateRelevanceThreshold(formData: FormData) {
  const user = await requireUser();
  const raw = Number(formData.get("minRelevanceScore") ?? 0);
  const value = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;

  await prisma.user.update({
    where: { id: user.id },
    data: { minRelevanceScore: value },
  });

  revalidatePath("/settings");
  revalidatePath("/");
}
