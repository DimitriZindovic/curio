import Link from "next/link";
import { prisma } from "@/app/lib/prisma";
import SidebarNav from "@/app/components/SidebarNav";
import SignOutButton from "@/app/components/SignOutButton";
import { requireUser } from "@/app/lib/session";

function relativeTime(date: Date | null): { label: string; freshness: number } {
  if (!date) return { label: "jamais", freshness: 0 };
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  // fraîcheur : 100% si à l'instant, décroît sur 6 h
  const freshness = Math.max(4, Math.round(100 - (minutes / 360) * 100));
  if (minutes < 1) return { label: "à l'instant", freshness: 100 };
  if (minutes < 60) return { label: `il y a ${minutes} min`, freshness };
  const hours = Math.round(minutes / 60);
  if (hours < 24) return { label: `il y a ${hours} h`, freshness };
  const days = Math.round(hours / 24);
  return { label: `il y a ${days} j`, freshness: 4 };
}

function SidebarBrand() {
  return (
    <div className="mb-[30px] flex items-center gap-[11px] px-2">
      <div
        className="flex size-8 items-center justify-center rounded-[10px] text-[17px] font-extrabold text-bg"
        style={{ background: "var(--color-accent)" }}
      >
        C
      </div>
      <span className="text-[19px] font-extrabold tracking-[-0.02em] text-text">
        Curio
      </span>
    </div>
  );
}

function RefreshWidget({ label, freshness }: { label: string; freshness: number }) {
  return (
    <div className="mt-6 rounded-[13px] border border-border bg-surface-2 p-[15px]">
      <div className="mb-[9px] flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-faint">
          Dernier refresh
        </span>
        <span
          className="size-[7px] rounded-full"
          style={{ background: "var(--color-accent)", boxShadow: "0 0 8px var(--color-accent)" }}
        />
      </div>
      <div className="mb-[10px] text-sm font-semibold text-text-2">{label}</div>
      <div className="h-[5px] overflow-hidden rounded-[3px] bg-border">
        <div className="h-full bg-accent" style={{ width: `${freshness}%` }} />
      </div>
    </div>
  );
}

function ProfileWidget({
  initial,
  name,
  email,
}: {
  initial: string;
  name: string;
  email: string;
}) {
  return (
    <div className="mt-auto flex items-center gap-[11px] rounded-[11px] bg-surface-2 p-[10px]">
      <Link href="/account" className="flex min-w-0 flex-1 items-center gap-[11px]">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-accent"
          style={{ background: "var(--color-accent-soft)" }}
        >
          {initial}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold text-text-2">
            {name || "Compte"}
          </span>
          <span className="block truncate text-[11px] text-faint">{email}</span>
        </span>
      </Link>
      <SignOutButton />
    </div>
  );
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const latest = await prisma.source.findFirst({
    where: { userId: user.id, lastFetchedAt: { not: null } },
    orderBy: { lastFetchedAt: "desc" },
    select: { lastFetchedAt: true },
  });
  const refresh = relativeTime(latest?.lastFetchedAt ?? null);
  const initial = (user.name?.[0] ?? user.email[0] ?? "?").toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-sidebar px-4 py-6">
        <SidebarBrand />
        <SidebarNav />
        <RefreshWidget label={refresh.label} freshness={refresh.freshness} />
        <ProfileWidget initial={initial} name={user.name ?? ""} email={user.email} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">{children}</div>
    </div>
  );
}
