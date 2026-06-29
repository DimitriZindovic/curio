"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Articles", match: (p: string) => p === "/" || p.startsWith("/articles") },
  { href: "/sources", label: "Sources", match: (p: string) => p.startsWith("/sources") },
  { href: "/settings", label: "Pertinence", match: (p: string) => p.startsWith("/settings") },
  { href: "/digests", label: "Digests", match: (p: string) => p.startsWith("/digests") },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-[11px] px-3 py-[11px] text-sm transition ${
              active
                ? "bg-accent-soft font-semibold text-accent"
                : "font-medium text-muted hover:bg-surface-2 hover:text-text-3"
            }`}
          >
            <span
              className="size-4 rounded-[5px]"
              style={
                active
                  ? { background: "var(--color-accent)" }
                  : { border: "2px solid #3a414e" }
              }
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
