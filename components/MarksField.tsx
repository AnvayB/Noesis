"use client";

import { useEffect, useRef, useState } from "react";
import { saveMarksAction } from "@/lib/actions/explainBack";

/**
 * Marks made while watching or reading: a phrase, a question, a thing to
 * come back to. Saved as you go, a second after you stop typing, so leaving
 * the page loses nothing. They are given to the model with the explanation.
 */
export function MarksField({ sessionId, initial }: { sessionId: string; initial: string }) {
  const [text, setText] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const last = useRef(initial);

  useEffect(() => {
    if (text === last.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setState("saving");
      try {
        await saveMarksAction(sessionId, text);
        last.current = text;
        setState("saved");
      } catch {
        setState("idle");
      }
    }, 900);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text, sessionId]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor="marks" className="meta">
          Marks as you go
        </label>
        <span className="meta" aria-live="polite">
          {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : ""}
        </span>
      </div>
      <textarea
        id="marks"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="A phrase that struck you. A question. Something to come back to."
        className="field font-serif text-[17px] leading-relaxed"
      />
    </div>
  );
}
