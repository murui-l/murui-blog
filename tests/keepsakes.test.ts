import test from "node:test";
import assert from "node:assert/strict";
import { keepsakeDay, toKeepsakePosts, findItems } from "../src/lib/keepsakes";
import type { Post } from "../src/lib/domain";

function post(status: Post["status"], id: string): Post {
  return { id, title: `公开日记${id}`, slug: `中文/${id}`, excerpt: "今天  看见一朵花", category: "生活随笔", tags: ["小花"], status, publishedAt: "2026-10-17T16:01:00Z", createdAt: "", updatedAt: "", featured: false, revision: 1,
    get content(): string { throw new Error("Private/full body must never be read by the search index"); },
    get cover(): string { throw new Error("Unneeded asset must never be read"); },
  };
}
test("only public metadata crosses the client boundary, never full/private bodies", () => {
  const result = toKeepsakePosts([post("DRAFT", "draft"), post("TRASH", "trash"), post("PUBLISHED", "yes")]);
  assert.equal(result.length, 1); assert.deepEqual(Object.keys(result[0]).sort(), ["id", "title", "excerpt", "href", "category", "keywords", "date"].sort());
  assert.equal(result[0].href, "/posts/%E4%B8%AD%E6%96%87%2Fyes"); assert.equal(result[0].date, "2026-10-18"); assert.equal(result[0].excerpt, "今天 看见一朵花");
});
test("Shanghai day is stable across midnight and leap day", () => {
  assert.equal(keepsakeDay(new Date("2026-10-17T15:59:59Z")), "2026-10-17");
  assert.equal(keepsakeDay(new Date("2026-10-17T16:00:00Z")), "2026-10-18");
  assert.equal(keepsakeDay(new Date("2024-02-28T16:00:00Z")), "2024-02-29");
});
test("find box maps live album metadata and public article links without account paths", () => {
  const items = findItems(toKeepsakePosts([post("PUBLISHED", "yes")]), { categories: [{ id: "a space", name: "心海" }], images: [{ id: "1", categoryId: "a space", src: "/public.webp", width: 50, height: 80 }], revision: "1" });
  assert.ok(items.some(item => item.label === "心海" && item.href === "/gallery?album=a%20space" && item.description === "1 张收藏图片"));
  assert.ok(items.every(item => !/^(?:\/account|\/my-notes|\/admin|\/write|\/preview)/.test(item.href)));
  assert.ok(items.every(item => item.href !== "/guestbook"));
  assert.ok(items.some(item => item.keywords.includes("小花")));
});
