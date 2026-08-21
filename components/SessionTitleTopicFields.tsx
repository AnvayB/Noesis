"use client";

import { useState, useTransition } from "react";
import { suggestTopicAction } from "@/lib/actions/topic";

const inputClassName =
  "rounded-lg border border-black/[.08] bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-zinc-400 dark:border-white/[.1] dark:bg-zinc-950 dark:text-zinc-100";

export function SessionTitleTopicFields({
  defaultTopic,
}: {
  defaultTopic: string;
}) {
  const [topic, setTopic] = useState(defaultTopic);
  const [isPending, startTransition] = useTransition();

  function handleTitleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const title = e.target.value.trim();
    if (!title || topic.trim()) return;

    startTransition(async () => {
      const result = await suggestTopicAction(title);
      if ("topic" in result) setTopic(result.topic);
    });
  }

  return (
    <>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Title</span>
        <input
          name="title"
          required
          placeholder="e.g. Implementing attention from scratch"
          onBlur={handleTitleBlur}
          className={inputClassName}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Topic</span>
        <input
          name="topic"
          required
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Attention"
          className={inputClassName}
        />
        <span className="text-xs text-zinc-400 dark:text-zinc-600">
          {isPending
            ? "Suggesting a topic from the title…"
            : "Links this session to a concept in your knowledge landscape. Auto-filled from the title — edit if it's wrong."}
        </span>
      </label>
    </>
  );
}
