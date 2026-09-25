"use client";

import { useState, useTransition } from "react";
import { suggestConcept } from "@/lib/actions/capture";

// Title, concept, and field for the detailed form. Leaving the title and
// tabbing on asks the model for a concept and field right away, the same
// way createSessionAction would if they were left blank at submit — so the
// suggestion is visible before you commit to it, not just applied blind.
export function SessionTitleTopicFields({
  defaultTitle = "",
  defaultTopic = "",
  defaultField = "",
}: {
  defaultTitle?: string;
  defaultTopic?: string;
  defaultField?: string;
}) {
  const [topic, setTopic] = useState(defaultTopic);
  const [field, setField] = useState(defaultField);
  const [isPending, startTransition] = useTransition();

  function handleTitleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const title = e.target.value.trim();
    if (!title || topic.trim()) return;

    startTransition(async () => {
      const suggestion = await suggestConcept(title);
      // Only fill what's still blank — typing into either field while the
      // suggestion was in flight means it's spoken for.
      setTopic((current) => (current.trim() ? current : suggestion.topic));
      if (suggestion.field) {
        setField((current) => (current.trim() ? current : suggestion.field!));
      }
    });
  }

  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="meta">What are you learning?</span>
        <input
          name="title"
          required
          autoFocus
          defaultValue={defaultTitle}
          onBlur={handleTitleBlur}
          placeholder="Attention, from scratch"
          className="field font-serif text-[22px] leading-snug"
          autoComplete="off"
        />
      </label>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="meta">Concept it belongs to</span>
          <input
            name="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Suggested if left blank"
            className="field"
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="meta">Field</span>
          <input
            name="field"
            value={field}
            onChange={(e) => setField(e.target.value)}
            placeholder="Machine learning, Baking…"
            className="field"
            autoComplete="off"
          />
        </label>
      </div>
      <p className="meta -mt-3">
        {isPending
          ? "Suggesting a concept and field from the title…"
          : "The concept is where this lands on your map; the field is the region it grows in. Both can be left for the model to suggest."}
      </p>
    </>
  );
}
