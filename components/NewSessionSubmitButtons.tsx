"use client";

import { useFormStatus } from "react-dom";

// Disabling on `pending` (rather than an imperative ref set on click, as
// this used to do) is what a double-click needs — React 19 already ignores
// a second submission of the same form while the first is pending — and
// it's also what a *failed* submission needs: `pending` drops back to
// false whether the action redirects or throws, so a genuine error (a slow
// model call, a network hiccup) leaves the form retryable instead of
// stuck with both buttons dimmed forever and no way to tell why.
//
// Starting is the filled button. Keeping for later is the quiet one: the
// product exists to displace bookmarking, so the hierarchy must not
// recommend it.
export function NewSessionSubmitButtons() {
  const { pending } = useFormStatus();

  return (
    <>
      <button
        type="submit"
        name="status"
        value="started"
        disabled={pending}
        aria-busy={pending}
        className="btn btn-ink"
      >
        {pending ? "One moment…" : "Start now"}
      </button>
      <button
        type="submit"
        name="status"
        value="pending"
        disabled={pending}
        className="btn btn-line"
      >
        Keep for later
      </button>
    </>
  );
}
