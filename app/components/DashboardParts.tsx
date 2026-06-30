import Link from "next/link";
import type { Prisma } from "@prisma/client";
import ArticleCard from "@/app/components/ArticleCard";

export type SearchParams = {
  status?: string;
  sourceId?: string;
  tag?: string;
  sort?: string;
  minScore?: string;
  view?: string;
};

export type ArticleWithRelations = Prisma.ArticleGetPayload<{
  include: { source: true; tags: true };
}>;
type Option = { id: string; name: string };

const selectClass =
  "rounded-[9px] border border-border bg-surface px-3 py-1.5 text-sm text-text-3 outline-none focus:border-border-2";

export function buildHref(current: SearchParams, overrides: Partial<SearchParams>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...overrides })) {
    if (v) sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `/?${qs}` : "/";
}

export function StatsBar({
  unreadCount,
  avgScore,
  activeCount,
}: {
  unreadCount: number;
  avgScore: number;
  activeCount: number;
}) {
  const stats = [
    { glyph: "◔", label: "À lire", value: unreadCount, accent: false },
    { glyph: "◈", label: "Score moyen", value: avgScore, accent: true },
    { glyph: "⦿", label: "Sources actives", value: activeCount, accent: false },
  ];
  return (
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
  );
}

export function FilterChips({
  params,
  status,
}: {
  params: SearchParams;
  status: string;
}) {
  const chips = [
    { key: "all", label: "Tous" },
    { key: "unread", label: "Non lus" },
    { key: "read", label: "Lus" },
  ];
  return (
    <>
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={buildHref(params, {
            status: chip.key === "all" ? undefined : chip.key,
          })}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            status === chip.key
              ? "bg-accent text-bg"
              : "border border-border bg-surface text-muted hover:text-text-3"
          }`}
        >
          {chip.label}
        </Link>
      ))}
    </>
  );
}

export function SortViewToggle({
  params,
  sortBy,
  view,
}: {
  params: SearchParams;
  sortBy: string;
  view: string;
}) {
  const cell = (active: boolean) =>
    `px-3 py-1.5 text-sm ${active ? "bg-accent text-bg" : "text-muted"}`;
  return (
    <span className="ml-auto flex items-center gap-[9px]">
      <Link
        href={buildHref(params, { sort: sortBy === "score" ? "date" : "score" })}
        className="text-sm text-muted transition hover:text-text-3"
      >
        {sortBy === "score" ? "Pertinence" : "Date"} ▾
      </Link>
      <span className="flex overflow-hidden rounded-[9px] border border-border bg-surface">
        <Link href={buildHref(params, { view: undefined })} className={cell(view === "grid")}>
          ▦
        </Link>
        <Link href={buildHref(params, { view: "list" })} className={cell(view === "list")}>
          ≡
        </Link>
      </span>
    </span>
  );
}

function FilterSelect({
  name,
  defaultValue,
  allLabel,
  options,
}: {
  name: string;
  defaultValue: string;
  allLabel: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select name={name} defaultValue={defaultValue} className={selectClass}>
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function AdvancedFilters({
  params,
  status,
  sortBy,
  view,
  minScore,
  sources,
  tags,
}: {
  params: SearchParams;
  status: string;
  sortBy: string;
  view: string;
  minScore: number;
  sources: Option[];
  tags: { id: string; label: string }[];
}) {
  return (
    <form className="mt-[10px] flex flex-wrap items-center gap-2">
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="sort" value={sortBy} />
      {view === "list" && <input type="hidden" name="view" value="list" />}
      <FilterSelect
        name="sourceId"
        defaultValue={params.sourceId ?? ""}
        allLabel="Toutes les sources"
        options={sources.map((s) => ({ value: s.id, label: s.name }))}
      />
      <FilterSelect
        name="tag"
        defaultValue={params.tag ?? ""}
        allLabel="Tous les tags"
        options={tags.map((t) => ({ value: t.label, label: t.label }))}
      />
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
  );
}

export function ArticleGrid({
  articles,
  view,
}: {
  articles: ArticleWithRelations[];
  view: string;
}) {
  if (articles.length === 0) {
    return (
      <p className="rounded-[15px] border border-border bg-surface p-6 text-sm text-muted">
        Aucun article. Ajoutez des sources RSS et rafraîchissez-les, ou ajoutez
        un article par URL ci-dessus.
      </p>
    );
  }
  return (
    <div
      className="grid gap-[15px]"
      style={{ gridTemplateColumns: view === "list" ? "1fr" : "repeat(2, minmax(0, 1fr))" }}
    >
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}
