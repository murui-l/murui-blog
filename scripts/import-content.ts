// Run against a migrated EMPTY destination. Administrator accounts are kept separate.
import {readFile} from "node:fs/promises";
import {getPayload} from "payload";
import config from "../src/payload.config";
import {mediaStore} from "../src/lib/media-store";
const file=process.argv[2];if(!file)throw new Error("Usage: node --env-file=.env.local --import tsx scripts/import-content.ts backup.json");
const backup=JSON.parse(await readFile(file,"utf8"));
if(backup.format!=="murui-payload"||backup.version!==1||!Array.isArray(backup.posts)||!Array.isArray(backup.media))throw new Error("Unsupported backup format");
const payload=await getPayload({config});
if((await payload.count({collection:"posts",trash:true})).totalDocs||(await payload.count({collection:"media"})).totalDocs)throw new Error("Destination must contain no posts or media. Restore into a new database.");
const ids=new Map<string,number>();
for(const item of backup.media){
  const data=Buffer.from(item.base64,"base64");
  const created=await payload.create({collection:"media",data:{alt:item.alt||item.filename},file:{data,name:item.filename,mimetype:item.mimeType,size:data.length}});
  // Keep the original bytes: avoid an extra lossy WebP encode during restoration.
  await(await mediaStore()).execute({sql:"UPDATE BlogMediaBlob SET data=?,mime=? WHERE filename=?",args:[data,item.mimeType,created.filename!]});
  await payload.update({collection:"media",id:created.id,data:{filesize:data.length}});
  ids.set(String(item.id),created.id);
}
function imageID(value:unknown){if(value==null)return null;const id=typeof value==="object"?(value as {id:unknown}).id:value;const mapped=ids.get(String(id));if(!mapped)throw new Error(`Missing media relationship ${id}`);return mapped;}
function remap(value:unknown):unknown{
  if(Array.isArray(value))return value.map(remap);
  if(!value||typeof value!=="object")return value;
  const node=Object.fromEntries(Object.entries(value).map(([k,v])=>[k,remap(v)]));
  if(node.relationTo==="media"&&"value"in node)node.value=imageID(node.value);
  return node;
}
const postData=(post:Record<string,unknown>)=>{
  const {title,slug,excerpt,category,tags,featured,publishedAt,_status,createdAt,updatedAt,deletedAt}=post;
  return {title,slug,excerpt,category,tags,featured,publishedAt,_status,createdAt,updatedAt,deletedAt,cover:imageID(post.cover),content:remap(post.content)};
};
for(const post of backup.posts){
  const base=post._published||post;
  const created=await payload.create({collection:"posts",draft:base._status!=="published",data:postData(base) as never});
  if(post._published&&post._status!=="published")await payload.update({collection:"posts",id:created.id,draft:true,data:postData(post) as never});
}
const {name,author,tagline,description,about,email,github}=backup.settings;
await payload.updateGlobal({slug:"site-settings",data:{name,author,tagline,description,about,email,github,avatar:imageID(backup.settings.avatar)}});
console.log(`Restored ${backup.posts.length} posts and ${backup.media.length} media files. Verify before changing DNS.`);
await payload.destroy();process.exit(0);
