"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { suggestTags } from "@/app/lib/ai";
import { recomputeUserScores } from "@/app/lib/scoring";
import { requireUser } from "@/app/lib/session";
import type { ActionState } from "@/app/lib/actions/types";

// Poids attribué à un centre d'intérêt ajouté depuis une suggestion IA :
// médian sur l'échelle usuelle, ajustable ensuite en place.
const SUGGESTED_INTEREST_WEIGHT = 3;
// Nombre d'articles les mieux notés analysés pour proposer des intérêts.
const TOP_ARTICLES_FOR_SUGGESTION = 12;

/**
 * Crée un centre d'intérêt (mot-clé déjà normalisé) et recalcule les scores.
 * Renvoie false si le mot-clé existe déjà pour cet utilisateur.
 */
async function insertInterest(
  userId: string,
  keyword: string,
  weight: number,
): Promise<boolean> {
  const existing = await prisma.interest.findUnique({
    where: { userId_keyword: { userId, keyword } },
  });
  if (existing) return false;

  await prisma.interest.create({ data: { keyword, weight, userId } });
  await recomputeUserScores(userId);
  return true;
}

export async function addInterest(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const keyword = String(formData.get("keyword") ?? "")
    .trim()
    .toLowerCase();
  const weight = Number(formData.get("weight") ?? 1);

  if (!keyword) return { error: "Le mot-clé est requis." };
  if (!Number.isFinite(weight) || weight < 1) {
    return { error: "Le poids doit être un entier ≥ 1." };
  }

  const created = await insertInterest(user.id, keyword, Math.floor(weight));
  if (!created) return { error: "Ce mot-clé existe déjà." };

  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true };
}

/** Ajoute un centre d'intérêt issu d'une suggestion IA, poids par défaut. */
export async function addSuggestedInterest(formData: FormData) {
  const user = await requireUser();
  const keyword = String(formData.get("keyword") ?? "")
    .trim()
    .toLowerCase();
  if (!keyword) return;

  await insertInterest(user.id, keyword, SUGGESTED_INTEREST_WEIGHT);
  revalidatePath("/settings");
  revalidatePath("/");
}

/**
 * Propose de nouveaux mots-clés d'intérêt à partir des articles les mieux
 * notés de l'utilisateur, en réutilisant `suggestTags` (seul appel LLM permis).
 * N'invente aucun score : le LLM ne fait que dégager des thèmes du corpus.
 */
export async function suggestInterests(): Promise<string[]> {
  const user = await requireUser();
  const [articles, interests] = await Promise.all([
    prisma.article.findMany({
      where: { userId: user.id },
      orderBy: [{ relevanceScore: "desc" }, { createdAt: "desc" }],
      take: TOP_ARTICLES_FOR_SUGGESTION,
      select: { title: true, summary: true, excerpt: true },
    }),
    prisma.interest.findMany({
      where: { userId: user.id },
      select: { keyword: true },
    }),
  ]);
  if (articles.length === 0) return [];

  const corpus = articles
    .map((a) => [a.title, a.summary, a.excerpt].filter(Boolean).join(" — "))
    .join("\n\n");

  const existing = interests.map((i) => i.keyword);
  const suggestions = await suggestTags(corpus, existing);

  const current = new Set(existing);
  return suggestions.filter((keyword) => !current.has(keyword));
}

/** Met à jour le poids d'un centre d'intérêt et recalcule les scores. */
export async function updateInterestWeight(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const weight = Number(formData.get("weight"));
  if (!id || !Number.isFinite(weight) || weight < 1) return;

  const updated = await prisma.interest.updateMany({
    where: { id, userId: user.id },
    data: { weight: Math.floor(weight) },
  });
  if (updated.count === 0) return;

  await recomputeUserScores(user.id);
  revalidatePath("/settings");
  revalidatePath("/");
}

export async function deleteInterest(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.interest.deleteMany({ where: { id, userId: user.id } });
  await recomputeUserScores(user.id);
  revalidatePath("/settings");
  revalidatePath("/");
}

export async function recomputeScores() {
  const user = await requireUser();
  await recomputeUserScores(user.id);
  revalidatePath("/settings");
  revalidatePath("/");
}
