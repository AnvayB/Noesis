"use client";

import { useFormStatus } from "react-dom";
import { captureAction } from "@/lib/actions/capture";

function Buttons({ compact }: { compact: boolean }) {
  const { pending } = useFormStatus();
  const size = compact ? "btn-sm" : "";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="submit"
        name="intent"
        value="start"
        disabled={pending}
        aria-busy={pending}
        className={`btn btn-ink ${size}`}
      >
        {pending ? "One moment…" : "Start now"}
      </button>
      <button
        type="submit"
        name="intent"
        value="keep"
        disabled={pending}
        className={`btn btn-line ${size}`}
      >
        Keep for later
      </button>
    </div>
  );
}

/**
 * The one field. Paste a link to something to learn from, or write a
 * question you have. Start opens a session on it; Keep puts it in the inbox.
 */
export function CaptureForm({
  returnTo = "/",
  compact = false,
  autoFocus = false,
  defaultValue = "",
  hint = true,
}: {
  returnTo?: string;
  compact?: boolean;
  autoFocus?: boolean;
  defaultValue?: string;
  hint?: boolean;
}) {
  return (
    <form action={captureAction} className="flex flex-col gap-4">
      <input type="hidden" name="returnTo" value={returnTo} />
      <label className="flex flex-col gap-1">
        <span className="meta">Paste a link, or write a question</span>
        <input
          name="text"
          required
          autoFocus={autoFocus}
          defaultValue={defaultValue}
          placeholder="https://youtube.com/watch?v=…   or   Why does attention need a softmax?"
          className={compact ? "field" : "field font-serif text-[21px] leading-snug"}
          autoComplete="off"
        />
      </label>
      <Buttons compact={compact} />
      {hint && (
        <p className="meta">
          A link becomes something to learn; the title is read for you. A question waits until
          you are ready for it.
        </p>
      )}
    </form>
  );
}
