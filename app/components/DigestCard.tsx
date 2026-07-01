import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { scoreColor } from "@/app/components/ScoreRing";
import { deleteDigest } from "@/app/lib/actions/digests";

export type DigestWithTop = Prisma.DigestGetPayload<{
  include: {
    _count: { select: { articles: true } };
    articles: { select: { id: true; title: true; relevanceScore: true } };
  };
}>;

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}

function weekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((d.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `SEMAINE ${week}`;
}

function DigestTopArticles({
  articles,
}: {
  articles: { id: string; title: string; relevanceScore: number }[];
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-[13px]">
      {articles.map((a) => (
        <div key={a.id} className="flex items-center gap-[11px]">
          <span
            className="w-[26px] shrink-0 font-mono text-[13px] font-semibold"
            style={{ color: scoreColor(a.relevanceScore) }}
          >
            {a.relevanceScore}
          </span>
          <span className="truncate text-[13.5px] text-text-3">{a.title}</span>
        </div>
      ))}
    </div>
  );
}

export default function DigestCard({ digest }: { digest: DigestWithTop }) {
  return (
    <div className="flex flex-col gap-[14px] rounded-[16px] border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-[6px] font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
            {weekLabel(digest.periodStart)}
          </div>
          <Link
            href={`/digests/${digest.id}`}
            className="text-[18px] font-bold tracking-[-0.01em] text-text hover:underline"
          >
            {digest.title}
          </Link>
          <div className="mt-1 text-[13px] text-muted">
            {digest._count.articles} article(s) · créé le {formatDate(digest.createdAt)}
          </div>
        </div>
        <form action={deleteDigest}>
          <input type="hidden" name="id" value={digest.id} />
          <button
            type="submit"
            aria-label="Supprimer"
            className="flex size-[30px] items-center justify-center rounded-[8px] border text-[12px] text-danger transition hover:bg-surface-hov"
            style={{ borderColor: "var(--color-danger-bd)" }}
          >
            ✕
          </button>
        </form>
      </div>
      {digest.articles.length > 0 && <DigestTopArticles articles={digest.articles} />}
    </div>
  );
}
