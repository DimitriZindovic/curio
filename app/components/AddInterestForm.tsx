"use client";

import { useActionState, useEffect, useRef } from "react";
import { addInterest } from "@/app/lib/actions/interests";
import type { ActionState } from "@/app/lib/actions/types";

const initialState: ActionState = {};

export default function AddInterestForm() {
  const [state, formAction, pending] = useActionState(
    addInterest,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <div className="space-y-1">
      <form
        ref={formRef}
        action={formAction}
        className="flex gap-[10px] rounded-[13px] border border-border bg-surface py-2 pr-2 pl-4"
      >
        <input
          name="keyword"
          placeholder="Mot-clé (ex : kubernetes)"
          required
          className="flex-1 border-none bg-transparent text-sm text-text-2 outline-none placeholder:text-faint"
        />
        <input
          name="weight"
          type="number"
          min={1}
          defaultValue={1}
          placeholder="Poids"
          className="w-[90px] border-l border-border-2 bg-transparent pl-[14px] text-sm text-text-2 outline-none placeholder:text-faint"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-[9px] bg-accent px-[18px] py-[9px] text-sm font-bold text-bg transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Ajout…" : "Ajouter"}
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
