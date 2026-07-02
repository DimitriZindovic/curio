"use client";

import { useActionState, useEffect, useRef } from "react";
import { createSource } from "@/app/lib/actions/sources";
import type { ActionState } from "@/app/lib/actions/types";

const initialState: ActionState = {};

export default function AddSourceForm() {
  const [state, formAction, pending] = useActionState(createSource, initialState);
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
          name="name"
          placeholder="Nom"
          required
          className="w-[150px] border-none bg-transparent text-sm text-text-2 outline-none placeholder:text-faint"
        />
        <input
          name="url"
          placeholder="URL du flux RSS"
          required
          className="flex-1 border-l border-border-2 bg-transparent pl-[14px] text-sm text-text-2 outline-none placeholder:text-faint"
        />
        <input
          name="category"
          placeholder="Catégorie"
          className="w-[130px] border-l border-border-2 bg-transparent pl-[14px] text-sm text-text-2 outline-none placeholder:text-faint"
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
