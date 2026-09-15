"use client";

import { useState, useTransition } from "react";
import {
  generateSpeakingPromptAction,
  type SpeakingPromptResult,
} from "@/lib/actions/speaking";

export function SpeakingPromptGenerator({ conceptId }: { conceptId?: string }) {
  const [result, setResult] = useState<SpeakingPromptResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const res = await generateSpeakingPromptAction(conceptId);
      setResult(res);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {result && "error" in result && <p className="meta">{result.error}</p>}

      {result && "prompt" in result && (
        <div className="flex flex-col gap-2">
          <p className="question">{result.prompt}</p>
          {!conceptId && (
            <span className="meta">From what you know about {result.conceptName}.</span>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={isPending}
        aria-busy={isPending}
        className={result && "prompt" in result ? "btn btn-line btn-sm w-fit" : "btn btn-line w-fit"}
      >
        {isPending ? "Thinking…" : result ? "Ask me another" : "Ask me to say it out loud"}
      </button>
    </div>
  );
}
