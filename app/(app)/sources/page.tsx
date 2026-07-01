import { prisma } from "@/app/lib/prisma";
import AddSourceForm from "@/app/components/AddSourceForm";
import SourceRow from "@/app/components/SourceRow";
import { refreshAllSources } from "@/app/lib/actions/sources";
import { requireUser } from "@/app/lib/session";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null): string {
  if (!date) return "jamais";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function SourcesHeader({
  total,
  activeCount,
}: {
  total: number;
  activeCount: number;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-text">
          Sources
        </h1>
        <p className="mt-[5px] text-sm text-muted">
          {total} source(s) · {activeCount} active(s)
        </p>
      </div>
      <form action={refreshAllSources}>
        <button
          type="submit"
          className="rounded-[11px] border border-border-2 bg-surface px-[18px] py-[11px] text-sm font-semibold text-text-3 transition hover:bg-surface-hov"
        >
          ↻ Tout rafraîchir
        </button>
      </form>
    </div>
  );
}

export default async function SourcesPage() {
  const user = await requireUser();
  const sources = await prisma.source.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { articles: true } } },
  });
  const activeCount = sources.filter((s) => s.active).length;

  return (
    <>
      <div className="shrink-0 px-[34px] pt-[26px]">
        <SourcesHeader total={sources.length} activeCount={activeCount} />
        <div className="mt-[18px]">
          <AddSourceForm />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-[34px] pt-[18px] pb-[34px]">
        {sources.length === 0 ? (
          <p className="rounded-[15px] border border-border bg-surface p-6 text-sm text-muted">
            Aucune source pour le moment. Ajoutez un flux RSS ci-dessus.
          </p>
        ) : (
          <div className="flex flex-col gap-[11px]">
            {sources.map((source) => (
              <SourceRow
                key={source.id}
                id={source.id}
                name={source.name}
                url={source.url}
                category={source.category}
                active={source.active}
                articleCount={source._count.articles}
                lastFetchedLabel={formatDate(source.lastFetchedAt)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
