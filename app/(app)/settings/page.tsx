import { prisma } from "@/app/lib/prisma";
import AddInterestForm from "@/app/components/AddInterestForm";
import { deleteInterest, recomputeScores } from "@/app/lib/actions/interests";
import { requireUser } from "@/app/lib/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const interests = await prisma.interest.findMany({
    where: { userId: user.id },
    orderBy: [{ weight: "desc" }, { keyword: "asc" }],
  });

  return (
    <>
      <div className="shrink-0 px-[34px] pt-[26px]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-text">
              Pertinence
            </h1>
            <p className="mt-[5px] max-w-[560px] text-sm leading-[1.5] text-muted">
              Le score d&apos;un article est la somme des poids des centres
              d&apos;intérêt dont le mot-clé apparaît dans son titre, son résumé
              ou son contenu.
            </p>
          </div>
          <form action={recomputeScores}>
            <button
              type="submit"
              className="rounded-[11px] border border-border-2 bg-surface px-[18px] py-[11px] text-sm font-semibold text-text-3 transition hover:bg-surface-hov"
            >
              ↻ Recalculer
            </button>
          </form>
        </div>

        <div className="mt-[18px]">
          <AddInterestForm />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-[34px] pt-[18px] pb-[34px]">
        {interests.length === 0 ? (
          <p className="rounded-[13px] border border-border bg-surface p-6 text-sm text-muted">
            Aucun centre d&apos;intérêt défini. Tous les articles ont un score de 0.
          </p>
        ) : (
          <div className="flex flex-col gap-[9px]">
            {interests.map((interest) => (
              <div
                key={interest.id}
                className="flex items-center gap-4 rounded-[13px] border border-border bg-surface px-4 py-[13px]"
              >
                <span
                  className="min-w-[48px] rounded-[8px] px-[11px] py-1 text-center font-mono text-[14px] font-semibold text-accent"
                  style={{ background: "var(--color-accent-soft)" }}
                >
                  +{interest.weight}
                </span>
                <span className="shrink-0 text-[15px] font-semibold text-text-2">
                  {interest.keyword}
                </span>
                <div className="h-[6px] flex-1 overflow-hidden rounded-[3px] bg-track">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${Math.min(100, interest.weight * 10)}%` }}
                  />
                </div>
                <form action={deleteInterest}>
                  <input type="hidden" name="id" value={interest.id} />
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
            ))}
          </div>
        )}
      </div>
    </>
  );
}
