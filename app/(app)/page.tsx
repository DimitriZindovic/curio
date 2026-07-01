import type { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { requireUser } from "@/app/lib/session";
import {
  AdvancedFilters,
  ArticleGrid,
  DashboardHeader,
  FilterChips,
  SortViewToggle,
  StatsBar,
  type SearchParams,
} from "@/app/components/DashboardParts";

export const dynamic = "force-dynamic";

async function loadDashboard(userId: string, params: SearchParams) {
  const status = params.status ?? "all";
  const sortBy = params.sort ?? "score";

  // Le plancher de pertinence enregistré agit comme minimum permanent ; le
  // filtre ad-hoc de l'URL ne peut que le relever (jamais l'abaisser).
  const settings = await prisma.user.findUnique({
    where: { id: userId },
    select: { minRelevanceScore: true },
  });
  const floor = settings?.minRelevanceScore ?? 0;
  const explicit = Math.max(0, Math.floor(Number(params.minScore) || 0));
  const minScore = Math.max(explicit, floor);

  const where: Prisma.ArticleWhereInput = { userId };
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
      prisma.article.findMany({ where, orderBy, take: 100, include: { source: true, tags: true } }),
      prisma.source.findMany({ where: { userId }, orderBy: { name: "asc" } }),
      prisma.tag.findMany({ where: { userId }, orderBy: { label: "asc" } }),
      prisma.article.count({ where: { userId } }),
      prisma.article.count({ where: { userId, read: false } }),
      prisma.source.count({ where: { userId, active: true } }),
      prisma.article.aggregate({ where: { userId }, _avg: { relevanceScore: true } }),
    ]);

  return {
    articles,
    sources,
    tags,
    totalCount,
    unreadCount,
    activeCount,
    avgScore: Math.round(agg._avg.relevanceScore ?? 0),
    status,
    sortBy,
    minScore,
    view: params.view === "list" ? "list" : "grid",
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const d = await loadDashboard(user.id, params);

  return (
    <>
      <div className="shrink-0 px-[34px] pt-[26px]">
        <DashboardHeader totalCount={d.totalCount} unreadCount={d.unreadCount} />

        <StatsBar
          unreadCount={d.unreadCount}
          avgScore={d.avgScore}
          activeCount={d.activeCount}
        />

        <div className="mt-[18px] flex flex-wrap items-center gap-[9px]">
          <FilterChips params={params} status={d.status} />
          <SortViewToggle params={params} sortBy={d.sortBy} view={d.view} />
        </div>

        <AdvancedFilters
          params={params}
          status={d.status}
          sortBy={d.sortBy}
          view={d.view}
          minScore={d.minScore}
          sources={d.sources}
          tags={d.tags}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-[34px] pt-5 pb-[34px]">
        <ArticleGrid articles={d.articles} view={d.view} />
      </div>
    </>
  );
}
