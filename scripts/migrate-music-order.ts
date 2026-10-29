import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client";
const sql = await readFile(new URL("./music-order-schema.sql", import.meta.url), "utf8");
if (!process.argv.includes("--apply")) { console.log(sql); process.exit(0); }
const url = process.env.TURSO_URL || process.env.DATABASE_URL;
if (!url) throw new Error("Configure the target database explicitly before --apply.");
const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
const transaction = await client.transaction("write");
try {
  await transaction.executeMultiple(sql);
  const row = (await transaction.execute("SELECT schema_version, revision FROM BlogMusicOrder WHERE id = 1")).rows[0];
  if (Number(row?.schema_version) !== 1) throw new Error("Unexpected music-order schema; migration not committed.");
  await transaction.commit();
  console.log(JSON.stringify({ schema: Number(row.schema_version), revision: String(row.revision), applied: true }));
} finally { transaction.close(); client.close(); }
