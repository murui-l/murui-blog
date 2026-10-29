import type { Post } from "./domain";

/** The complete public data boundary for the home calendar. Never include a post body. */
export type NoteCalendarEntry = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  day: string;
};

const shanghaiDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
});
const graphemes = new Intl.Segmenter("zh-CN", { granularity: "grapheme" });
const excerptLimit = 120;

export function isNoteCalendarDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

function publicationTime(value: string | null): number | null {
  // Payload stores ISO instants. Require an explicit zone so the server's local
  // timezone cannot move an article to another day; reject Date.parse's rollover.
  if (typeof value !== "string") return null;
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-](\d{2}):(\d{2}))$/.exec(value);
  if (!match || !isNoteCalendarDay(match[1]) || Number(match[2]) > 23 || Number(match[3]) > 59
    || Number(match[4] || 0) > 59 || Number(match[6] || 0) > 23 || Number(match[7] || 0) > 59) return null;
  const instant = Date.parse(value);
  return Number.isFinite(instant) ? instant : null;
}

function shortExcerpt(excerpt: string): string {
  const clean = excerpt.replace(/\s+/g, " ").trim();
  const characters = Array.from(graphemes.segment(clean), part => part.segment);
  return characters.length > excerptLimit ? characters.slice(0, excerptLimit - 1).join("") + "…" : clean;
}

export function toNoteCalendarEntries(posts: readonly Post[]): NoteCalendarEntry[] {
  const visible: { entry: NoteCalendarEntry; instant: number }[] = [];
  for (const post of posts) {
    if (post.status !== "PUBLISHED" || !["生活随笔", "随笔"].includes(post.category.trim())) continue;
    const instant = publicationTime(post.publishedAt);
    if (instant === null) continue;
    const parts = shanghaiDate.formatToParts(new Date(instant));
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(value => value.type === type)!.value;
    const day = `${part("year").padStart(4, "0")}-${part("month")}-${part("day")}`;
    if (!isNoteCalendarDay(day)) continue;
    visible.push({ instant, entry: {
      id: post.id, slug: post.slug, title: post.title,
      excerpt: shortExcerpt(post.excerpt), day,
    } });
  }
  return visible.sort((left, right) => right.instant - left.instant).map(({ entry }) => entry);
}
