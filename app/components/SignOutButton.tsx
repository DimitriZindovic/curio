"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/app/lib/auth-client";

export default function SignOutButton({
  className,
}: {
  className?: string;
}) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={className ?? "text-[11px] text-faint transition hover:text-text-3"}
    >
      Déconnexion
    </button>
  );
}
