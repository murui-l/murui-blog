import { getPayload } from "payload";
import config from "@payload-config";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { PUBLIC_CACHE_TAG, PUBLIC_CACHE_SECONDS } from "./public-cache";
import { mediaURL } from "./media-url";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { defaults, lexicalText, type Post, type Settings } from "./domain";
export const cms=()=>getPayload({config});
export function toPost(row:Record<string,unknown>):Post{
  const cover = row.cover && typeof row.cover === "object" ? row.cover as { width?: unknown; height?: unknown } : null;
  const coverSize = typeof cover?.width === "number" && cover.width > 0 && typeof cover.height === "number" && cover.height > 0 ? { coverWidth: cover.width, coverHeight: cover.height } : {};
  return {id:String(row.id),slug:String(row.slug),title:String(row.title),excerpt:String(row.excerpt||lexicalText(row.content).slice(0,130)),content:lexicalText(row.content),richContent:row.content as SerializedEditorState|undefined,
    category:String(row.category||"随笔"),tags:Array.isArray(row.tags)?row.tags as string[]:[],cover:mediaURL(row.cover),...coverSize,status:row.deletedAt?"TRASH":row._status==="published"?"PUBLISHED":"DRAFT",featured:Boolean(row.featured),createdAt:String(row.createdAt),updatedAt:String(row.updatedAt),publishedAt:row.publishedAt?String(row.publishedAt):null,revision:0};
}
const cacheNamespace=process.env.TURSO_URL||process.env.DATABASE_URL||"file:payload-local.db";
const cacheOptions={tags:[PUBLIC_CACHE_TAG],revalidate:PUBLIC_CACHE_SECONDS};
export const getSettings=cache(unstable_cache(async():Promise<Settings>=>{
  const s=await (await cms()).findGlobal({slug:"site-settings",depth:1,overrideAccess:false});
  return {...defaults,name:s.name||defaults.name,author:s.author||defaults.author,tagline:s.tagline||defaults.tagline,description:s.description||defaults.description,about:s.about??defaults.about,avatar:mediaURL(s.avatar),email:s.email||"",github:s.github||""};
},["murui-settings-v1",cacheNamespace],cacheOptions));
export const getPublicPosts=cache(unstable_cache(async():Promise<Post[]>=>{
  const result=await (await cms()).find({collection:"posts",where:{and:[{_status:{equals:"published"}},{deletedAt:{exists:false}}]},draft:false,user:null,sort:["-featured","-publishedAt"],pagination:false,depth:1,overrideAccess:false,
    select:{id:true,slug:true,title:true,excerpt:true,category:true,tags:true,cover:true,featured:true,createdAt:true,updatedAt:true,publishedAt:true,_status:true}});
  return result.docs.map(p=>toPost(p as unknown as Record<string,unknown>));
},["murui-post-list-v2",cacheNamespace],cacheOptions));
const readPublicPost=cache(unstable_cache(async(slug:string):Promise<Post|null>=>{
  const result=await (await cms()).find({collection:"posts",where:{and:[{slug:{equals:slug}},{_status:{equals:"published"}},{deletedAt:{exists:false}}]},draft:false,user:null,limit:1,depth:1,overrideAccess:false});
  return result.docs[0]?toPost(result.docs[0] as unknown as Record<string,unknown>):null;
},["murui-post-v3",cacheNamespace],cacheOptions));
export async function getPublicPost(slug:string):Promise<Post|null>{
  // Dynamic route segments can arrive percent-encoded. Match the decoded slug
  // stored by Payload, and use the same cache key for both URL representations.
  let decoded:string;
  try { decoded=decodeURIComponent(slug); } catch { return null; }
  if(!/^[a-z0-9\u4e00-\u9fff]+(?:-[a-z0-9\u4e00-\u9fff]+)*$/.test(decoded))return null;
  return readPublicPost(decoded);
}
