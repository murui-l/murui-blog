import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";

// Explicit opt-in prevents a build or an accidental script invocation from
// changing the configured database. This adds three isolated tables only.
if (!process.argv.includes("--apply")) {
  console.error("Dry run: use --apply to create the gallery tables in the explicitly configured database.");
  console.log(await readFile(new URL("./gallery-schema.sql", import.meta.url), "utf8"));
  process.exit(0);
}
const url = process.env.TURSO_URL || process.env.DATABASE_URL;
if (!url) throw new Error("Set TURSO_URL or DATABASE_URL explicitly before applying the gallery migration.");
const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
const transaction = await client.transaction("write");
try {
  const sql = await readFile(fileURLToPath(new URL("./gallery-schema.sql", import.meta.url)), "utf8");
  await transaction.executeMultiple(sql);
  const row = (await transaction.execute("SELECT schema_version, revision FROM BlogGalleryMeta WHERE id = 1")).rows[0];
  if (Number(row?.schema_version) !== 1) throw new Error("Unexpected gallery schema version; no changes were committed.");
  await transaction.commit();
  console.log(JSON.stringify({ gallerySchema: Number(row.schema_version), revision: String(row.revision), applied: true }));
} finally {
  transaction.close();
  client.close();
}
