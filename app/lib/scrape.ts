import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export type ScrapedArticle = {
  title: string;
  content: string | null;
  excerpt: string | null;
  publishedAt: Date | null;
};

/**
 * Récupère une URL et en extrait le titre + le contenu lisible via Readability.
 */
export async function scrapeArticle(url: string): Promise<ScrapedArticle> {
  const response = await fetch(url, {
    headers: { "User-Agent": "Curio/1.0 (+veille techno)" },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Requête HTTP ${response.status}`);
  }

  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const parsed = reader.parse();

  const fallbackTitle =
    dom.window.document.querySelector("title")?.textContent?.trim() || url;

  return {
    title: parsed?.title?.trim() || fallbackTitle,
    content: parsed?.textContent?.trim() || null,
    excerpt: parsed?.excerpt?.trim()?.slice(0, 400) || null,
    publishedAt: parsed?.publishedTime ? new Date(parsed.publishedTime) : null,
  };
}
