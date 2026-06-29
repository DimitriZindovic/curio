"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { requireUser } from "@/app/lib/session";

const MAX_ARTICLES = 10;

/**
 * Génère un snapshot hebdo : les meilleurs articles (par score) de l'utilisateur
 * ajoutés au cours des 7 derniers jours.
 */
export async function generateWeeklyDigest() {
  const user = await requireUser();
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

  const articles = await prisma.article.findMany({
    where: { userId: user.id, createdAt: { gte: periodStart, lte: periodEnd } },
    orderBy: [{ relevanceScore: "desc" }, { createdAt: "desc" }],
    take: MAX_ARTICLES,
    select: { id: true },
  });

  const formatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });
  const title = `Digest du ${formatter.format(periodStart)} au ${formatter.format(
    periodEnd,
  )}`;

  const digest = await prisma.digest.create({
    data: {
      title,
      periodStart,
      periodEnd,
      userId: user.id,
      articles: { connect: articles.map((a) => ({ id: a.id })) },
    },
  });

  revalidatePath("/digests");
  redirect(`/digests/${digest.id}`);
}

export async function deleteDigest(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.digest.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/digests");
}
