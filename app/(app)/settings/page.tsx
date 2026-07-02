import { prisma } from "@/app/lib/prisma";
import AddInterestForm from "@/app/components/AddInterestForm";
import SuggestInterests from "@/app/components/SuggestInterests";
import {
  deleteInterest,
  recomputeScores,
  updateInterestWeight,
} from "@/app/lib/actions/interests";
import { updateRelevanceThreshold } from "@/app/lib/actions/settings";
import { requireUser } from "@/app/lib/session";

export const dynamic = "force-dynamic";

function InterestRow({
  interest,
}: {
  interest: { id: string; keyword: string; weight: number };
}) {
  return (
    <div className="flex items-center gap-4 rounded-[13px] border border-border bg-surface px-4 py-[13px]">
      <form action={updateInterestWeight} className="flex items-center gap-[6px]">
        <input type="hidden" name="id" value={interest.id} />
        <input
          type="number"
          name="weight"
          min={1}
          defaultValue={interest.weight}
          aria-label={`Poids de ${interest.keyword}`}
          className="w-[58px] rounded-[8px] border-0 px-[9px] py-1 text-center font-mono text-[14px] font-semibold text-accent outline-none focus:ring-1 focus:ring-accent"
          style={{ background: "var(--color-accent-soft)" }}
        />
        <button
          type="submit"
          aria-label={`Enregistrer le poids de ${interest.keyword}`}
          className="flex size-[30px] items-center justify-center rounded-[8px] border border-border-2 text-[12px] text-muted transition hover:bg-surface-hov hover:text-text-2"
        >
          ✓
        </button>
      </form>
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
  );
}

function ThresholdForm({ threshold }: { threshold: number }) {
  return (
    <form
      action={updateRelevanceThreshold}
      className="flex items-center gap-3 rounded-[13px] border border-border bg-surface px-4 py-[11px]"
    >
      <label htmlFor="minRelevanceScore" className="text-sm text-muted">
        Masquer les articles sous un score de
      </label>
      <input
        id="minRelevanceScore"
        name="minRelevanceScore"
        type="number"
        min={0}
        defaultValue={threshold || ""}
        placeholder="0"
        className="w-[80px] rounded-[8px] border border-border-2 bg-transparent px-3 py-1.5 text-sm text-text-2 outline-none placeholder:text-faint"
      />
      <button
        type="submit"
        className="rounded-[9px] border border-border-2 bg-surface px-[14px] py-[7px] text-sm font-semibold text-text-3 transition hover:bg-surface-hov"
      >
        Enregistrer
      </button>
    </form>
  );
}

function SettingsHeader({ threshold }: { threshold: number }) {
  return (
    <div className="shrink-0 px-[34px] pt-[26px]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-text">
            Pertinence
          </h1>
          <p className="mt-[5px] max-w-[560px] text-sm leading-[1.5] text-muted">
            Le score d&apos;un article est la somme des poids des centres
            d&apos;intérêt dont le mot-clé apparaît dans son titre, son résumé ou
            son contenu.
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
      <div className="mt-[18px] flex flex-col gap-[10px]">
        <AddInterestForm />
        <SuggestInterests />
        <ThresholdForm threshold={threshold} />
      </div>
    </div>
  );
}

export default async function SettingsPage() {
  const user = await requireUser();
  const [interests, settings] = await Promise.all([
    prisma.interest.findMany({
      where: { userId: user.id },
      orderBy: [{ weight: "desc" }, { keyword: "asc" }],
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { minRelevanceScore: true },
    }),
  ]);

  return (
    <>
      <SettingsHeader threshold={settings?.minRelevanceScore ?? 0} />

      <div className="flex-1 overflow-y-auto px-[34px] pt-[18px] pb-[34px]">
        {interests.length === 0 ? (
          <p className="rounded-[13px] border border-border bg-surface p-6 text-sm text-muted">
            Aucun centre d&apos;intérêt défini. Tous les articles ont un score de 0.
          </p>
        ) : (
          <div className="flex flex-col gap-[9px]">
            {interests.map((interest) => (
              <InterestRow key={interest.id} interest={interest} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
