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
        className={
          className ??
          "text-xs text-zinc-400 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400"
        }
      >
        Delete
      </button>
    </form>
  );
}
