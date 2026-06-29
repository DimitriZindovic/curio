import Parser from "rss-parser";
import { prisma } from "@/app/lib/prisma";
import { computeScore } from "@/app/lib/scoring";

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "Curio/1.0 (+veille techno)" },
});

export type FeedItem = {
  title: string;
  url: string;
  content: string | null;
  excerpt: string | null;
  publishedAt: Date | null;
};

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Récupère et normalise les entrées d'un flux RSS/Atom. */
export async function parseFeed(url: string): Promise<FeedItem[]> {
  const feed = await parser.parseURL(url);
  const items: FeedItem[] = [];

  for (const item of feed.items) {
    const link = item.link?.trim();
    if (!link) continue;

    const rawContent =
      (item as Record<string, unknown>)["content:encoded"] ??
      item.content ??
      item.contentSnippet ??
      "";
    const content = typeof rawContent === "string" ? rawContent : "";
    const excerptSource = item.contentSnippet ?? stripHtml(content);

    items.push({
      title: item.title?.trim() || link,
      url: link,
      content: content || null,
      excerpt: excerptSource ? excerptSource.slice(0, 400) : null,
      publishedAt: item.isoDate ? new Date(item.isoDate) : null,
    });
  }
  return items;
}

export type RefreshResult = {
  added: number;
  total: number;
  error?: string;
};

/** Rafraîchit une source : insère les nouveaux articles (dédoublonnés par URL). */
export async function refreshSource(sourceId: string): Promise<RefreshResult> {
  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source) return { added: 0, total: 0, error: "Source introuvable" };
  if (source.type !== "RSS") {
    return { added: 0, total: 0, error: "Source non RSS" };
  }

  let items: FeedItem[];
  try {
    items = await parseFeed(source.url);
  } catch (err) {
    return {
      added: 0,
      total: 0,
      error: err instanceof Error ? err.message : "Échec du parsing du flux",
    };
  }

  const interests = await prisma.interest.findMany({
    where: { userId: source.userId },
  });
  let added = 0;

  for (const item of items) {
    const exists = await prisma.article.findUnique({
      where: { userId_url: { userId: source.userId, url: item.url } },
      select: { id: true },
    });
    if (exists) continue;

    const relevanceScore = computeScore(item, interests);
    await prisma.article.create({
      data: {
        title: item.title,
        url: item.url,
        content: item.content,
        excerpt: item.excerpt,
        publishedAt: item.publishedAt,
        relevanceScore,
        sourceId: source.id,
        userId: source.userId,
      },
    });
    added += 1;
  }

  await prisma.source.update({
    where: { id: source.id },
    data: { lastFetchedAt: new Date() },
  });

  return { added, total: items.length };
}

/** Rafraîchit toutes les sources RSS actives. */
export async function refreshActiveSources(): Promise<{
  sources: number;
  added: number;
}> {
  const sources = await prisma.source.findMany({
    where: { active: true, type: "RSS" },
    select: { id: true },
  });

  let added = 0;
  for (const { id } of sources) {
    const result = await refreshSource(id);
    added += result.added;
  }
  return { sources: sources.length, added };
}
