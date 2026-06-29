import Link from "next/link";
import { prisma } from "@/app/lib/prisma";
import { scoreColor } from "@/app/components/ScoreRing";
import { deleteDigest, generateWeeklyDigest } from "@/app/lib/actions/digests";
import { requireUser } from "@/app/lib/session";

export const dynamic = "force-dynamic";

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

export default async function DigestsPage() {
  const user = await requireUser();
  const digests = await prisma.digest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { articles: true } },
      articles: {
        orderBy: { relevanceScore: "desc" },
        take: 3,
        select: { id: true, title: true, relevanceScore: true },
      },
    },
  });

  return (
    <>
      <div className="shrink-0 px-[34px] pt-[26px]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-text">
              Digests
            </h1>
            <p className="mt-[5px] max-w-[520px] text-sm leading-[1.5] text-muted">
              Un instantané des meilleurs articles par pertinence des 7 derniers
              jours.
            </p>
          </div>
          <form action={generateWeeklyDigest}>
            <button
              type="submit"
              className="rounded-[11px] bg-accent px-[18px] py-[11px] text-sm font-bold text-bg transition hover:opacity-90"
            >
              ＋ Générer le digest hebdo
            </button>
          </form>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-[34px] pt-5 pb-[34px]">
        {digests.length === 0 ? (
          <p className="rounded-[16px] border border-border bg-surface p-6 text-sm text-muted">
            Aucun digest pour l&apos;instant.
          </p>
        ) : (
          <div className="grid gap-[14px] md:grid-cols-2">
            {digests.map((digest) => (
              <div
                key={digest.id}
                className="flex flex-col gap-[14px] rounded-[16px] border border-border bg-surface p-5"
              >
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
                      {digest._count.articles} article(s) · créé le{" "}
                      {formatDate(digest.createdAt)}
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

                {digest.articles.length > 0 && (
                  <div className="flex flex-col gap-2 border-t border-border pt-[13px]">
                    {digest.articles.map((a) => (
                      <div key={a.id} className="flex items-center gap-[11px]">
                        <span
                          className="w-[26px] shrink-0 font-mono text-[13px] font-semibold"
                          style={{ color: scoreColor(a.relevanceScore) }}
                        >
                          {a.relevanceScore}
                        </span>
                        <span className="truncate text-[13.5px] text-text-3">
                          {a.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
