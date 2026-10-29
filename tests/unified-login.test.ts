import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const base = process.env.TEST_URL || "http://localhost:3127";
if (new URL(base).hostname !== "localhost") throw new Error("Login tests require an isolated local database");
const account = JSON.parse(await readFile(new URL("../../local-test-account.json", import.meta.url), "utf8"));
test("one login endpoint verifies both identities without elevating members", async () => {
  const post = (path: string, data: unknown, origin = base, cookie = "") => fetch(base + path, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify(data) });
  const get = (path: string, cookie = "") => fetch(base + path, { redirect: "manual", headers: { Cookie: cookie, "Sec-Fetch-Site": "same-origin" } });
  const cookieOf = (response: Response) => response.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
  const page = await get("/login"); assert.equal(page.status, 200); assert.match(await page.text(), /登录，开始记录/);
  const forbidden = await post("/api/login", account, "https://unrelated.example"); assert.equal(forbidden.status, 403); assert.equal(forbidden.headers.get("set-cookie"), null);
  const bad = await post("/api/login", { username: account.username, password: "deliberately-incorrect" });
  assert.equal(bad.status, 401); assert.match(await bad.text(), /账号或密码不正确/); assert.equal(bad.headers.get("set-cookie"), null);
  const admin = await post("/api/login", { ...account, username: ` ${account.username.toUpperCase()} `, kind: "member" });
  assert.equal(admin.status, 200, await admin.clone().text()); assert.deepEqual(await admin.json(), { authenticated: true, kind: "admin", redirectTo: "/write" });
  assert.match(admin.headers.get("set-cookie") || "", /HttpOnly/); assert.match(admin.headers.get("cache-control") || "", /no-store/);
  const ac = cookieOf(admin); assert.equal((await get("/login", ac)).headers.get("location"), "/write");
  for (const path of ['/my-notes', '/my-notes?id=1', '/my-notes?new=1']) {
    const ownNotes = await get(path, ac); assert.equal(ownNotes.status, 307); assert.equal(ownNotes.headers.get('location'), '/write?view=posts');
  }
  const adminList = await get('/write?view=posts', ac); assert.equal(adminList.status, 200); assert.match(await adminList.text(), /我的文章/);
  assert.deepEqual(await (await get("/api/writing-session", ac)).json(), { authenticated: true, kind: "admin" });
  const adminProfile=await (await get('/api/writing-session?profile=1',ac)).json();assert.equal(adminProfile.profile.username,account.username);assert.equal(typeof adminProfile.profile.avatar,'string');assert.deepEqual(Object.keys(adminProfile.profile).sort(),['avatar','name','username']);
  const reserved = await post("/api/members", { ...account, name: "reserved" }); assert.equal(reserved.status, 400);
  const name = `unified${Date.now()}`; const credentials = { username: name, password: "Local-only-password-123" };
  assert.equal((await post("/api/members", { ...credentials, name: "普通用户", role: "admin" })).status, 201);
  const member = await post("/api/login", { ...credentials, kind: "admin", collection: "users" });
  assert.equal(member.status, 200, await member.clone().text()); assert.deepEqual(await member.json(), { authenticated: true, kind: "member", redirectTo: "/my-notes" });
  const mc = cookieOf(member); assert.equal((await get("/login", mc)).headers.get("location"), "/my-notes");
  assert.deepEqual(await (await get("/api/writing-session", mc)).json(), { authenticated: true, kind: "member" });
  assert.equal((await get("/api/blog-backup", mc)).status, 401);
  assert.equal((await post("/api/posts", { title: "must not publish" }, base, mc)).status, 403);
  // Legacy duplicate usernames are resolved by password, never by a role flag.
  assert.equal((await post("/api/users", { username: name, password: "Different-admin-password-123" }, base, ac)).status, 201);
  const duplicateMember = await post("/api/login", credentials); assert.equal(duplicateMember.status, 200); assert.equal((await duplicateMember.json()).kind, "member");
  const duplicateAdmin = await post("/api/login", { username: name, password: "Different-admin-password-123" }); assert.equal(duplicateAdmin.status, 200); assert.equal((await duplicateAdmin.json()).kind, "admin");
  assert.equal((await post("/api/members/logout", {}, base, mc)).status, 200);
  assert.deepEqual(await (await get("/api/writing-session", mc)).json(), { authenticated: false, kind: null });
  for (let i = 0; i < 7; i++) await post("/api/login", { username: name, password: "wrong-password" });
  const locked = await post("/api/login", credentials); assert.equal(locked.status, 429); assert.equal(locked.headers.get("set-cookie"), null);
  assert.deepEqual(await (await get("/api/writing-session")).json(), { authenticated: false, kind: null });
});
