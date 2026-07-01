import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import ScoreRing from "@/app/components/ScoreRing";
import SuggestTags from "@/app/components/SuggestTags";
import { summarizeArticle, toggleRead } from "@/app/lib/actions/articles";
import { addTag, removeTag } from "@/app/lib/actions/tags";
import { requireUser } from "@/app/lib/session";

export const dynamic = "force-dynamic";

type Article = Prisma.ArticleGetPayload<{
  include: { source: true; tags: true };
}>;

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(date);
}

function ArticleHeader({ article }: { article: Article }) {
  const meta =
    (article.source?.name ?? "Sans source") +
    (article.publishedAt ? ` · ${formatDate(article.publishedAt)}` : "");
  return (
    <>
      <Link
        href="/"
        className="mb-[22px] inline-block text-[13px] text-muted transition hover:text-text-3"
      >
        ← Retour aux articles
      </Link>
      <div className="flex items-start gap-5">
        <ScoreRing score={article.relevanceScore} size={72} surface="var(--color-bg)" />
        <div className="min-w-0">
          <div className="mb-2 text-[13px] text-muted">{meta}</div>
          <h1 className="text-[27px] font-extrabold leading-[1.25] tracking-[-0.02em] text-text">
            {article.title}
          </h1>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-[10px]">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-[10px] bg-accent px-[17px] py-[10px] text-[13px] font-bold text-bg transition hover:opacity-90"
        >
          Ouvrir l&apos;original ↗
        </a>
        <form action={toggleRead}>
          <input type="hidden" name="id" value={article.id} />
          <button
            type="submit"
            className="rounded-[10px] border border-border-2 bg-surface px-[17px] py-[10px] text-[13px] font-semibold text-text-3 transition hover:bg-surface-hov"
          >
            {article.read ? "Marquer non lu ✓" : "Marquer lu ✓"}
          </button>
        </form>
      </div>
    </>
  );
}

function SummarySection({ article }: { article: Article }) {
  return (
    <section className="mt-6 rounded-[16px] border border-border bg-surface p-[22px]">
      <div className="mb-[13px] flex items-center justify-between">
        <div className="flex items-center gap-[9px]">
          <span className="size-2 rounded-[2px] bg-accent" />
          <h2 className="text-[15px] font-bold text-text">Résumé IA</h2>
        </div>
        <form action={summarizeArticle}>
          <input type="hidden" name="id" value={article.id} />
          <button
            type="submit"
            className="rounded-[8px] border border-border-2 px-3 py-1.5 text-xs text-muted transition hover:text-text-2"
          >
            {article.summary ? "Régénérer" : "Générer le résumé"}
          </button>
        </form>
      </div>
      {article.summary ? (
        <p className="text-[15px] leading-[1.7] text-text-3">{article.summary}</p>
      ) : (
        <p className="text-sm text-muted">
          Aucun résumé. Cliquez sur « Générer le résumé ».
        </p>
      )}
    </section>
  );
}

function TagPill({
  articleId,
  id,
  label,
}: {
  articleId: string;
  id: string;
  label: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-[8px] px-3 py-[5px] text-[13px] font-semibold text-accent"
      style={{ background: "var(--color-accent-soft)" }}
    >
      {label}
      <form action={removeTag} className="inline">
        <input type="hidden" name="articleId" value={articleId} />
        <input type="hidden" name="tagId" value={id} />
        <button
          type="submit"
          aria-label={`Retirer ${label}`}
          className="text-faint transition hover:text-danger"
        >
          ×
        </button>
      </form>
    </span>
  );
}

function TagsSection({ article }: { article: Article }) {
  return (
    <section className="mt-[15px] rounded-[16px] border border-border bg-surface p-[22px]">
      <h2 className="mb-[13px] text-[15px] font-bold text-text">Tags</h2>
      <div className="flex flex-wrap items-center gap-2">
        {article.tags.length === 0 && (
          <span className="text-sm text-muted">Aucun tag.</span>
        )}
        {article.tags.map((tag) => (
          <TagPill key={tag.id} articleId={article.id} id={tag.id} label={tag.label} />
        ))}
      </div>

      <form action={addTag} className="mt-[14px] flex gap-2">
        <input type="hidden" name="articleId" value={article.id} />
        <input
          name="label"
          placeholder="Ajouter un tag"
          required
          className="rounded-[8px] border border-border-2 bg-surface-2 px-3 py-1.5 text-sm text-text-2 outline-none placeholder:text-faint focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-[8px] bg-accent px-3 py-1.5 text-sm font-bold text-bg transition hover:opacity-90"
        >
          Ajouter
        </button>
      </form>

      <div className="mt-[14px]">
        <SuggestTags articleId={article.id} />
      </div>
    </section>
  );
}

function ContentSection({ content }: { content: string }) {
  return (
    <section className="mt-[15px] rounded-[16px] border border-border bg-surface p-[22px]">
      <h2 className="mb-[13px] text-[15px] font-bold text-text">Contenu</h2>
      <div className="text-[14.5px] leading-[1.8] whitespace-pre-wrap text-text-3">
        {content.slice(0, 8000)}
        {content.length > 8000 ? "…" : ""}
      </div>
    </section>
  );
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const article = await prisma.article.findFirst({
    where: { id, userId: user.id },
    include: { source: true, tags: { orderBy: { label: "asc" } } },
  });

  if (!article) notFound();

  return (
    <div className="mx-auto w-full max-w-[780px] px-[34px] pt-[26px] pb-[60px]">
      <ArticleHeader article={article} />
      <SummarySection article={article} />
      <TagsSection article={article} />
      {article.content && <ContentSection content={article.content} />}
    </div>
  );
}
