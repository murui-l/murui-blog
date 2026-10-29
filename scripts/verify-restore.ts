import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {getPayload} from "payload";
import config from "../src/payload.config";
import {mediaStore} from "../src/lib/media-store";
if(process.env.TURSO_URL||process.env.DATABASE_URL!=="file:restore-final.db")throw new Error("Run only on the disposable restore database.");
const backup=JSON.parse(await readFile("../test-backup.json","utf8"));
const payload=await getPayload({config});
assert.equal((await payload.count({collection:"posts",trash:true})).totalDocs,backup.posts.length);
const media=await payload.find({collection:"media",pagination:false});
assert.equal(media.totalDocs,backup.media.length);
for(const original of backup.media){
  const restored=media.docs.find(x=>x.filename===original.filename);assert.ok(restored);
  const row=(await(await mediaStore()).execute({sql:"SELECT data FROM BlogMediaBlob WHERE filename=?",args:[restored.filename!]})).rows[0];
  assert.equal(Buffer.from(row.data as ArrayBuffer).toString("base64"),original.base64,"image bytes changed");
}
const pending=backup.posts.find((p:{_published?:unknown;_status:string})=>p._published&&p._status==="draft");assert.ok(pending);
const publicCopy=await payload.find({collection:"posts",where:{slug:{equals:pending.slug}},depth:1,overrideAccess:false});
assert.equal(publicCopy.docs[0]._status,"published");assert.ok(JSON.stringify(publicCopy.docs[0].content).includes("public-edition"));
assert.ok(publicCopy.docs[0].cover&&typeof publicCopy.docs[0].cover==="object");
const draftCopy=await payload.findByID({collection:"posts",id:publicCopy.docs[0].id,draft:true});
assert.equal(draftCopy._status,"draft");assert.ok(JSON.stringify(draftCopy.content).includes("pending-edition"));
const hidden=backup.posts.find((p:{deletedAt?:unknown})=>p.deletedAt);assert.ok(hidden);
assert.equal((await payload.find({collection:"posts",where:{slug:{equals:hidden.slug}},overrideAccess:false,trash:true})).totalDocs,0);
console.log("Restore verified: all posts, public edition plus pending draft, media relationships, exact image bytes, and private trash.");
await payload.destroy();process.exit(0);
