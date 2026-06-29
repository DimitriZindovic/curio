import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import AddArticleForm from "@/app/components/AddArticleForm";
import ScoreRing from "@/app/components/ScoreRing";
import { toggleRead } from "@/app/lib/actions/articles";
import { requireUser } from "@/app/lib/session";

export const dynamic = "force-dynamic";

type SearchParams = {
  status?: string;
  sourceId?: string;
  tag?: string;
  sort?: string;
  minScore?: string;
  view?: string;
};

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}

function buildHref(current: SearchParams, overrides: Partial<SearchParams>) {
  const merged = { ...current, ...overrides };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v) sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `/?${qs}` : "/";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const status = params.status ?? "all";
  const sortBy = params.sort ?? "score";
  const view = params.view === "list" ? "list" : "grid";
  const minScore = Math.max(0, Math.floor(Number(params.minScore) || 0));

  const where: Prisma.ArticleWhereInput = { userId: user.id };
  if (status === "unread") where.read = false;
  if (status === "read") where.read = true;
  if (params.sourceId) where.sourceId = params.sourceId;
  if (params.tag) where.tags = { some: { label: params.tag } };
  if (minScore > 0) where.relevanceScore = { gte: minScore };

  const orderBy: Prisma.ArticleOrderByWithRelationInput[] =
    sortBy === "date"
      ? [{ publishedAt: "desc" }, { createdAt: "desc" }]
      : [{ relevanceScore: "desc" }, { createdAt: "desc" }];

  const [articles, sources, tags, totalCount, unreadCount, activeCount, agg] =
    await Promise.all([
      prisma.article.findMany({
        where,
        orderBy,
        take: 100,
        include: { source: true, tags: true },
      }),
      prisma.source.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
      prisma.tag.findMany({ where: { userId: user.id }, orderBy: { label: "asc" } }),
      prisma.article.count({ where: { userId: user.id } }),
      prisma.article.count({ where: { userId: user.id, read: false } }),
      prisma.source.count({ where: { userId: user.id, active: true } }),
      prisma.article.aggregate({
        where: { userId: user.id },
        _avg: { relevanceScore: true },
      }),
    ]);

  const avgScore = Math.round(agg._avg.relevanceScore ?? 0);

  const statusChips = [
    { key: "all", label: "Tous" },
    { key: "unread", label: "Non lus" },
    { key: "read", label: "Lus" },
  ];

  const selectClass =
    "rounded-[9px] border border-border bg-surface px-3 py-1.5 text-sm text-text-3 outline-none focus:border-border-2";

  const stats = [
    { glyph: "◔", label: "À lire", value: unreadCount, accent: false },
    { glyph: "◈", label: "Score moyen", value: avgScore, accent: true },
    { glyph: "⦿", label: "Sources actives", value: activeCount, accent: false },
  ];

  return (
    <>
      <div className="shrink-0 px-[34px] pt-[26px]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-text">
              Articles
            </h1>
            <p className="mt-[5px] text-sm text-muted">
              {totalCount} article(s) · {unreadCount} non lu(s)
            </p>
          </div>
          <AddArticleForm />
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-3 gap-[13px]">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-[14px] rounded-[15px] border border-border bg-surface px-[18px] py-4"
            >
              <span
                className="flex size-[42px] items-center justify-center rounded-[11px] text-[18px] text-accent"
                style={{ background: "var(--color-accent-soft)" }}
              >
                {s.glyph}
              </span>
              <div>
                <div className="text-xs font-semibold text-muted">{s.label}</div>
                <div
                  className={`text-[23px] font-extrabold tracking-[-0.02em] ${
                    s.accent ? "text-accent" : "text-text"
                  }`}
                >
                  {s.value}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="mt-[18px] flex flex-wrap items-center gap-[9px]">
          {statusChips.map((chip) => {
            const active = status === chip.key;
            return (
              <Link
                key={chip.key}
                href={buildHref(params, {
                  status: chip.key === "all" ? undefined : chip.key,
                })}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-accent text-bg"
                    : "border border-border bg-surface text-muted hover:text-text-3"
                }`}
              >
                {chip.label}
              </Link>
            );
          })}

          <span className="ml-auto flex items-center gap-[9px]">
            <Link
              href={buildHref(params, {
                sort: sortBy === "score" ? "date" : "score",
              })}
              className="text-sm text-muted transition hover:text-text-3"
            >
              {sortBy === "score" ? "Pertinence" : "Date"} ▾
            </Link>
            <span className="flex overflow-hidden rounded-[9px] border border-border bg-surface">
              <Link
                href={buildHref(params, { view: undefined })}
                className={`px-3 py-1.5 text-sm ${
                  view === "grid" ? "bg-accent text-bg" : "text-muted"
                }`}
              >
                ▦
              </Link>
              <Link
                href={buildHref(params, { view: "list" })}
                className={`px-3 py-1.5 text-sm ${
                  view === "list" ? "bg-accent text-bg" : "text-muted"
                }`}
              >
                ≡
              </Link>
            </span>
          </span>
        </div>

        {/* Filtres avancés */}
        <form className="mt-[10px] flex flex-wrap items-center gap-2">
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="sort" value={sortBy} />
          {view === "list" && <input type="hidden" name="view" value="list" />}
          <select name="sourceId" defaultValue={params.sourceId ?? ""} className={selectClass}>
            <option value="">Toutes les sources</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select name="tag" defaultValue={params.tag ?? ""} className={selectClass}>
            <option value="">Tous les tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.label}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            name="minScore"
            min={0}
            defaultValue={minScore || ""}
            placeholder="Score min."
            className={`${selectClass} w-28`}
          />
          <button
            type="submit"
            className="rounded-[9px] border border-border-2 bg-surface px-4 py-1.5 text-sm font-medium text-text-3 transition hover:bg-surface-hov"
          >
            Filtrer
          </button>
        </form>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto px-[34px] pt-5 pb-[34px]">
        {articles.length === 0 ? (
          <p className="rounded-[15px] border border-border bg-surface p-6 text-sm text-muted">
            Aucun article. Ajoutez des sources RSS et rafraîchissez-les, ou
            ajoutez un article par URL ci-dessus.
          </p>
        ) : (
          <div
            className="grid gap-[15px]"
            style={{
              gridTemplateColumns:
                view === "list" ? "1fr" : "repeat(2, minmax(0, 1fr))",
            }}
          >
            {articles.map((article) => (
              <article
                key={article.id}
                className="relative flex flex-col gap-[13px] rounded-[17px] border border-border bg-surface p-[18px] transition hover:border-border-2 hover:bg-surface-hov"
              >
                <Link
                  href={`/articles/${article.id}`}
                  aria-label={article.title}
                  className="absolute inset-0 z-0 rounded-[17px]"
                />
                <div className="flex items-start gap-[15px]">
                  <ScoreRing score={article.relevanceScore} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-[5px] flex items-center gap-[7px] text-xs text-muted">
                      <span
                        className="size-[7px] shrink-0 rounded-full"
                        style={
                          article.read
                            ? { background: "#3a414e" }
                            : {
                                background: "var(--color-accent)",
                                boxShadow: "0 0 7px var(--color-accent)",
                              }
                        }
                      />
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

                {article.excerpt && (
                  <p className="line-clamp-2 text-[13.5px] leading-[1.55] text-muted">
                    {article.excerpt}
                  </p>
                )}

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
                        className={`flex size-8 items-center justify-center rounded-[9px] border text-sm transition ${
                          article.read
                            ? "border-accent text-accent"
                            : "border-border-2 text-muted hover:text-text-2"
                        }`}
                      >
                        ✓
                      </button>
                    </form>
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
