"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "noesis-theme";

function applyTheme(theme: Theme) {
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

const NEXT_THEME: Record<Theme, Theme> = {
  light: "dark",
  dark: "system",
  system: "light",
};

const ICON: Record<Theme, React.ReactNode> = {
  light: (
    <path d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.36-6.36-1.42 1.42M7.05 16.95l-1.42 1.42m0-12.74 1.42 1.42m9.9 9.9 1.42 1.42M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
  ),
  dark: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />,
  system: (
    <>
      <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4h15A1.5 1.5 0 0 1 21 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 14.5v-9Z" />
      <path d="M9 20h6M12 16v4" />
    </>
  ),
};

const LABEL: Record<Theme, string> = {
  light: "Light theme",
  dark: "Dark theme",
  system: "System theme",
};

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Gates the icon render until after hydration, since the resolved
    // theme can only be known client-side — a one-time setState on mount
    // is the correct pattern here, not an anti-pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, mounted]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (theme === "system") applyTheme("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  return (
    <button
      type="button"
      onClick={() => setTheme(NEXT_THEME[theme])}
      title={mounted ? LABEL[theme] : "Theme"}
      aria-label={mounted ? `Theme: ${LABEL[theme]}. Click to change.` : "Theme"}
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
        {mounted ? ICON[theme] : null}
      </svg>
    </button>
  );
}
