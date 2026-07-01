"use client";

import { useState, useTransition } from "react";
import {
  deleteSource,
  refreshOneSource,
  toggleSourceActive,
  updateSource,
} from "@/app/lib/actions/sources";

const emptyState = {};

type Props = {
  id: string;
  name: string;
  url: string;
  category: string | null;
  active: boolean;
  articleCount: number;
  lastFetchedLabel: string;
};

export default function SourceRow({
  id,
  name,
  url,
  category,
  active,
  articleCount,
  lastFetchedLabel,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function save(formData: FormData) {
    const result = await updateSource(emptyState, formData);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    setEditing(false);
  }

  function handleSave(formData: FormData) {
    startTransition(() => save(formData));
  }

  const iconBtn =
    "flex size-8 items-center justify-center rounded-[9px] border border-border-2 text-[13px] text-muted transition hover:text-text-2";

  return (
    <div className="rounded-[15px] border border-border bg-surface px-[18px] py-4">
      <div className="flex items-center gap-4">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-[11px] text-[17px]"
          style={
            active
              ? { background: "var(--color-accent-soft)", color: "var(--color-accent)" }
              : { background: "var(--color-border)", color: "var(--color-faint)" }
          }
        >
          ⦿
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-[9px]">
            <span className="text-[15px] font-bold text-text">{name}</span>
            {category && (
              <span className="rounded-[6px] bg-border px-2 py-0.5 text-[11px] font-semibold text-muted">
                {category}
              </span>
            )}
            {active ? (
              <span
                className="rounded-[6px] px-2 py-0.5 text-[11px] font-semibold text-accent"
                style={{ background: "var(--color-accent-soft)" }}
              >
                active
              </span>
            ) : (
              <span
                className="rounded-[6px] px-2 py-0.5 text-[11px] font-semibold"
                style={{
                  color: "var(--color-warn)",
                  background: "color-mix(in oklch, var(--color-warn) 16%, transparent)",
                }}
              >
                inactive
              </span>
            )}
          </div>
          <div className="mt-1 truncate font-mono text-[12px] text-faint">{url}</div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[15px] font-bold text-accent">{articleCount}</div>
          <div className="text-[11px] text-faint">articles</div>
        </div>

        <div className="w-[120px] shrink-0 text-[12px] text-muted">
          refresh : {lastFetchedLabel}
        </div>

        <div className="flex shrink-0 gap-[7px]">
          <form action={refreshOneSource}>
            <input type="hidden" name="id" value={id} />
            <button type="submit" className={iconBtn} aria-label="Rafraîchir">
              ↻
            </button>
          </form>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className={iconBtn}
            aria-label="Éditer"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={() => {
              const fd = new FormData();
              fd.set("id", id);
              startTransition(() => toggleSourceActive(fd));
            }}
            className={iconBtn}
            aria-label={active ? "Désactiver" : "Activer"}
            title={active ? "Désactiver" : "Activer"}
          >
            {active ? "⏸" : "▶"}
          </button>
          <form action={deleteSource}>
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              aria-label="Supprimer"
              className="flex size-8 items-center justify-center rounded-[9px] border text-[13px] text-danger transition hover:bg-surface-hov"
              style={{ borderColor: "var(--color-danger-bd)" }}
            >
              ✕
            </button>
          </form>
        </div>
      </div>

      {editing && (
        <form
          action={handleSave}
          className="mt-3 space-y-2 rounded-[11px] border border-border bg-surface-2 p-3"
        >
          <input type="hidden" name="id" value={id} />
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              name="name"
              defaultValue={name}
              placeholder="Nom"
              required
              className="rounded-[8px] border border-border-2 bg-surface px-3 py-2 text-sm text-text-2 outline-none placeholder:text-faint focus:border-accent"
            />
            <input
              name="url"
              defaultValue={url}
              placeholder="URL du flux"
              required
              className="rounded-[8px] border border-border-2 bg-surface px-3 py-2 text-sm text-text-2 outline-none placeholder:text-faint focus:border-accent sm:col-span-2"
            />
            <input
              name="category"
              defaultValue={category ?? ""}
              placeholder="Catégorie (optionnel)"
              className="rounded-[8px] border border-border-2 bg-surface px-3 py-2 text-sm text-text-2 outline-none placeholder:text-faint focus:border-accent"
            />
          </div>
          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-[8px] bg-accent px-3 py-1.5 text-xs font-bold text-bg transition hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-[8px] border border-border-2 px-3 py-1.5 text-xs font-medium text-text-3 transition hover:bg-surface-hov"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
