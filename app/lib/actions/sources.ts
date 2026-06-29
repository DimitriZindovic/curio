"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { refreshSource } from "@/app/lib/rss";
import { requireUser } from "@/app/lib/session";

export type SourceFormState = { error?: string; ok?: boolean };

export async function createSource(
  _prevState: SourceFormState,
  formData: FormData,
): Promise<SourceFormState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;

  if (!name || !url) {
    return { error: "Le nom et l'URL du flux sont requis." };
  }
  try {
    new URL(url);
  } catch {
    return { error: "URL invalide." };
  }

  const existing = await prisma.source.findUnique({
    where: { userId_url: { userId: user.id, url } },
  });
  if (existing) {
    return { error: "Une source avec cette URL existe déjà." };
  }

  await prisma.source.create({
    data: { name, url, category, type: "RSS", userId: user.id },
  });

  revalidatePath("/sources");
  return { ok: true };
}

export async function updateSource(
  _prevState: SourceFormState,
  formData: FormData,
): Promise<SourceFormState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;

  if (!id) return { error: "Source introuvable." };
  if (!name || !url) {
    return { error: "Le nom et l'URL du flux sont requis." };
  }
  try {
    new URL(url);
  } catch {
    return { error: "URL invalide." };
  }

  const source = await prisma.source.findFirst({ where: { id, userId: user.id } });
  if (!source) return { error: "Source introuvable." };

  const conflict = await prisma.source.findUnique({
    where: { userId_url: { userId: user.id, url } },
  });
  if (conflict && conflict.id !== id) {
    return { error: "Une autre source utilise déjà cette URL." };
  }

  await prisma.source.update({
    where: { id },
    data: { name, url, category },
  });

  revalidatePath("/sources");
  return { ok: true };
}

export async function toggleSourceActive(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const source = await prisma.source.findFirst({ where: { id, userId: user.id } });
  if (!source) return;
  await prisma.source.update({
    where: { id },
    data: { active: !source.active },
  });
  revalidatePath("/sources");
}

export async function deleteSource(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.source.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/sources");
  revalidatePath("/");
}

export async function refreshOneSource(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const source = await prisma.source.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!source) return;
  await refreshSource(id);
  revalidatePath("/sources");
  revalidatePath("/");
}

export async function refreshAllSources() {
  const user = await requireUser();
  const sources = await prisma.source.findMany({
    where: { userId: user.id, active: true, type: "RSS" },
    select: { id: true },
  });
  for (const { id } of sources) {
    await refreshSource(id);
  }
  revalidatePath("/sources");
  revalidatePath("/");
}
