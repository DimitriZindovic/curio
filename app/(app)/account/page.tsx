import { requireUser } from "@/app/lib/session";
import DeleteAccount from "@/app/components/DeleteAccount";
import SignOutButton from "@/app/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto w-full max-w-[640px] px-[34px] pt-[26px] pb-[60px]">
      <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-text">
        Mon compte
      </h1>

      <section className="mt-6 space-y-3 rounded-[16px] border border-border bg-surface p-[22px]">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-faint">
            Nom
          </div>
          <div className="text-[15px] text-text-2">{user.name}</div>
        </div>
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-faint">
            Email
          </div>
          <div className="text-[15px] text-text-2">{user.email}</div>
        </div>
        <div className="pt-1">
          <SignOutButton className="rounded-[10px] border border-border-2 px-4 py-2 text-sm font-medium text-text-3 transition hover:bg-surface-hov" />
        </div>
      </section>

      <section className="mt-[15px] space-y-3 rounded-[16px] border p-[22px]" style={{ borderColor: "var(--color-danger-bd)" }}>
        <h2 className="text-[15px] font-bold text-danger">Zone de danger</h2>
        <DeleteAccount />
      </section>
    </div>
  );
}
