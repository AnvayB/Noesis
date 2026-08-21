"use client";

import { useState, useTransition } from "react";
import {
  generateSpeakingPromptAction,
  type SpeakingPromptResult,
} from "@/lib/actions/speaking";

export function SpeakingPromptGenerator() {
  const [result, setResult] = useState<SpeakingPromptResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const res = await generateSpeakingPromptAction();
      setResult(res);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isPending}
        className="w-fit rounded-full bg-black/[.06] px-4 py-2 text-sm text-zinc-700 disabled:opacity-60 dark:bg-white/[.08] dark:text-zinc-200"
      >
        {isPending ? "Thinking..." : result ? "Another one" : "Generate a prompt"}
      </button>

      {result && "error" in result && (
        <p className="text-sm text-zinc-400 dark:text-zinc-600">{result.error}</p>
      )}

      {result && "prompt" in result && (
        <div className="rounded-xl bg-black/[.03] p-4 text-sm dark:bg-white/[.06]">
          <p className="text-zinc-700 dark:text-zinc-200">{result.prompt}</p>
          <span className="text-xs text-zinc-400 dark:text-zinc-600">
            from {result.conceptName}
          </span>
        </div>
      )}
    </div>
  );
}
