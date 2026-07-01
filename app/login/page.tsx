"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "@/app/lib/auth-client";
import {
  AuthField,
  AuthShell,
  FormError,
  SubmitButton,
} from "@/app/components/auth-ui";

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
    <AuthShell subtitle="Connexion à votre veille" action={handleSubmit}>
      <AuthField id="email" label="Email" type="email" autoComplete="email" />
      <AuthField
        id="password"
        label="Mot de passe"
        type="password"
        autoComplete="current-password"
      />
      <FormError error={error} />
      <SubmitButton pending={pending} idle="Se connecter" busy="Connexion…" />
      <p className="text-center text-sm text-muted">
        Pas de compte ?{" "}
        <Link href="/signup" className="font-semibold text-accent hover:underline">
          Créer un compte
        </Link>
      </p>
    </AuthShell>
  );
}
