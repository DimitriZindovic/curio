"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { suggestTags } from "@/app/lib/ai";
import { requireUser } from "@/app/lib/session";

export async function addTag(formData: FormData) {
  const user = await requireUser();
  const articleId = String(formData.get("articleId") ?? "");
  const label = String(formData.get("label") ?? "")
    .trim()
    .toLowerCase();
  if (!articleId || !label) return;

  const article = await prisma.article.findFirst({
    where: { id: articleId, userId: user.id },
    select: { id: true },
  });
  if (!article) return;

  await prisma.article.update({
    where: { id: articleId },
    data: {
      tags: {
        connectOrCreate: {
          where: { userId_label: { userId: user.id, label } },
          create: { label, userId: user.id },
        },
      },
    },
  });
  revalidatePath(`/articles/${articleId}`);
  revalidatePath("/");
}

export async function removeTag(formData: FormData) {
  const user = await requireUser();
  const articleId = String(formData.get("articleId") ?? "");
  const tagId = String(formData.get("tagId") ?? "");
  if (!articleId || !tagId) return;

  const article = await prisma.article.findFirst({
    where: { id: articleId, userId: user.id },
    select: { id: true },
  });
  if (!article) return;

  await prisma.article.update({
    where: { id: articleId },
    data: { tags: { disconnect: { id: tagId } } },
  });
  revalidatePath(`/articles/${articleId}`);
  revalidatePath("/");
}

/** Suggestions de tags IA, hors tags déjà associés, scopées à l'utilisateur. */
export async function suggestArticleTags(
  articleId: string,
): Promise<string[]> {
  const user = await requireUser();
  const article = await prisma.article.findFirst({
    where: { id: articleId, userId: user.id },
    include: { tags: true },
  });
  if (!article) return [];

  const allTags = await prisma.tag.findMany({
    where: { userId: user.id },
    select: { label: true },
  });
  const source =
    article.content || article.summary || article.excerpt || article.title;

  const suggestions = await suggestTags(
    source,
    allTags.map((t) => t.label),
  );

  const current = new Set(article.tags.map((t) => t.label));
  return suggestions.filter((label) => !current.has(label));
}
