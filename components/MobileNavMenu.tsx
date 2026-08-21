"use client";

import { useState } from "react";
import Link from "next/link";

export function MobileNavMenu({
  items,
  active,
}: {
  items: readonly { href: string; label: string }[];
  active?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 hover:bg-black/[.04] hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-white/[.08] dark:hover:text-zinc-200"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-20 border-b border-black/[.06] bg-background px-8 py-4 shadow-sm dark:border-white/[.08]">
          <ul className="flex flex-col gap-4">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={
                    active === item.label
                      ? "text-sm text-zinc-800 dark:text-zinc-100"
                      : "text-sm text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400"
                  }
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
