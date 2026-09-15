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
      className="field text-sm"
    >
      {options.map((option) => (
        <option key={option.href} value={option.href}>
          {option.label} ({option.count})
        </option>
      ))}
    </select>
  );
}
