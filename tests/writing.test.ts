import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { unpopulateMedia } from "../src/lib/writing";

const base = process.env.TEST_URL || "http://localhost:3127";
if (new URL(base).hostname !== "localhost") throw new Error("Writing mutations require the isolated localhost database");
const account = JSON.parse(await readFile(new URL("../../local-test-account.json", import.meta.url), "utf8"));

test("front writing uses the existing cookie session and keeps drafts private", async () => {
  let cookie = "";
  async function request(path: string, method = "GET", body?: unknown, authenticated = false) {
    return fetch(base + path, { method, redirect: "manual", headers: {
      Origin: base, ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...(authenticated ? { Cookie: cookie } : {}),
    }, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body) });
  }
  const anonymousSession = await request("/api/writing-session");
  assert.deepEqual(await anonymousSession.json(), { authenticated: false, kind: null });
  assert.match(anonymousSession.headers.get("cache-control") || "", /no-store/);
  const anonymousPage = await request("/write");
  assert.equal(anonymousPage.status, 200);
  assert.match(await anonymousPage.text(), /登录，开始记录/);
  assert.match(anonymousPage.headers.get("cache-control") || "", /private.*no-store/);

  const login = await request("/api/users/login", "POST", account);
  assert.equal(login.status, 200);
  cookie = login.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
  assert.ok(cookie);
  const session = await request("/api/writing-session", "GET", undefined, true);
  assert.deepEqual(await session.json(), { authenticated: true, kind: "admin" });
  assert.match(session.headers.get("cache-control") || "", /private.*no-store/);
  assert.deepEqual(await (await request("/api/writing-session")).json(), { authenticated: false, kind: null }, "session must not leak through a shared cache");

  const bytes = await sharp({ create: { width: 32, height: 24, channels: 3, background: "#ead5ef" } }).png().toBuffer();
  const upload = new FormData();
  upload.set("file", new Blob([new Uint8Array(bytes)], { type: "image/png" }), `writing-${Date.now()}.png`);
  upload.set("_payload", JSON.stringify({ alt: "写作测试配图" }));
  assert.equal((await request("/api/media", "POST", upload)).status, 403);
  const uploaded = await request("/api/media", "POST", upload, true);
  assert.equal(uploaded.status, 201);
  const media = (await uploaded.json()).doc;
  const marker = `writing-private-${Date.now()}`;
  const paragraph = (text: string) => ({ type: "paragraph", version: 1, direction: null, format: "", indent: 0, textFormat: 0, textStyle: "", children: [{ type: "text", version: 1, text, detail: 0, format: 1, mode: "normal", style: "" }] });
  const content = { root: { type: "root", version: 1, direction: null, format: "", indent: 0, children: [
    paragraph(marker),
    { type: "upload", version: 3, format: "", relationTo: "media", value: media, fields: {}, id: crypto.randomUUID() },
    paragraph("配图之后仍然可以继续写"),
  ] } };
  const original = structuredClone(content);
  const cleaned = unpopulateMedia(content) as typeof content;
  assert.deepEqual(content, original, "saving must not destroy the populated image preview in the editor");
  assert.ok("value" in cleaned.root.children[1]);
  assert.equal(cleaned.root.children[1].value, media.id);
  assert.ok("children" in cleaned.root.children[0]);
  assert.equal(cleaned.root.children[0].children[0].format, 1, "formatting survives image normalization");
  const data = { title: marker, slug: marker, category: "生活随笔", tags: ["生活"], cover: media.id, content: cleaned, _status: "draft" };
  assert.equal((await request("/api/posts?draft=true", "POST", data)).status, 403);
  const created = await request("/api/posts?draft=true", "POST", data, true);
  assert.equal(created.status, 201);
  const draft = (await created.json()).doc;
  const id = draft.id;
  assert.equal((await request(`/posts/${marker}`)).status, 404);
  const editor = await request(`/write?id=${id}`, "GET", undefined, true);
  assert.equal(editor.status, 200);
  assert.match(editor.headers.get("cache-control") || "", /private.*no-store/);
  assert.ok((await editor.text()).includes(marker));
  assert.ok(!(await (await request(`/write?id=${id}`)).text()).includes(marker), "anonymous visitor must not receive draft data in HTML or RSC");
  assert.equal((await request(`/api/posts/${id}`, "PATCH", { _status: "published" })).status, 403);

  const published = await request(`/api/posts/${id}`, "PATCH", { ...data, _status: "published" }, true);
  assert.equal(published.status, 200);
  await new Promise(resolve => setTimeout(resolve, 150));
  for (const path of ["/", "/notes", "/feed.xml", `/posts/${marker}`]) {
    const page = await request(path); assert.equal(page.status, 200, path); assert.ok((await page.text()).includes(marker), path);
  }
  const article = await (await request(`/posts/${marker}`)).text();
  assert.ok(article.includes(media.filename), "cover and inline image appear on the public article");
  assert.ok(article.includes("配图之后仍然可以继续写"));
  const retrieved = await (await request(`/api/posts/${id}?draft=true&depth=1`, "GET", undefined, true)).json();
  assert.equal(retrieved.cover.id, media.id);
  assert.equal(retrieved.content.root.children[1].value.id, media.id, "inline image reloads with its preview metadata");
  assert.equal(retrieved.content.root.children[0].children[0].format, 1);
  const savedEdit = await request(`/api/posts/${id}?draft=true`, "PATCH", { ...data, title: `${marker}-pending`, content: unpopulateMedia({ ...content, root: { ...content.root, children: [paragraph(`${marker}-secret-revision`), content.root.children[1]] } }) }, true);
  assert.equal(savedEdit.status, 200);
  const saved = (await savedEdit.json()).doc;
  const latest = await (await request(`/api/posts/${id}?draft=true&depth=0`, "GET", undefined, true)).json();
  assert.equal(latest.updatedAt, saved.updatedAt, "save response can be used to detect a later edit");
  assert.ok(!(await (await request(`/posts/${marker}`)).text()).includes("secret-revision"));
  assert.ok((await (await request(`/write?id=${id}`, "GET", undefined, true)).text()).includes("secret-revision"));
  const listing = await request("/api/posts?draft=true&depth=0&limit=12&sort=-updatedAt&select[title]=true&select[category]=true&select[updatedAt]=true&select[_status]=true", "GET", undefined, true);
  assert.ok((await listing.json()).docs.some((post: { id: number }) => post.id === id));
  console.log("Verified cookie login, private writing page, draft + cover + inline image, publication, and editing without leaking pending changes.");
});

