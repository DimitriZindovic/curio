"use client";

import { useState, useTransition } from "react";
import { addTag, suggestArticleTags } from "@/app/lib/actions/tags";

function SuggestionList({
  articleId,
  suggestions,
}: {
  articleId: string;
  suggestions: string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted">
      <span className="flex items-center gap-2">
        <span className="size-[6px] rounded-full bg-accent" />
        Suggestions IA :
      </span>
      {suggestions.map((label) => (
        <form key={label} action={addTag} className="inline">
          <input type="hidden" name="articleId" value={articleId} />
          <input type="hidden" name="label" value={label} />
          <button
            type="submit"
            className="font-semibold text-accent transition hover:underline"
          >
            {label}
          </button>
        </form>
      ))}
    </div>
  );
}

export default function SuggestTags({ articleId }: { articleId: string }) {
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function loadSuggestions() {
    try {
      setSuggestions(await suggestArticleTags(articleId));
    } catch {
      setError("Échec de la suggestion IA (clé API manquante ?).");
    }
  }

  function handleSuggest() {
    setError(null);
    startTransition(loadSuggestions);
  }

  return (
    <div className="flex flex-col gap-2 text-[12px]">
      <button
        type="button"
        onClick={handleSuggest}
        disabled={pending}
        className="self-start rounded-[8px] border border-border-2 px-3 py-1.5 text-xs font-medium text-muted transition hover:text-text-2 disabled:opacity-60"
      >
        {pending ? "Analyse IA…" : "Suggérer des tags (IA)"}
      </button>

      {error && <p className="text-danger">{error}</p>}

      {suggestions && suggestions.length === 0 && !pending && (
        <p className="text-muted">Aucune nouvelle suggestion.</p>
      )}

      {suggestions && suggestions.length > 0 && (
        <SuggestionList articleId={articleId} suggestions={suggestions} />
      )}
    </div>
  );
}
