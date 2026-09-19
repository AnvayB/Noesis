import type { ReactNode } from "react";
import Link from "next/link";
import { MobileNavMenu } from "@/components/MobileNavMenu";
import { ThemeToggle } from "@/components/ThemeToggle";

// Three places. Now is the map and what is live; Learn is the inbox and the
// session flow; Mindscape is the map on its own. Curriculum tracks live
// inside Learn, not here.
const NAV_ITEMS = [
  { href: "/", label: "Now" },
  { href: "/learn", label: "Learn" },
  { href: "/mindscape", label: "Mindscape" },
] as const;

// Inside Learn, reachable from the phone menu too.
const LEARN_ITEMS = [
  { href: "/sessions/new", label: "Add with details" },
  { href: "/sessions", label: "History" },
  { href: "/tracks", label: "Tracks" },
] as const;

export type NavLabel = (typeof NAV_ITEMS)[number]["label"];

export function NavHeader({
  active,
  right,
}: {
  active?: NavLabel;
  right?: ReactNode;
}) {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 sm:px-10">
        <nav className="flex items-baseline gap-8">
          <Link
            href="/"
            className="font-serif text-[22px] font-light tracking-tight text-ink"
          >
            Noesis
          </Link>
          <div className="hidden items-baseline gap-6 sm:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active === item.label ? "page" : undefined}
                className={
                  active === item.label ? "nav-link nav-link-active" : "nav-link"
                }
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
        <div className="flex items-center gap-3 sm:gap-5">
          {right}
          <ThemeToggle />
          <MobileNavMenu items={NAV_ITEMS} secondary={LEARN_ITEMS} active={active} />
        </div>
      </div>
    </header>
  );
}
