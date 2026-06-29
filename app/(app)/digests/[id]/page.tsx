import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import ScoreRing from "@/app/components/ScoreRing";
import { requireUser } from "@/app/lib/session";

export const dynamic = "force-dynamic";

export default async function DigestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const digest = await prisma.digest.findFirst({
    where: { id, userId: user.id },
    include: {
      articles: {
        orderBy: { relevanceScore: "desc" },
        include: { source: true },
      },
    },
  });

  if (!digest) notFound();

  return (
    <div className="mx-auto w-full max-w-[820px] px-[34px] pt-[26px] pb-[60px]">
      <Link
        href="/digests"
        className="mb-[22px] inline-block text-[13px] text-muted transition hover:text-text-3"
      >
        ← Retour aux digests
      </Link>

      <h1 className="text-[27px] font-extrabold tracking-[-0.02em] text-text">
        {digest.title}
      </h1>

      <div className="mt-6">
        {digest.articles.length === 0 ? (
          <p className="rounded-[16px] border border-border bg-surface p-6 text-sm text-muted">
            Ce digest ne contient aucun article.
          </p>
        ) : (
          <div className="flex flex-col gap-[11px]">
            {digest.articles.map((article) => (
              <Link
                key={article.id}
                href={`/articles/${article.id}`}
                className="flex items-start gap-[15px] rounded-[16px] border border-border bg-surface p-[18px] transition hover:border-border-2 hover:bg-surface-hov"
              >
                <ScoreRing score={article.relevanceScore} />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 text-xs text-muted">
                    {article.source?.name ?? "Sans source"}
                  </div>
                  <h3 className="text-base font-bold leading-[1.35] tracking-[-0.01em] text-text">
                    {article.title}
                  </h3>
                  {article.summary ? (
                    <p className="mt-2 line-clamp-2 text-[13.5px] leading-[1.55] text-muted">
                      {article.summary}
                    </p>
                  ) : article.excerpt ? (
                    <p className="mt-2 line-clamp-2 text-[13.5px] leading-[1.55] text-muted">
                      {article.excerpt}
                    </p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
