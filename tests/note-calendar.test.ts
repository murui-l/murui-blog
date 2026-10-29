import { test } from "node:test";
import assert from "node:assert/strict";
import type { Post } from "../src/lib/domain";
import { isNoteCalendarDay, toNoteCalendarEntries } from "../src/lib/note-calendar";

function post(overrides: Partial<Post> = {}): Post {
  return { id: "one", slug: "一朵花", title: "生活里的一朵花", excerpt: "今天路过一朵花。", content: "正文不应进入花历", category: "生活随笔", tags: [], cover: "", status: "PUBLISHED", featured: false, createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z", publishedAt: "2026-10-14T16:00:00Z", revision: 0, ...overrides };
}

test("calendar groups instants by the Shanghai midnight boundary, independent of the process timezone", () => {
  const result = toNoteCalendarEntries([
    post({ id: "before", publishedAt: "2026-10-14T15:59:59Z" }),
    post({ id: "after", publishedAt: "2026-10-14T16:00:00Z" }),
    post({ id: "offset", publishedAt: "2026-10-15T00:00:01+08:00" }),
  ]);
  assert.deepEqual(result.map(({ id, day }) => [id, day]), [["offset", "2026-10-15"], ["after", "2026-10-15"], ["before", "2026-10-14"]]);
});

test("calendar accepts leap days and rejects invalid dates, missing zones and normalized rollovers", () => {
  const invalid = [null, "", "not-a-date", "2026-02-29T00:00:00Z", "2026-02-30T00:00:00Z", "2026-13-01T00:00:00Z", "2026-10-15T24:00:00Z", "2026-10-15T00:60:00Z", "2026-10-15T00:00:60Z", "2026-10-15T00:00:00", "2026-10-15", "2026-10-15T00:00:00+08:60"];
  assert.equal(toNoteCalendarEntries(invalid.map(publishedAt => post({ publishedAt }))).length, 0);
  assert.equal(toNoteCalendarEntries([post({ publishedAt: "2024-02-28T16:00:00.000Z" })])[0].day, "2024-02-29");
  assert.equal(isNoteCalendarDay("2024-02-29"), true);
  assert.equal(isNoteCalendarDay("2026-02-29"), false);
  assert.equal(isNoteCalendarDay("1900-02-29"), false);
  assert.equal(isNoteCalendarDay("2000-02-29"), true);
});

test("only published notes in the two public note categories are retained", () => {
  const result = toNoteCalendarEntries([
    post({ id: "notes", category: "随笔" }), post({ id: "life" }),
    post({ id: "draft", status: "DRAFT" }), post({ id: "trash", status: "TRASH" }),
    post({ id: "other", category: "技术" }), post({ id: "similar", category: "私密随笔" }),
  ]);
  assert.deepEqual(result.map(entry => entry.id), ["notes", "life"]);
});

test("DTO has exactly five public fields and does not read bodies or user fields, even for an empty excerpt", () => {
  const input = [post(), post({ id: "empty", excerpt: "" })];
  for (const item of input) {
    for (const key of ["content", "richContent", "user", "owner", "privateNotes"]) Object.defineProperty(item, key, { get() { throw new Error(`Read sensitive field: ${key}`); }, enumerable: true });
    Object.freeze(item);
  }
  const result = toNoteCalendarEntries(Object.freeze(input));
  assert.deepEqual(Object.keys(result[0]).sort(), ["day", "excerpt", "id", "slug", "title"].sort());
  assert.equal(result[1].excerpt, "");
  assert.equal(result[0].slug, "一朵花");
  assert.doesNotThrow(() => JSON.stringify(result));
});

test("excerpts preserve short text and cap long text at 120 visual characters without splitting emoji", () => {
  const family = "👨‍👩‍👧‍👦";
  const result = toNoteCalendarEntries([
    post({ id: "short", excerpt: "  第一行\n第二行  " }),
    post({ id: "exact", excerpt: "花".repeat(120) }),
    post({ id: "long", excerpt: "花".repeat(118) + family + "落下" }),
  ]);
  assert.equal(result[0].excerpt, "第一行 第二行");
  assert.equal(result[1].excerpt, "花".repeat(120));
  assert.equal(result[2].excerpt, "花".repeat(118) + family + "…");
  assert.equal([...new Intl.Segmenter("zh-CN", { granularity: "grapheme" }).segment(result[2].excerpt)].length, 120);
});
