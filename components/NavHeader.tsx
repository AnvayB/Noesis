import type { ReactNode } from "react";
import Link from "next/link";
import { BrainLogo } from "@/components/BrainLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/sessions", label: "Learn" },
  { href: "/practice", label: "Practice" },
  { href: "/mindscape", label: "Mindscape" },
  { href: "/learn-noesis", label: "Learn Noesis" },
] as const;

// No "Projects" item, since that feature isn't built (Architect For, not
// Build Now). Plan G.1: don't nav to pages that don't exist yet — every item
// above corresponds to a real route.
export function NavHeader({
  active,
  right,
}: {
  active?: (typeof NAV_ITEMS)[number]["label"];
  right?: ReactNode;
}) {
  return (
    <header className="flex items-center justify-between border-b border-black/[.06] px-8 py-5 dark:border-white/[.08]">
      <nav className="flex items-center gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium tracking-wide text-zinc-800 dark:text-zinc-100"
        >
          <BrainLogo className="h-5 w-5" />
          Noesis
        </Link>
        <div className="hidden items-center gap-4 sm:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                active === item.label
                  ? "text-sm text-zinc-800 dark:text-zinc-100"
                  : "text-sm text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400"
              }
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        {right}
      </div>
    </header>
  );
}
