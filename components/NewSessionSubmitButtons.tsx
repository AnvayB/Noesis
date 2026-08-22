"use client";

import { useRef } from "react";

// Prevents duplicate learning sessions from a double-click (or double-tap) on
// either submit button: the first click disables both buttons synchronously
// via a ref (not React state, which wouldn't re-render fast enough to catch
// a second click that lands before the next paint), so a rapid second click
// hits an already-disabled button and never fires a second form submission.
export function NewSessionSubmitButtons() {
  const lockedRef = useRef(false);
  const backlogRef = useRef<HTMLButtonElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);

  const lock = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (lockedRef.current) {
      e.preventDefault();
      return;
    }
    lockedRef.current = true;
    if (backlogRef.current) backlogRef.current.disabled = true;
    if (startRef.current) startRef.current.disabled = true;
  };

  return (
    <>
      <button
        ref={backlogRef}
        type="submit"
        name="status"
        value="pending"
        onClick={lock}
        className="cursor-pointer rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Add to backlog
      </button>
      <button
        ref={startRef}
        type="submit"
        name="status"
        value="started"
        onClick={lock}
        className="cursor-pointer rounded-full bg-black/[.06] px-5 py-2 text-sm font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/[.08] dark:text-zinc-200"
      >
        Start now
      </button>
    </>
  );
}
