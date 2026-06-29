"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteUser } from "@/app/lib/auth-client";

export default function DeleteAccount() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleDelete(formData: FormData) {
    setError(null);
    setPending(true);
    const { error } = await deleteUser({
      password: String(formData.get("password") ?? ""),
    });
    if (error) {
      setError(error.message ?? "Suppression impossible.");
      setPending(false);
      return;
    }
    router.push("/signup");
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-[10px] border px-4 py-2 text-sm font-medium text-danger transition hover:bg-surface-hov"
        style={{ borderColor: "var(--color-danger-bd)" }}
      >
        Supprimer mon compte
      </button>
    );
  }

  return (
    <form action={handleDelete} className="space-y-3">
      <p className="text-sm text-text-3">
        Cette action est <strong>irréversible</strong> : toutes vos sources,
        articles, tags, centres d’intérêt et digests seront définitivement
        supprimés. Saisissez votre mot de passe pour confirmer.
      </p>
      <input
        name="password"
        type="password"
        autoComplete="current-password"
        required
        placeholder="Mot de passe"
        className="w-full max-w-xs rounded-[10px] border border-border-2 bg-surface-2 px-3 py-2 text-text-2 outline-none placeholder:text-faint focus:border-accent"
      />
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-[10px] px-4 py-2 text-sm font-bold text-bg transition hover:opacity-90 disabled:opacity-60"
          style={{ background: "var(--color-danger)" }}
        >
          {pending ? "Suppression…" : "Confirmer la suppression"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-[10px] border border-border-2 px-4 py-2 text-sm font-medium text-text-3 transition hover:bg-surface-hov"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
