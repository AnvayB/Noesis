"use client";

import { useState } from "react";

/**
 * The reading surface for an article: its extracted text in the reading
 * face, with the original a click away. Long pieces open folded so the
 * page is not a wall; the fold remembers nothing, on purpose.
 */
export function ArticleReader({ text, url }: { text: string; url: string | null }) {
  const blocks = text.split(/\n\n+/).filter(Boolean);
  const long = text.length > 4200;
  const [open, setOpen] = useState(!long);
  const shown = open ? blocks : blocks.slice(0, 5);

  return (
    <div className="flex flex-col gap-5">
      <div className="reading flex flex-col gap-5">
        {shown.map((b, i) => {
          if (b.startsWith("## ")) return <h3 key={i} className="title mt-3 text-[23px]">{b.slice(3)}</h3>;
          if (b.startsWith("> ")) return <blockquote key={i} className="border-l border-rule-strong pl-5 text-ink-soft">{b.slice(2)}</blockquote>;
          if (b.startsWith("• ")) return <p key={i} className="pl-5 -indent-4">{b}</p>;
          return <p key={i}>{b}</p>;
        })}
      </div>
      {long && (
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => setOpen((o) => !o)} className="btn btn-line btn-sm">
            {open ? "Fold it up" : "Read the rest here"}
          </button>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="link link-soft text-sm">
              Open the original
            </a>
          )}
        </div>
      )}
    </div>
  );
}
