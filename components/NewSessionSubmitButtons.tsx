"use client";

import { useRef } from "react";

// Prevents duplicate learning sessions from a double-click (or double-tap) on
// either submit button: the first click disables both buttons synchronously
// via a ref (not React state, which wouldn't re-render fast enough to catch
// a second click that lands before the next paint), so a rapid second click
// hits an already-disabled button and never fires a second form submission.
//
// Starting is the filled button. Keeping for later is the quiet one: the
// product exists to displace bookmarking, so the hierarchy must not
// recommend it.
export function NewSessionSubmitButtons() {
  const lockedRef = useRef(false);
  const keepRef = useRef<HTMLButtonElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);

  const lock = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (lockedRef.current) {
      e.preventDefault();
      return;
    }
    lockedRef.current = true;
    if (keepRef.current) keepRef.current.disabled = true;
    if (startRef.current) startRef.current.disabled = true;
  };

  return (
    <>
      <button
        ref={startRef}
        type="submit"
        name="status"
        value="started"
        onClick={lock}
        className="btn btn-ink"
      >
        Start now
      </button>
      <button
        ref={keepRef}
        type="submit"
        name="status"
        value="pending"
        onClick={lock}
        className="btn btn-line"
      >
        Keep for later
      </button>
    </>
  );
}
