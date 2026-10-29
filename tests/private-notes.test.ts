import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
const base = process.env.TEST_URL || "http://localhost:3127";
if (new URL(base).hostname !== "localhost") throw new Error("Use isolated localhost only");
const account = JSON.parse(await readFile(new URL("../../local-test-account.json", import.meta.url), "utf8"));
test("members, private notes and image bytes are isolated while admins may read", async () => {
  async function req(path: string, method = "GET", data?: unknown, cookie = "") {
    const r = await fetch(base + path, { method, redirect: "manual", headers: { Origin: base, ...(cookie ? { Cookie: cookie } : {}), ...(data instanceof FormData ? {} : { "Content-Type": "application/json" }) }, body: data === undefined ? undefined : data instanceof FormData ? data : JSON.stringify(data) });
    const raw = await r.text(); let body; try { body = JSON.parse(raw); } catch { body = raw; } return { r, body };
  }
  async function login(collection: string, credentials: unknown) {
    const { r } = await req(`/api/${collection}/login`, "POST", credentials); assert.equal(r.status, 200);
    return r.headers.getSetCookie().map(s => s.split(";")[0]).join("; ");
  }
  const admin = await login("users", account);
  const prefix = `member${Date.now()}`;
  const a = { username: `${prefix}a`, password: "Private-note-test-123", name: "用户 A" }, b = { ...a, username: `${prefix}b`, name: "用户 B" };
  assert.equal((await req("/api/members", "POST", { ...a, password: "123" })).r.status, 400);
  const ar = await req("/api/members", "POST", { ...a, role: "admin", collection: "users" }); assert.equal(ar.r.status, 201);
  const br = await req("/api/members", "POST", b); assert.equal(br.r.status, 201);
  const aid = ar.body.doc.id, bid = br.body.doc.id, ac = await login("members", a), bc = await login("members", b);
  assert.equal((await req("/api/writing-session", "GET", undefined, ac)).body.kind, "member");
  for (const path of ["/api/users", "/api/blog-backup?kind=posts"]) assert.ok([401, 403].includes((await req(path, "GET", undefined, ac)).r.status), path);
  assert.equal((await req("/api/users", "POST", { ...a, username: prefix + "admin" }, ac)).r.status, 403);
  assert.equal((await req("/api/globals/site-settings", "POST", { name: "hacked" }, ac)).r.status, 403);
  assert.ok([403, 404].includes((await req(`/api/members/${bid}`, "PATCH", { password: "Hacked-password" }, ac)).r.status));
  assert.ok([403, 404].includes((await req(`/api/members/${bid}`, "GET", undefined, ac)).r.status));
  assert.equal((await req("/member-notes", "GET", undefined, ac)).r.status, 307);
  assert.equal((await req("/write", "GET", undefined, ac)).r.status, 307);
  const text = (value: string) => ({ root: { type: "root", version: 1, direction: null, format: "", indent: 0, children: [{ type: "paragraph", version: 1, direction: null, format: "", indent: 0, textFormat: 0, textStyle: "", children: [{ type: "text", version: 1, text: value, detail: 0, format: 0, mode: "normal", style: "" }] }] } });
  const marker = `${prefix}-private-body`;
  const adminPost = await req("/api/posts", "POST", { title: prefix, slug: prefix, content: text("public administrator text"), category: "测试", _status: "published" }, admin);
  assert.equal(adminPost.r.status, 201);
  const secret = `${prefix}-admin-draft-secret`;
  assert.equal((await req(`/api/posts/${adminPost.body.doc.id}?draft=true`, "PATCH", { content: text(secret), _status: "draft" }, admin)).r.status, 200);
  assert.ok(!JSON.stringify((await req(`/api/posts/${adminPost.body.doc.id}?draft=true`, "GET", undefined, ac)).body).includes(secret));
  assert.ok([401, 403].includes((await req("/api/posts/versions", "GET", undefined, ac)).r.status));
  const data = { title: marker, content: text(marker), category: "生活随笔", owner: bid, _status: "published" };
  assert.equal((await req("/api/posts", "POST", data, ac)).r.status, 403);
  assert.equal((await req("/api/private-notes", "POST", data)).r.status, 403);
  const created = await req("/api/private-notes", "POST", data, ac); assert.equal(created.r.status, 201, JSON.stringify(created.body));
  const slices = await req('/api/time-slices', 'GET', undefined, ac);
  assert.equal(slices.r.status,200); assert.match(slices.r.headers.get('cache-control') || '',/private.*no-store/);
  assert.equal(slices.body.member,true);assert.equal(slices.body.total,1);assert.equal(slices.body.notes[0].title,marker);
  assert.deepEqual(Object.keys(slices.body.notes[0]).sort(),['excerpt','id','title','updatedAt']);
  assert.deepEqual((await req('/api/time-slices','GET',undefined,bc)).body,{member:true,total:0,notes:[]});
  for(const cookie of ['',admin]) assert.deepEqual((await req('/api/time-slices','GET',undefined,cookie)).body,{member:false});
  assert.ok((await req('/my-notes','GET',undefined,ac)).body.includes('时间切片'));
  assert.ok((await req('/notes')).body.includes('沐瑞の生活随笔'));
  const id = created.body.doc.id; assert.equal(created.body.doc.owner.id ?? created.body.doc.owner, aid, "server controls ownership");
  for (const cookie of ["", bc]) {
    const blocked = await req(`/api/private-notes/${id}`, "GET", undefined, cookie); assert.ok([403, 404].includes(blocked.r.status)); assert.ok(!JSON.stringify(blocked.body).includes(marker));
  }
  assert.ok([403, 404].includes((await req(`/api/private-notes/${id}`, "PATCH", { title: "hacked" }, bc)).r.status));
  assert.ok([403, 404].includes((await req(`/api/private-notes/${id}`, "DELETE", undefined, bc)).r.status));
  const own = await req(`/api/private-notes/${id}`, "GET", undefined, ac); assert.equal(own.r.status, 200); assert.match(own.r.headers.get("cache-control") || "", /no-store/);
  assert.equal((await req(`/api/private-notes/${id}`, "GET", undefined, admin)).r.status, 200);
  assert.equal((await req(`/api/private-notes/${id}`, "PATCH", { title: "admin-edit" }, admin)).r.status, 403);
  assert.ok([403, 404].includes((await req(`/my-notes?id=${id}`, "GET", undefined, bc)).r.status));
  assert.ok(!(await req(`/my-notes?id=${id}`)).body.includes(marker));
  assert.ok((await req(`/my-notes?id=${id}`, "GET", undefined, ac)).body.includes(marker));
  assert.ok((await req(`/member-notes?id=${id}`, "GET", undefined, admin)).body.includes(marker));
  const transferred = await req(`/api/private-notes/${id}`, "PATCH", { owner: bid, title: marker }, ac); assert.equal(transferred.r.status, 200); assert.equal(transferred.body.doc.owner.id ?? transferred.body.doc.owner, aid);
  const list = await req("/api/private-notes?limit=100", "GET", undefined, bc); assert.equal(list.r.status, 200); assert.equal(list.body.docs.length, 0);
  for (const path of ["/", "/notes", "/archive", "/feed.xml", "/sitemap.xml"]) assert.ok(!(await req(path)).body.includes(marker), path);
  const form = new FormData(); const bytes = await sharp({ create: { width: 25, height: 25, channels: 3, background: "#fbdfee" } }).png().toBuffer();
  form.set("_payload", JSON.stringify({ alt: "私密照片", owner: bid })); form.set("file", new Blob([new Uint8Array(bytes)], { type: "image/png" }), `${prefix}.png`);
  assert.equal((await req("/api/media", "POST", form, ac)).r.status, 403);
  const uploaded = await req("/api/private-media", "POST", form, ac); assert.equal(uploaded.r.status, 201, JSON.stringify(uploaded.body)); const image = uploaded.body.doc;
  const filePath = `/api/private-media/file/${image.filename}`;
  const browserImage = await fetch(base + filePath, { headers: { Cookie: ac, "Sec-Fetch-Site": "same-origin" } });
  assert.equal(browserImage.status, 200, "normal browser images send Sec-Fetch-Site rather than Origin");
  for (const cookie of [ac, admin]) {
    const response = await fetch(base + filePath, { headers: { Cookie: cookie, Origin: base } }); assert.equal(response.status, 200); assert.match(response.headers.get("cache-control") || "", /private.*no-store/); assert.ok((await response.arrayBuffer()).byteLength > 0);
  }
  for (const cookie of ["", bc]) { const response = await req(filePath, "GET", undefined, cookie); assert.ok([403, 404].includes(response.r.status)); assert.match(response.r.headers.get("cache-control") || "", /no-store/); }
  assert.equal((await req(`/api/media/file/${image.filename}`)).r.status, 404, "private bytes must not be reachable through the public adapter");
  const foreign = await req("/api/private-notes", "POST", { ...data, cover: image.id }, bc); assert.ok([400, 403].includes(foreign.r.status));
  const bodyWithImage = text(marker) as { root: { children: unknown[] } };
  bodyWithImage.root.children.push({ type: "upload", version: 3, id: crypto.randomUUID(), relationTo: "private-media", value: image.id, fields: {}, format: "" });
  assert.equal((await req(`/api/private-notes/${id}`, "PATCH", { cover: image.id, content: bodyWithImage }, ac)).r.status, 200);
  const full = await req(`/api/private-notes/${id}?depth=1`, "GET", undefined, ac); assert.equal(full.body.cover.id, image.id);
  assert.equal(full.body.content.root.children[1].value.id, image.id);
  assert.ok([403, 404].includes((await req(`/api/private-media/${image.id}`, "DELETE", undefined, bc)).r.status));
  assert.equal((await req("/api/private-media?limit=100", "GET", undefined, bc)).body.docs.length, 0);
  assert.equal((await req(`/api/private-notes/${id}`, "GET", undefined, await login("members", a))).r.status, 200, "notes survive another login");
  assert.equal((await req("/api/members/logout", "POST", undefined, ac)).r.status, 200);
  assert.ok([401, 403, 404].includes((await req(`/api/private-notes/${id}`, "GET", undefined, ac)).r.status), "logged-out session cannot read notes");
  console.log("Verified two-member isolation, admin read-only visibility, private image bytes and public-feed exclusion.");
});


