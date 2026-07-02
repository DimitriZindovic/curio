export type ScoringInput = {
  title?: string | null;
  content?: string | null;
  summary?: string | null;
  excerpt?: string | null;
};

export type Interest = { keyword: string; weight: number };

/** Détail du match d'un centre d'intérêt dans le corpus de l'article. */
export type ScoreMatch = {
  keyword: string;
  weight: number;
  matched: boolean;
};

export type ScoreExplanation = {
  score: number;
  haystack: string;
  matches: ScoreMatch[];
};

/** Concatène titre + résumé + extrait + contenu, en minuscule (ordre stable). */
function buildHaystack(article: ScoringInput): string {
  return [article.title, article.summary, article.excerpt, article.content]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * Explique le score : pour chaque centre d'intérêt, indique s'il matche le
 * corpus (sous-chaîne insensible à la casse) et sa contribution. Source unique
 * de la logique de scoring — `computeScore` en dérive.
 */
export function explainScore(
  article: ScoringInput,
  interests: Interest[],
): ScoreExplanation {
  const haystack = buildHaystack(article);
  const matches: ScoreMatch[] = interests.map(({ keyword, weight }) => {
    const needle = keyword.trim().toLowerCase();
    const matched = needle.length > 0 && haystack.includes(needle);
    return { keyword, weight, matched };
  });
  const score = matches.reduce(
    (sum, m) => (m.matched ? sum + m.weight : sum),
    0,
  );
  return { score, haystack, matches };
}

export function computeScore(
  article: ScoringInput,
  interests: Interest[],
): number {
  return explainScore(article, interests).score;
}
