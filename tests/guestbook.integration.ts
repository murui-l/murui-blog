/** Disposable SQLite only. Retired endpoints must never touch the preserved collection. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const work = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../guestbook-retirement-isolated");
await mkdir(work, { recursive: true });
const database = path.join(work, `retired-${randomUUID()}.db`).replaceAll("\\", "/");
// Clear inherited remote credentials before importing any CMS/config modules.
for (const key of Object.keys(process.env)) {
  if (/TURSO|DATABASE|TOKEN|SECRET|PASSWORD|SMTP|RESEND|AWS|S3_|BLOB/i.test(key)) delete process.env[key];
}
process.env.TURSO_URL = "";
process.env.TURSO_AUTH_TOKEN = "";
process.env.DATABASE_URL = `file:${database}`;
process.env.PAYLOAD_SECRET = `retired-isolated-${randomUUID()}`;
process.env.SITE_URL = "http://localhost:3198";
assert.ok(process.env.DATABASE_URL.startsWith(`file:${work.replaceAll("\\", "/")}/`));

const apiSource = await readFile(new URL("../src/app/api/guestbook/route.ts", import.meta.url), "utf8");
assert.doesNotMatch(apiSource, /\bimport\b|\bcms\b|\bauth\b|\bfetch\s*\(|\brequest\s*\./);
const { GET, POST, DELETE } = await import("../src/app/api/guestbook/route");
const handlers: Record<"GET" | "POST" | "DELETE", (request: Request) => Response> = { GET, POST, DELETE };
const { cms } = await import("../src/lib/db");
const { sql } = await import("@payloadcms/db-sqlite");
const client = await cms();
const passed: string[] = [];

try {
  await client.db.migrate();
  const admin = { ...(await client.create({ collection: "users", data: { username: "retired-owner", password: "Retired-owner-password-789", name: "站主" }, overrideAccess: true })), collection: "users" as const };
  const member = { ...(await client.create({ collection: "members", data: { username: "retired-member", password: "Retired-member-password-123", name: "历史访客" }, overrideAccess: true })), collection: "members" as const };
  const root = await client.create({ collection: "guestbook-entries", data: { body: "保留的历史主留言", name: admin.name || "站主", status: "approved", author: { relationTo: "users", value: admin.id } }, user: admin, overrideAccess: true });
  await client.create({ collection: "guestbook-entries", data: { body: "保留的历史回复", parent: root.id, name: admin.name || "站主", status: "approved", author: { relationTo: "users", value: admin.id } }, user: admin, overrideAccess: true });
  const pending = await client.create({ collection: "guestbook-entries", data: { body: "保留的待审核留言", name: member.name, status: "pending", author: { relationTo: "members", value: member.id } }, user: member, overrideAccess: true });
  assert.equal(pending.status, "pending");
  const withdrawn = await client.create({ collection: "guestbook-entries", data: { body: "保留的撤回留言", name: member.name, status: "pending", author: { relationTo: "members", value: member.id } }, user: member, overrideAccess: true });
  await client.update({ collection: "guestbook-entries", id: withdrawn.id, data: { status: "withdrawn" }, user: admin, overrideAccess: false });

  const before = await client.find({ collection: "guestbook-entries", depth: 0, pagination: false, sort: "id", overrideAccess: true });
  assert.equal(before.docs.length, 4);
  const privateBefore = await client.count({ collection: "private-notes", overrideAccess: true });
  passed.push("Existing approved, pending, withdrawn messages and a reply are seeded only in disposable SQLite");

  // Any accidental Local API/auth/database call from a retired endpoint fails the test.
  let calls = 0;
  const guards = ["auth", "find", "findByID", "count", "create", "update", "delete"] as const;
  const saved = guards.map(key => ({ key, value: client[key] }));
  for (const { key } of saved) Object.defineProperty(client, key, { configurable: true, writable: true, value: () => { calls++; throw new Error(`Retired endpoint attempted CMS ${key}`); } });
  try {
    for (const method of ["GET", "POST", "DELETE"] as const) {
      for (const query of ["", "?mine=1", `?parent=${root.id}&page=1`, "?page=invalid"]) {
        for (const cookie of ["", "payload-token=invalid", "payload-members-token=invalid"]) {
          const request: Request = new Request(`${process.env.SITE_URL}/api/guestbook${query}`, { method, headers: { Cookie: cookie, Origin: "https://elsewhere.invalid", "Content-Type": "application/json" }, ...(method === "GET" ? {} : { body: "not-json" }) });
          const response = handlers[method](request);
          assert.equal(response.status, 410);
          assert.equal(response.headers.get("Cache-Control"), "private, no-store");
          assert.equal(response.headers.get("CDN-Cache-Control"), "no-store");
          assert.equal(response.headers.get("Vercel-CDN-Cache-Control"), "no-store");
          assert.match(response.headers.get("content-type") || "", /application\/json/);
          assert.deepEqual(await response.json(), { error: "guestbook_retired", message: "留言功能已下线。" });
          assert.equal(request.bodyUsed, false);
        }
      }
    }
    assert.equal(calls, 0);
  } finally {
    for (const { key, value } of saved) Object.defineProperty(client, key, { configurable: true, writable: true, value });
  }
  passed.push("All 36 old API variants return 410 JSON with no-store, do not consume input, and call no CMS/auth methods");

  await assert.rejects(client.find({ collection: "guestbook-entries", user: member, overrideAccess: false }), /not allowed|Forbidden|permission/i);
  await assert.rejects(client.create({ collection: "guestbook-entries", data: { body: "成员不能绕过退役接口", name: member.name, status: "pending", author: { relationTo: "members", value: member.id } }, user: member, overrideAccess: false }));
  await assert.rejects(client.update({ collection: "guestbook-entries", id: pending.id, data: { body: "不能改旧数据" }, user: member, overrideAccess: false }));
  await assert.rejects(client.delete({ collection: "guestbook-entries", id: root.id, user: member, overrideAccess: false }));
  passed.push("Generic Payload collection read/create/update/delete still reject members");

  const after = await client.find({ collection: "guestbook-entries", depth: 0, pagination: false, sort: "id", overrideAccess: true });
  assert.deepEqual(after.docs, before.docs);
  assert.equal((await client.count({ collection: "private-notes", overrideAccess: true })).totalDocs, privateBefore.totalDocs);
  assert.equal((await client.db.drizzle.run(sql`PRAGMA foreign_key_check`)).rows.length, 0);
  passed.push("Preserved message records, relationships, statuses and private-note count are unchanged");
  const report = { verified: true, isolatedDatabase: database, productionWrites: false, passed };
  await writeFile(path.join(work, "results.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
} finally { await client.destroy(); }
