import { prisma } from "@/app/lib/prisma";
import { generateWeeklyDigest } from "@/app/lib/actions/digests";
import { requireUser } from "@/app/lib/session";
import DigestCard from "@/app/components/DigestCard";

export const dynamic = "force-dynamic";

function DigestsHeader() {
  return (
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
  );
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
      <DigestsHeader />

      <div className="flex-1 overflow-y-auto px-[34px] pt-5 pb-[34px]">
        {digests.length === 0 ? (
          <p className="rounded-[16px] border border-border bg-surface p-6 text-sm text-muted">
            Aucun digest pour l&apos;instant.
          </p>
        ) : (
          <div className="grid gap-[14px] md:grid-cols-2">
            {digests.map((digest) => (
              <DigestCard key={digest.id} digest={digest} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
