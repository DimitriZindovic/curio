"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  addManualArticle,
  type AddArticleState,
} from "@/app/lib/actions/articles";

const initialState: AddArticleState = {};

export default function AddArticleForm() {
  const [state, formAction, pending] = useActionState(
    addManualArticle,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <div className="flex flex-col items-end gap-1">
      <form
        ref={formRef}
        action={formAction}
        className="flex items-center gap-3 rounded-[13px] border border-border bg-surface py-[5px] pr-[6px] pl-[18px]"
      >
        <span className="font-mono text-[13px] text-faint">＋</span>
        <input
          name="url"
          required
          placeholder="Coller une URL d'article…"
          className="w-60 max-w-[50vw] border-none bg-transparent text-sm text-text-2 outline-none placeholder:text-faint"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-[9px] bg-accent px-[18px] py-[10px] text-sm font-bold text-bg transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Extraction…" : "Ajouter"}
        </button>
      </form>
      {state.error && (
        <p className="text-xs text-danger" role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
}
