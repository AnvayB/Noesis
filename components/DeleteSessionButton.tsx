"use client";

import { deleteSessionAction } from "@/lib/actions/sessions";

export function DeleteSessionButton({
  sessionId,
  sessionTitle,
  className,
}: {
  sessionId: string;
  sessionTitle: string;
  className?: string;
}) {
  return (
    <form
      action={deleteSessionAction}
      onSubmit={(e) => {
        if (!window.confirm(`Delete "${sessionTitle}"? This can't be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="sessionId" value={sessionId} />
      <button
        type="submit"
        aria-label={`Delete ${sessionTitle}`}
        title="Delete"
        className={
          className ??
          "flex h-6 w-6 items-center justify-center text-zinc-400 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400"
        }
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
          <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m3 0-.87 12.14A2 2 0 0 1 15.14 21H8.86a2 2 0 0 1-1.99-1.86L6 7m4 4.5v5m4-5v5" />
        </svg>
      </button>
    </form>
  );
}
