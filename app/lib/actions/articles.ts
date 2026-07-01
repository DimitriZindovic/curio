"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { scrapeArticle } from "@/app/lib/scrape";
import { computeScore } from "@/app/lib/scoring";
import { summarize } from "@/app/lib/ai";
import { requireUser } from "@/app/lib/session";

export type AddArticleState = { error?: string; ok?: boolean };

/** Récupère (ou crée) la source virtuelle des ajouts manuels de l'utilisateur. */
async function getManualSource(userId: string) {
  const url = "curio://manual";
  return prisma.source.upsert({
    where: { userId_url: { userId, url } },
    update: {},
    create: { name: "Ajouts manuels", url, type: "MANUAL", active: false, userId },
  });
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export async function addManualArticle(
  _prevState: AddArticleState,
  formData: FormData,
): Promise<AddArticleState> {
  const user = await requireUser();
  const url = String(formData.get("url") ?? "").trim();
  if (!url) return { error: "L'URL est requise." };
  if (!isValidUrl(url)) return { error: "URL invalide." };

  const existing = await prisma.article.findUnique({
    where: { userId_url: { userId: user.id, url } },
  });
  if (existing) return { error: "Cet article a déjà été ajouté." };

  let scraped;
  try {
    scraped = await scrapeArticle(url);
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? `Échec de l'extraction : ${err.message}`
          : "Échec de l'extraction.",
    };
  }

  const [interests, manualSource] = await Promise.all([
    prisma.interest.findMany({ where: { userId: user.id } }),
    getManualSource(user.id),
  ]);
  const relevanceScore = computeScore(scraped, interests);

  await prisma.article.create({
    data: {
      title: scraped.title,
      url,
      content: scraped.content,
      excerpt: scraped.excerpt,
      publishedAt: scraped.publishedAt,
      relevanceScore,
      sourceId: manualSource.id,
      userId: user.id,
    },
  });

  revalidatePath("/");
  return { ok: true };
}

export async function toggleRead(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const article = await prisma.article.findFirst({
    where: { id, userId: user.id },
  });
  if (!article) return;
  await prisma.article.update({
    where: { id },
    data: { read: !article.read },
  });
  revalidatePath("/");
  revalidatePath(`/articles/${id}`);
}

export async function deleteArticle(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.article.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/");
}

const THIN_CONTENT_THRESHOLD = 600;

type ResolvedContent = { content: string; excerpt: string | null };

/**
 * Beaucoup de flux (Hacker News, etc.) ne donnent qu'un extrait ou un lien vers
 * les commentaires. Si le contenu stocké est trop maigre, on scrape l'article
 * pour récupérer le vrai texte avant de résumer. Guard clauses = nesting plat.
 */
async function resolveContent(article: {
  content: string | null;
  excerpt: string | null;
  url: string;
}): Promise<ResolvedContent> {
  const content = article.content ?? "";
  const excerpt = article.excerpt;
  const isExternal = !article.url.startsWith("curio://");
  if (content.trim().length >= THIN_CONTENT_THRESHOLD || !isExternal) {
    return { content, excerpt };
  }
  try {
    const scraped = await scrapeArticle(article.url);
    const text = scraped.content;
    if (text && text.length > content.length)
      return { content: text, excerpt: excerpt ?? scraped.excerpt };
  } catch {
    // Scraping impossible (paywall, JS, 403…) : on garde ce qu'on a.
  }
  return { content, excerpt };
}

export async function summarizeArticle(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const article = await prisma.article.findFirst({
    where: { id, userId: user.id },
  });
  if (!article) return;

  const { content, excerpt } = await resolveContent(article);
  const source = content || article.excerpt || article.title;
  const summary = await summarize(source);
  if (!summary) return;

  const interests = await prisma.interest.findMany({ where: { userId: user.id } });
  const relevanceScore = computeScore(
    { ...article, content, excerpt, summary },
    interests,
  );

  await prisma.article.update({
    where: { id },
    // On persiste le contenu scrapé pour les prochains résumés / le scoring.
    data: { summary, relevanceScore, content, excerpt },
  });
  revalidatePath(`/articles/${id}`);
  revalidatePath("/");
}
