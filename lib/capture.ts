import type { ResourceType } from "@/lib/db/schema";

// One field, everywhere: paste a link or write a question. This module
// decides which it was and, for a link, works out what it points at so the
// user never has to type a title.

const URL_RE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s]*)?$/i;

export function asUrl(text: string): string | null {
  const t = text.trim();
  if (!t || /\s/.test(t)) return null;
  if (!URL_RE.test(t)) return null;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function guessResourceType(url: string): ResourceType {
  const host = hostOf(url);
  if (host === "youtu.be" || host.endsWith("youtube.com")) return "youtube";
  if (host === "arxiv.org" || host.endsWith(".arxiv.org")) return "paper";
  if (host.includes("podcasts.apple.com") || host.includes("open.spotify.com")) return "podcast";
  if (host.includes("chatgpt.com") || host.includes("chat.openai.com")) return "chatgpt";
  if (host.includes("notebooklm.google")) return "notebooklm";
  if (host.endsWith("docs.google.com") || host.includes("readthedocs") || host.startsWith("docs.")) return "doc";
  return "article";
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .trim();
}

async function fetchWithTimeout(url: string, ms: number, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: "follow" });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The title of whatever the link points at, or null if it can't be read in
 * a few seconds. YouTube is asked through oEmbed, which is fast and needs no
 * key; everything else is read from the page's own title tags.
 */
export async function fetchTitle(url: string): Promise<string | null> {
  try {
    if (guessResourceType(url) === "youtube") {
      const res = await fetchWithTimeout(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
        5000,
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { title?: string };
      return data.title?.trim() || null;
    }

    const res = await fetchWithTimeout(url, 6000, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 (compatible; Noesis/1.0; personal learning app)",
      },
    });
    if (!res.ok) return null;
    const ctype = res.headers.get("content-type") ?? "";
    if (!ctype.includes("html")) return null;
    const reader = res.body?.getReader();
    if (!reader) return null;
    const decoder = new TextDecoder();
    let html = "";
    while (html.length < 250_000) {
      const { value, done } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      if (/<\/head>/i.test(html)) break;
    }
    reader.cancel().catch(() => {});

    const og =
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
    if (og?.[1]) return decodeEntities(og[1]);
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (title?.[1]) return decodeEntities(title[1].replace(/\s+/g, " "));
    return null;
  } catch {
    return null;
  }
}

const TRACKING_PARAMS = /^(utm_|fbclid$|gclid$|si$|feature$|igshid$)/i;

/**
 * A comparison key for "is this the same link", ignoring protocol, `www.`,
 * a trailing slash, tracking params, and param order — so a re-pasted link
 * that differs only in those ways still reads as a duplicate.
 */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    const path = u.pathname.replace(/\/+$/, "");
    const params = new URLSearchParams(u.search);
    for (const key of [...params.keys()]) {
      if (TRACKING_PARAMS.test(key)) params.delete(key);
    }
    params.sort();
    const query = params.toString();
    return `${host}${path}${query ? `?${query}` : ""}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

/** A comparison key for "is this the same text", ignoring case and
 * incidental whitespace differences. */
export function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Monday of the week containing `date`, as YYYY-MM-DD. */
export function weekStartOf(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}
