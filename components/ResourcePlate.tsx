import type { ResourceType } from "@/lib/db/schema";
import { ArticleReader } from "@/components/ArticleReader";

const TYPE_WORD: Record<ResourceType, string> = {
  youtube: "Video",
  article: "Article",
  podcast: "Podcast",
  webinar: "Talk",
  notebooklm: "Notebook",
  chatgpt: "Conversation",
  paper: "Paper",
  doc: "Documentation",
  book: "Book",
  website: "Website",
  other: "Source",
};

export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    if (u.hostname.endsWith("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(embed|shorts|live)\/([^/]+)/);
      if (m) return m[2];
    }
  } catch {
    return null;
  }
  return null;
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * A resource is a plate: the kind of thing it is, its title, who made it,
 * and the way to take it in. A video embeds so watching and explaining
 * happen on one screen; an article's text is read here, in the reading
 * face. No border; the space around it sets it off.
 */
export function ResourcePlate({
  type,
  url,
  title,
  byline,
  excerpt,
  wordCount,
  durationMinutes,
  reader = true,
}: {
  type: ResourceType | null;
  url: string | null;
  title: string | null;
  byline?: string | null;
  excerpt?: string | null;
  wordCount?: number | null;
  durationMinutes: number | null;
  /** Show the article text when there is one. */
  reader?: boolean;
}) {
  if (!url && !title) return null;
  const kind = type ? TYPE_WORD[type] : "Source";
  const videoId = url && (type === "youtube" || !type) ? youtubeId(url) : null;
  const shownTitle = title ?? (url ? hostOf(url) : kind);
  const parts = [kind];
  if (byline) parts.push(byline);
  else if (url && !videoId) parts.push(hostOf(url));
  if (durationMinutes != null) parts.push(`${durationMinutes} minutes`);
  else if (wordCount) parts.push(`about ${Math.max(1, Math.round(wordCount / 230))} minutes to read`);

  return (
    <figure className="flex flex-col gap-4">
      {videoId && (
        <div className="aspect-video w-full overflow-hidden rounded-sm bg-ink/5">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}`}
            title={shownTitle}
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            className="h-full w-full"
          />
        </div>
      )}
      <figcaption className="flex flex-col gap-1">
        <span className="meta">{parts.join(" · ")}</span>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="link font-serif text-[19px] leading-snug"
          >
            {shownTitle}
          </a>
        ) : (
          <span className="font-serif text-[19px] leading-snug">{shownTitle}</span>
        )}
      </figcaption>
      {reader && excerpt && !videoId && (
        <div className="border-t border-rule pt-6">
          <ArticleReader text={excerpt} url={url} />
        </div>
      )}
    </figure>
  );
}
