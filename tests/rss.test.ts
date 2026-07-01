import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock du parser rss-parser (instancie au niveau module dans rss.ts).
const { parseURLMock } = vi.hoisted(() => ({ parseURLMock: vi.fn() }));
vi.mock("rss-parser", () => ({
  default: class {
    parseURL = parseURLMock;
  },
}));
// rss.ts importe aussi prisma et computeScore : neutralises (parseFeed ne les utilise pas).
vi.mock("@/app/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/app/lib/scoring", () => ({ computeScore: () => 0 }));

import { parseFeed } from "@/app/lib/rss";

beforeEach(() => {
  parseURLMock.mockReset();
});

describe("parseFeed", () => {
  it("normalise les entrées RSS", async () => {
    parseURLMock.mockResolvedValue({
      items: [
        {
          title: "Article 1",
          link: "https://ex.com/1",
          contentSnippet: "Un résumé court",
          content: "<p>Contenu HTML</p>",
          isoDate: "2026-01-15T10:00:00.000Z",
        },
      ],
    });

    const items = await parseFeed("https://ex.com/feed");
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Article 1");
    expect(items[0].url).toBe("https://ex.com/1");
    expect(items[0].excerpt).toBe("Un résumé court");
    expect(items[0].publishedAt).toBeInstanceOf(Date);
  });

  it("ignore les entrées sans lien", async () => {
    parseURLMock.mockResolvedValue({
      items: [
        { title: "Sans lien" },
        { title: "Avec lien", link: "https://ex.com/ok" },
      ],
    });

    const items = await parseFeed("https://ex.com/feed");
    expect(items).toHaveLength(1);
    expect(items[0].url).toBe("https://ex.com/ok");
  });
});

describe("parseFeed — extraction titre/extrait", () => {
  it("utilise le lien comme titre de repli", async () => {
    parseURLMock.mockResolvedValue({
      items: [{ link: "https://ex.com/no-title" }],
    });

    const items = await parseFeed("https://ex.com/feed");
    expect(items[0].title).toBe("https://ex.com/no-title");
  });

  it("extrait l'extrait du contenu HTML quand contentSnippet manque", async () => {
    parseURLMock.mockResolvedValue({
      items: [
        {
          title: "T",
          link: "https://ex.com/2",
          content: "<p>Texte <b>riche</b> ici</p>",
        },
      ],
    });

    const items = await parseFeed("https://ex.com/feed");
    expect(items[0].excerpt).toContain("Texte");
    expect(items[0].excerpt).not.toContain("<");
  });
});
