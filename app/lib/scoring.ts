import { prisma } from "@/app/lib/prisma";

export type ScoringInput = {
  title?: string | null;
  content?: string | null;
  summary?: string | null;
  excerpt?: string | null;
};

export type Interest = { keyword: string; weight: number };

/**
 * Score = somme des poids des centres d'intérêt dont le mot-clé apparaît dans
 * le titre / résumé / extrait / contenu de l'article (insensible à la casse).
 * Déterministe et recalculable à volonté.
 */
export function computeScore(
  article: ScoringInput,
  interests: Interest[],
): number {
  const haystack = [
    article.title,
    article.summary,
    article.excerpt,
    article.content,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!haystack) return 0;

  let score = 0;
  for (const { keyword, weight } of interests) {
    const needle = keyword.trim().toLowerCase();
    if (needle && haystack.includes(needle)) {
      score += weight;
    }
  }
  return score;
}

/** Recalcule et persiste le score des articles d'un utilisateur. */
export async function recomputeUserScores(userId: string): Promise<number> {
  const interests = await prisma.interest.findMany({ where: { userId } });
  const articles = await prisma.article.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      content: true,
      summary: true,
      excerpt: true,
    },
  });

  let updated = 0;
  for (const article of articles) {
    const score = computeScore(article, interests);
    await prisma.article.update({
      where: { id: article.id },
      data: { relevanceScore: score },
    });
    updated += 1;
  }
  return updated;
}
