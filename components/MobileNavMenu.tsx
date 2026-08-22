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
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      <div
        aria-hidden={!open}
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-20 bg-black/30 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        className={`fixed inset-y-0 right-0 z-30 flex w-64 max-w-[80vw] flex-col gap-1 border-l border-black/[.06] bg-background px-6 py-6 shadow-lg transition-transform duration-200 dark:border-white/[.08] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
            Menu
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
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
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
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
    </div>
  );
}
