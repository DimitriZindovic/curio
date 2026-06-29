"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { recomputeUserScores } from "@/app/lib/scoring";
import { requireUser } from "@/app/lib/session";

export type InterestState = { error?: string; ok?: boolean };

export async function addInterest(
  _prevState: InterestState,
  formData: FormData,
): Promise<InterestState> {
  const user = await requireUser();
  const keyword = String(formData.get("keyword") ?? "")
    .trim()
    .toLowerCase();
  const weight = Number(formData.get("weight") ?? 1);

  if (!keyword) return { error: "Le mot-clé est requis." };
  if (!Number.isFinite(weight) || weight < 1) {
    return { error: "Le poids doit être un entier ≥ 1." };
  }

  const existing = await prisma.interest.findUnique({
    where: { userId_keyword: { userId: user.id, keyword } },
  });
  if (existing) return { error: "Ce mot-clé existe déjà." };

  await prisma.interest.create({
    data: { keyword, weight: Math.floor(weight), userId: user.id },
  });
  await recomputeUserScores(user.id);

  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true };
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
