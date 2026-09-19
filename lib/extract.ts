/**
 * Reads the body of an article out of its HTML so a session can present the
 * text and the analysis can be grounded in it. No dependency: scripts,
 * styles, and chrome are stripped, then the element that holds the most
 * paragraph text wins. Good enough for most articles and blog posts; when
 * it fails the session simply shows the link instead.
 */

export interface ExtractedArticle {
  title: string | null;
  byline: string | null;
  siteName: string | null;
  /** Plain-text blocks separated by blank lines. Headings are prefixed "## ". */
  text: string;
  wordCount: number;
}

const MAX_CHARS = 30_000;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function meta(html: string, key: string): string | null {
  const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`, "i");
  const m = html.match(re1) ?? html.match(re2);
  return m?.[1] ? decodeEntities(m[1]).trim() : null;
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/** Blocks in document order from a fragment of HTML. */
function blocksOf(fragment: string): string[] {
  const out: string[] = [];
  const re = /<(h[1-4]|p|li|blockquote|pre|figcaption)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fragment))) {
    const tag = m[1].toLowerCase();
    const inner = m[2];
    // Skip blocks that are really containers for more blocks.
    if (/<(p|li|h[1-4])\b/i.test(inner) && tag !== "blockquote") continue;
    const text = tag === "pre" ? decodeEntities(inner.replace(/<[^>]+>/g, "")).trim() : stripTags(inner);
    if (!text) continue;
    if (tag.startsWith("h")) out.push(`## ${text}`);
    else if (tag === "li") out.push(`• ${text}`);
    else if (tag === "blockquote") out.push(`> ${text}`);
    else out.push(text);
  }
  return out;
}

function paragraphChars(fragment: string): number {
  let n = 0;
  const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fragment))) n += stripTags(m[1]).length;
  return n;
}

export function extractArticle(html: string): ExtractedArticle {
  const title = meta(html, "og:title") ?? (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ? stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)![1]) : null);
  const byline = meta(html, "author") ?? meta(html, "article:author") ?? meta(html, "twitter:creator");
  const siteName = meta(html, "og:site_name");

  let body = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|noscript|svg|iframe|form|nav|header|footer|aside|button)\b[\s\S]*?<\/\1>/gi, " ");

  // Prefer an explicit article container; otherwise the densest section.
  let best: string | null = null;
  const articleMatch = body.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch && paragraphChars(articleMatch[1]) > 600) best = articleMatch[1];
  if (!best) {
    const mainMatch = body.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
    if (mainMatch && paragraphChars(mainMatch[1]) > 600) best = mainMatch[1];
  }
  if (!best) {
    // Score every div/section by the paragraph text directly inside it.
    let bestScore = 0;
    const re = /<(div|section)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let m: RegExpExecArray | null;
    let guard = 0;
    while ((m = re.exec(body)) && guard++ < 4000) {
      const score = paragraphChars(m[2]);
      if (score > bestScore) {
        bestScore = score;
        best = m[2];
      }
    }
    if (bestScore < 400) best = body;
  }
  body = best ?? body;

  const blocks = blocksOf(body);
  let text = blocks.join("\n\n");
  if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS).replace(/\s+\S*$/, "") + " …";
  const wordCount = text ? text.split(/\s+/).length : 0;
  return { title: title?.trim() || null, byline, siteName, text, wordCount };
}

/** Fetches a page and extracts it. Null when it cannot be read as an article. */
export async function fetchArticle(url: string): Promise<ExtractedArticle | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 (compatible; Noesis/1.0; personal learning app)",
      },
    });
    if (!res.ok) return null;
    const ctype = res.headers.get("content-type") ?? "";
    if (!ctype.includes("html")) return null;
    const html = await res.text();
    const article = extractArticle(html.slice(0, 2_500_000));
    if (article.wordCount < 80) return { ...article, text: "", wordCount: 0 };
    return article;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
