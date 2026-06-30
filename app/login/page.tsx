"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "@/app/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    const { error } = await signIn.email({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
    if (error) {
      setError(error.message ?? "Identifiants incorrects.");
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
            <p className="text-xs text-muted">Connexion à votre veille</p>
          </div>
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
            autoComplete="current-password"
            required
            className="w-full rounded-[10px] border border-border-2 bg-surface-2 px-3 py-2 text-text-2 outline-none placeholder:text-faint focus:border-accent"
          />
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
          {pending ? "Connexion…" : "Se connecter"}
        </button>

        <p className="text-center text-sm text-muted">
          Pas de compte ?{" "}
          <Link href="/signup" className="font-semibold text-accent hover:underline">
            Créer un compte
          </Link>
        </p>
      </form>
    </main>
  );
}
