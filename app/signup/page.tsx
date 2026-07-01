"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp } from "@/app/lib/auth-client";
import {
  AuthField,
  AuthShell,
  FormError,
  SubmitButton,
} from "@/app/components/auth-ui";

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
    <AuthShell subtitle="Créer votre compte" action={handleSubmit}>
      <AuthField id="name" label="Nom" />
      <AuthField id="email" label="Email" type="email" autoComplete="email" />
      <AuthField
        id="password"
        label="Mot de passe"
        type="password"
        autoComplete="new-password"
        minLength={8}
        hint="8 caractères minimum."
      />
      <FormError error={error} />
      <SubmitButton pending={pending} idle="Créer le compte" busy="Création…" />
      <p className="text-center text-sm text-muted">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-semibold text-accent hover:underline">
          Se connecter
        </Link>
      </p>
    </AuthShell>
  );
}
