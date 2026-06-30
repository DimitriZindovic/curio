import { describe, it, expect, vi } from "vitest";

// computeScore est pure mais le module importe le client Prisma : on le neutralise.
vi.mock("@/app/lib/prisma", () => ({ prisma: {} }));

import { computeScore, type Interest } from "@/app/lib/scoring";
import { scoreColor } from "@/app/components/ScoreRing";

const interests: Interest[] = [
  { keyword: "rust", weight: 3 },
  { keyword: "ia", weight: 2 },
  { keyword: "sécurité", weight: 1 },
];

describe("computeScore", () => {
  it("renvoie 0 sans centre d'intérêt", () => {
    expect(computeScore({ title: "Rust et IA" }, [])).toBe(0);
  });

  it("renvoie 0 quand aucun texte n'est fourni", () => {
    expect(computeScore({}, interests)).toBe(0);
  });

  it("additionne les poids des mots-clés présents", () => {
    const article = {
      title: "Nouveautés Rust",
      summary: "Un point sur la sécurité du langage.",
    };
    // rust (3) + sécurité (1) = 4
    expect(computeScore(article, interests)).toBe(4);
  });

  it("est insensible à la casse", () => {
    expect(computeScore({ title: "RUST RULES" }, interests)).toBe(3);
  });

  it("cherche dans titre, résumé, extrait et contenu", () => {
    expect(computeScore({ content: "blah rust blah" }, interests)).toBe(3);
    expect(computeScore({ excerpt: "à propos d'ia" }, interests)).toBe(2);
  });

  it("ne compte chaque mot-clé qu'une fois même répété", () => {
    expect(computeScore({ title: "rust rust rust" }, interests)).toBe(3);
  });

  it("renvoie 0 quand aucun mot-clé ne correspond", () => {
    expect(computeScore({ title: "Article sur Python" }, interests)).toBe(0);
  });
});

describe("scoreColor", () => {
  it("vert vif pour un score élevé (>= 85)", () => {
    expect(scoreColor(90)).toBe("var(--color-accent)");
    expect(scoreColor(85)).toBe("var(--color-accent)");
  });

  it("vert sourd pour un score moyen (70-84)", () => {
    expect(scoreColor(70)).toBe("var(--color-accent-dim)");
    expect(scoreColor(84)).toBe("var(--color-accent-dim)");
  });

  it("gris pour un score bas (< 70)", () => {
    expect(scoreColor(69)).toBe("var(--color-score-low)");
    expect(scoreColor(0)).toBe("var(--color-score-low)");
  });
});
