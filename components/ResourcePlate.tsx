import type { ResourceType } from "@/lib/db/schema";

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

function youtubeId(url: string): string | null {
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
 * A resource is a plate: the kind of thing it is, its title, and the way to
 * open it. A YouTube resource embeds the video so watching and explaining
 * happen on one screen. No border; the space around it sets it off.
 */
export function ResourcePlate({
  type,
  url,
  title,
  durationMinutes,
}: {
  type: ResourceType | null;
  url: string | null;
  title: string | null;
  durationMinutes: number | null;
}) {
  if (!url && !title) return null;
  const kind = type ? TYPE_WORD[type] : "Source";
  const videoId = url && (type === "youtube" || !type) ? youtubeId(url) : null;
  const shownTitle = title ?? (url ? hostOf(url) : kind);
  const parts = [kind];
  if (durationMinutes != null) parts.push(`${durationMinutes} minutes`);
  if (url && !videoId) parts.push(hostOf(url));

  return (
    <figure className="flex flex-col gap-3">
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
        <span className="meta">{parts.join(", ")}</span>
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
    </figure>
  );
}
