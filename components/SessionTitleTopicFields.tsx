"use client";

import { useState, useTransition } from "react";
import { suggestTopicAction } from "@/lib/actions/topic";

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
      <label className="flex flex-col gap-1">
        <span className="meta">What are you learning?</span>
        <input
          name="title"
          required
          placeholder="Attention, from scratch"
          onBlur={handleTitleBlur}
          className="field font-serif text-[22px] leading-snug"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="meta">Concept it belongs to</span>
        <input
          name="topic"
          required
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Attention"
          className="field"
        />
        <span className="meta" aria-live="polite">
          {isPending
            ? "Suggesting one from the title…"
            : "Where this lands on your map. Suggested from the title; change it if it's wrong."}
        </span>
      </label>
    </>
  );
}
