import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {mediaURL,versionRichTextMedia} from "../src/lib/media-url";
const base=process.env.TEST_URL||"http://localhost:3127";
if(new URL(base).hostname!=="localhost")throw new Error("Cache mutation tests require an isolated localhost database");
const account=JSON.parse(await readFile(new URL("../../local-test-account.json",import.meta.url),"utf8"));
const content=(text:string)=>({root:{type:"root",version:1,direction:null,format:"",indent:0,children:[{type:"paragraph",version:1,direction:null,format:"",indent:0,textFormat:0,textStyle:"",children:[{type:"text",version:1,text,detail:0,format:0,mode:"normal",style:""}]}]}});

test("replacement media changes URLs in covers and rich text without mutating source",()=>{
  const before={url:"/api/media/file/avatar.webp",updatedAt:"2026-09-14T00:00:00.000Z"};
  const after={...before,updatedAt:"2026-09-14T00:00:01.000Z"};
  assert.notEqual(mediaURL(before),mediaURL(after));
  const input={root:{children:[{type:"upload",relationTo:"media",value:after}]}};
  const mapped=versionRichTextMedia(input) as typeof input;
  assert.equal(mapped.root.children[0].value.url,mediaURL(after));
  assert.equal(input.root.children[0].value.url,after.url);
});

test("production cache follows publication, edits, slug changes, trash and settings",async()=>{
  const login=await fetch(base+"/api/users/login",{method:"POST",headers:{"Content-Type":"application/json",Origin:base},body:JSON.stringify(account)});
  assert.equal(login.status,200);const token=(await login.json()).token;
  async function mutate(path:string,data:unknown){const r=await fetch(base+path,{method:path==="/api/posts"||path.startsWith("/api/globals/")?"POST":"PATCH",headers:{Authorization:`JWT ${token}`,"Content-Type":"application/json",Origin:base},body:JSON.stringify(data)});assert.ok(r.ok,`${path}: ${r.status}`);return r.json();}
  async function expectPage(path:string,marker:string,present:boolean,status=200){
    for(let i=0;i<30;i++){const r=await fetch(base+path);const text=await r.text();if(r.status===status&&text.includes(marker)===present)return;await new Promise(resolve=>setTimeout(resolve,100));}
    assert.fail(`Cache failed to update ${path}: ${marker} present=${present}, status=${status}`);
  }
  const slug=`cache-${Date.now()}`,renamed=slug+"-renamed",title="cache-public-"+slug;
  for(const path of ["/","/notes","/archive","/feed.xml","/sitemap.xml"])await fetch(base+path);
  const draft=(await mutate("/api/posts",{title,slug,category:"生活随笔",content:content("private-cache-draft"),_status:"draft"})).doc;
  await expectPage(`/posts/${slug}`,"private-cache-draft",false,404);
  await mutate(`/api/posts/${draft.id}`,{_status:"published",content:content("cached-public-body")});
  for(const path of ["/","/notes","/archive","/feed.xml"])await expectPage(path,title,true);
  await expectPage("/sitemap.xml",slug,true);
  await expectPage(`/posts/${slug}`,"cached-public-body",true);
  const warm=await fetch(base+`/posts/${slug}`);assert.equal(warm.headers.get("x-nextjs-cache"),"HIT","Public article should be served from the production route cache");
  await mutate(`/api/posts/${draft.id}?draft=true`,{_status:"draft",content:content("private-autosave-content")});
  await expectPage(`/posts/${slug}`,"cached-public-body",true);
  await expectPage(`/posts/${slug}`,"private-autosave-content",false);
  const preview=await fetch(base+`/preview/${draft.id}`,{headers:{Authorization:`JWT ${token}`}});assert.ok((await preview.text()).includes("private-autosave-content"));
  const anonymousPreview=await fetch(base+`/preview/${draft.id}`,{redirect:"manual"});assert.equal(anonymousPreview.status,307);assert.match(anonymousPreview.headers.get("cache-control")||"",/no-store/);
  await mutate(`/api/posts/${draft.id}`,{_status:"published",slug:renamed,content:content("edited-public-body")});
  await expectPage(`/posts/${slug}`,"cached-public-body",false,404);
  await expectPage(`/posts/${renamed}`,"edited-public-body",true);
  await mutate(`/api/posts/${draft.id}`,{deletedAt:new Date().toISOString()});
  for(const path of ["/","/notes","/archive","/feed.xml"])await expectPage(path,title,false);
  await expectPage(`/posts/${renamed}`,"edited-public-body",false,404);
  await expectPage("/sitemap.xml",renamed,false);
  const settingsMarker="cache-site-settings-"+slug;
  await mutate("/api/globals/site-settings",{tagline:settingsMarker});
  await expectPage("/",settingsMarker,true);
});
