"use client";

import { useRouter } from "next/navigation";

export function FilterSelect({
  value,
  options,
}: {
  value: string;
  options: { href: string; label: string; count: number }[];
}) {
  const router = useRouter();

  return (
    <select
      value={value}
      onChange={(e) => router.push(e.target.value)}
      className="w-full rounded-lg border border-black/[.08] bg-white px-2.5 py-1.5 text-xs text-zinc-700 outline-none focus:border-zinc-400 dark:border-white/[.1] dark:bg-zinc-950 dark:text-zinc-200"
    >
      {options.map((option) => (
        <option key={option.href} value={option.href}>
          {option.label} ({option.count})
        </option>
      ))}
    </select>
  );
}
