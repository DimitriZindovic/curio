import Link from "next/link";
import type { CSSProperties } from "react";
import type { Prisma } from "@prisma/client";
import ScoreRing from "@/app/components/ScoreRing";
import { toggleRead } from "@/app/lib/actions/articles";

type ArticleWithRelations = Prisma.ArticleGetPayload<{
  include: { source: true; tags: true };
}>;

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}

function ArticleMeta({ article }: { article: ArticleWithRelations }) {
  const dot: CSSProperties = article.read
    ? { background: "#3a414e" }
    : { background: "var(--color-accent)", boxShadow: "0 0 7px var(--color-accent)" };
  return (
    <div className="flex items-start gap-[15px]">
      <ScoreRing score={article.relevanceScore} />
      <div className="min-w-0 flex-1">
        <div className="mb-[5px] flex items-center gap-[7px] text-xs text-muted">
          <span className="size-[7px] shrink-0 rounded-full" style={dot} />
          <span className="font-semibold text-text-3">
            {article.source?.name ?? "Sans source"}
          </span>
          {article.publishedAt && (
            <>
              <span>·</span>
              <span>{formatDate(article.publishedAt)}</span>
            </>
          )}
        </div>
        <h3 className="text-base font-bold leading-[1.35] tracking-[-0.01em] text-text">
          {article.title}
        </h3>
      </div>
    </div>
  );
}

function ArticleActions({ article }: { article: ArticleWithRelations }) {
  const readBtn = `flex size-8 items-center justify-center rounded-[9px] border text-sm transition ${
    article.read ? "border-accent text-accent" : "border-border-2 text-muted hover:text-text-2"
  }`;
  return (
    <div className="mt-auto flex items-center gap-[7px]">
      {article.tags.map((tag) => (
        <span
          key={tag.id}
          className="rounded-[7px] px-[10px] py-[3px] text-xs font-semibold text-accent"
          style={{ background: "var(--color-accent-soft)" }}
        >
          {tag.label}
        </span>
      ))}
      <span className="relative z-10 ml-auto flex gap-[7px]">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Ouvrir l'original"
          className="flex size-8 items-center justify-center rounded-[9px] border border-border-2 text-sm text-muted transition hover:text-text-2"
        >
          ↗
        </a>
        <form action={toggleRead}>
          <input type="hidden" name="id" value={article.id} />
          <button
            type="submit"
            aria-label={article.read ? "Marquer non lu" : "Marquer lu"}
            className={readBtn}
          >
            ✓
          </button>
        </form>
      </span>
    </div>
  );
}

export default function ArticleCard({ article }: { article: ArticleWithRelations }) {
  return (
    <article className="relative flex flex-col gap-[13px] rounded-[17px] border border-border bg-surface p-[18px] transition hover:border-border-2 hover:bg-surface-hov">
      <Link
        href={`/articles/${article.id}`}
        aria-label={article.title}
        className="absolute inset-0 z-0 rounded-[17px]"
      />
      <ArticleMeta article={article} />
      {article.excerpt && (
        <p className="line-clamp-2 text-[13.5px] leading-[1.55] text-muted">
          {article.excerpt}
        </p>
      )}
      <ArticleActions article={article} />
    </article>
  );
}
