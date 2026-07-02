import { prisma } from "@/app/lib/prisma";
import { computeScore } from "@/app/lib/scoring-core";

export { computeScore } from "@/app/lib/scoring-core";
export type { Interest, ScoringInput } from "@/app/lib/scoring-core";

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
