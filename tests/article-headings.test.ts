import assert from "node:assert/strict";
import test from "node:test";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { prepareArticleHeadings } from "../src/lib/article-headings";

const heading = (tag: string, ...text: string[]) => ({ type: "heading", tag, children: text.map(text => ({ type: "text", text })) });
const document = (...children: unknown[]) => ({ root: { type: "root", children } }) as SerializedEditorState;

test("duplicate headings and slug-like titles all have unique, repeatable anchors", () => {
  const input = document(heading("h2", "你好，世界"), heading("h3", "你好，世界"), heading("h2", "你好 世界 2"), heading("h2", "你好，世界"));
  const before = JSON.stringify(input);
  const prepared = prepareArticleHeadings(input);
  assert.deepEqual(prepared.headings.map(heading => heading.id), ["section-你好-世界", "section-你好-世界-2", "section-你好-世界-2-2", "section-你好-世界-3"]);
  assert.deepEqual(prepared, prepareArticleHeadings(input));
  assert.equal(JSON.stringify(input), before, "stored content is not modified");
});

test("formatted text stays joined, only nonempty h2/h3 enter TOC, all heading anchors are distinct", () => {
  const prepared = prepareArticleHeadings(document(heading("h1", "生活"), heading("h2", "生活"), heading("h3", "照", "片", " 与 ", "音乐"), heading("h4", "细节"), heading("h2", "！"), heading("h2", "")));
  assert.deepEqual(prepared.headings.map(({ text, level }) => ({ text, level })), [
    { text: "生活", level: 2 }, { text: "照片 与 音乐", level: 3 }, { text: "！", level: 2 },
  ]);
  const ids = (prepared.data.root.children as unknown as { journalAnchor: string }[]).map(node => node.journalAnchor);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(prepared.headings[0].id, "section-生活-2");
});

test("normal paragraphs, media versions and content fields survive anchor preparation", () => {
  const image = { type: "upload", relationTo: "media", value: { url: "/api/media/file/photo.webp?v=123", width: 600, height: 900 } };
  const paragraph = { type: "paragraph", children: [{ type: "text", text: "原有文章，不改写。", format: 1 }] };
  const prepared = prepareArticleHeadings(document(paragraph, image));
  assert.equal(prepared.headings.length, 0);
  assert.deepEqual(prepared.data.root.children, [paragraph, image]);
});
