import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile,writeFile} from "node:fs/promises";
import sharp from "sharp";
const base=process.env.TEST_URL||"http://localhost:3100";
// This suite deliberately mutates ONLY the disposable local database.
if(new URL(base).hostname!=="localhost")throw new Error("Use localhost for mutation tests");
const account=JSON.parse(await readFile(new URL("../../local-test-account.json",import.meta.url),"utf8"));
let token="";
async function req(path:string,method="GET",data?:unknown,auth=false){
  const r=await fetch(base+path,{method,headers:{...(data instanceof FormData?{}:{"Content-Type":"application/json"}),...(auth?{Authorization:`JWT ${token}`}:{})},body:data===undefined?undefined:data instanceof FormData?data:JSON.stringify(data),redirect:"manual"});
  const raw=await r.text();let body;try{body=JSON.parse(raw);}catch{body=raw;}return {r,body};
}
const content=(text:string)=>({root:{type:"root",version:1,direction:null,format:"",indent:0,children:[{type:"paragraph",version:1,direction:null,format:"",indent:0,textFormat:0,textStyle:"",children:[{type:"text",version:1,text,detail:0,format:0,mode:"normal",style:""}]}]}});
test("CMS publishing, access boundaries, persistent media and backup",async()=>{
  for(const path of ["/","/archive","/about","/posts/welcome-home","/admin/login","/feed.xml","/sitemap.xml"]){const {r}=await req(path);assert.equal(r.status,200,path);}
  for(const path of ["/api/blog-backup?kind=posts","/api/users"]){const {r}=await req(path);assert.ok([401,403].includes(r.status),path);}
  assert.equal((await req("/api/posts","POST",{title:"Unauthorized"})).r.status,403);
  const login=await req("/api/users/login","POST",account);assert.equal(login.r.status,200);token=login.body.token;assert.ok(token);
  const slug=`test-${Date.now()}`;
  const draft=await req("/api/posts?draft=true","POST",{title:"Test draft",slug,category:"测试",content:content("private-draft-marker"),_status:"draft"},true);assert.equal(draft.r.status,201);const id=draft.body.doc.id;
  assert.equal((await req(`/posts/${slug}`)).r.status,404);
  assert.equal((await req(`/api/posts/${id}?draft=true`)).r.status,404);
  assert.equal((await req(`/preview/${id}`)).r.status,307);
  const publish=await req(`/api/posts/${id}`,"PATCH",{_status:"published",content:content("public-marker")},true);assert.equal(publish.r.status,200);
  assert.ok((await req(`/posts/${slug}`)).body.includes("public-marker"));
  const saved=await req(`/api/posts/${id}?draft=true`,"PATCH",{title:"unpublished-edit-marker",content:content("unpublished-body-marker"),_status:"draft"},true);assert.equal(saved.r.status,200);
  const publicDraftQuery=await req(`/api/posts/${id}?draft=true`);assert.ok(!JSON.stringify(publicDraftQuery.body).includes("unpublished-body-marker"),"anonymous draft query leaks autosave");
  assert.ok(!(await req(`/posts/${slug}`)).body.includes("unpublished-body-marker"));
  const versions=await req(`/api/posts/versions?where[parent][equals]=${id}`,"GET",undefined,true);assert.equal(versions.r.status,200);assert.ok(versions.body.totalDocs>=2);
  assert.ok([401,403].includes((await req("/api/posts/versions")).r.status));
  const bytes=await sharp({create:{width:32,height:32,channels:3,background:"#526b4e"}}).png().toBuffer();
  const form=new FormData();form.set("_payload",JSON.stringify({alt:"测试图片"}));form.set("file",new Blob([new Uint8Array(bytes)],{type:"image/png"}),`test-${Date.now()}.png`);
  const uploaded=await req("/api/media","POST",form,true);assert.equal(uploaded.r.status,201,JSON.stringify(uploaded.body));
  const img=await fetch(base+`/api/media/file/${uploaded.body.doc.filename}`);assert.equal(img.status,200);assert.equal(img.headers.get("content-type"),"image/webp");assert.ok((await img.arrayBuffer()).byteLength>0);
  const keep=await req("/api/posts","POST",{title:"published-with-pending-draft",slug:`${slug}-pending`,category:"测试",cover:uploaded.body.doc.id,content:content("public-edition"),_status:"published"},true);assert.equal(keep.r.status,201);
  assert.equal((await req(`/api/posts/${keep.body.doc.id}?draft=true`,"PATCH",{content:content("pending-edition"),_status:"draft"},true)).r.status,200);
  assert.equal((await req(`/api/posts/${id}`,"PATCH",{deletedAt:null,_status:"draft"},true)).r.status,200);
  assert.equal((await req(`/posts/${slug}`)).r.status,404,"withdraw hides the published page");
  const remove=await req(`/api/posts/${id}`,"PATCH",{deletedAt:new Date().toISOString()},true);assert.equal(remove.r.status,200);
  assert.equal((await req(`/posts/${slug}`)).r.status,404);
  assert.equal((await req(`/api/posts/${id}?trash=true`)).r.status,404);
  const collect=async(kind:string)=>{let page=1;const docs=[];while(true){const {body,r}=await req(`/api/blog-backup?kind=${kind}&page=${page}`,"GET",undefined,true);assert.equal(r.status,200);docs.push(...body.docs);if(!body.hasNextPage)break;page++;}return docs;};
  const posts=await collect("posts"),media=await collect("media"),settings=(await req("/api/blog-backup?kind=settings","GET",undefined,true)).body;
  assert.ok(posts.some(p=>p.id===id&&p.deletedAt));
  assert.ok(posts.some(p=>p.id===keep.body.doc.id&&p._published?._status==="published"),"backup preserves public edition and pending draft");
  for(const item of media){const r=await fetch(base+`/api/media/file/${item.filename}`);assert.equal(r.status,200);item.base64=Buffer.from(await r.arrayBuffer()).toString("base64");}
  const backup={format:"murui-payload",version:1,settings,posts,media};assert.ok(!JSON.stringify(backup).includes(account.password));
  await writeFile(new URL("../../test-backup.json",import.meta.url),JSON.stringify(backup));
  console.log(`Verified published/draft/trash access, versions, image storage, backup (${posts.length} posts, ${media.length} images).`);
});
