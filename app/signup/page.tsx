"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp } from "@/app/lib/auth-client";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    const { error } = await signUp.email({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
    if (error) {
      setError(error.message ?? "Impossible de créer le compte.");
      setPending(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-6">
      <form
        action={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-[16px] border border-border bg-surface p-8"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex size-9 items-center justify-center rounded-[10px] text-[18px] font-extrabold text-bg"
            style={{ background: "var(--color-accent)" }}
          >
            C
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-[-0.02em] text-text">
              Curio
            </h1>
            <p className="text-xs text-muted">Créer votre compte</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium text-text-3">
            Nom
          </label>
          <input
            id="name"
            name="name"
            required
            className="w-full rounded-[10px] border border-border-2 bg-surface-2 px-3 py-2 text-text-2 outline-none placeholder:text-faint focus:border-accent"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-text-3">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-[10px] border border-border-2 bg-surface-2 px-3 py-2 text-text-2 outline-none placeholder:text-faint focus:border-accent"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-text-3">
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="w-full rounded-[10px] border border-border-2 bg-surface-2 px-3 py-2 text-text-2 outline-none placeholder:text-faint focus:border-accent"
          />
          <p className="text-xs text-faint">8 caractères minimum.</p>
        </div>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-[10px] bg-accent px-4 py-2.5 font-bold text-bg transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Création…" : "Créer le compte"}
        </button>

        <p className="text-center text-sm text-muted">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-semibold text-accent hover:underline">
            Se connecter
          </Link>
        </p>
      </form>
    </main>
  );
}
