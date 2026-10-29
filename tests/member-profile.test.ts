import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
const base=process.env.TEST_URL || "http://localhost:3127";
if(new URL(base).hostname!=="localhost")throw new Error("Profile mutations require disposable local data");
test("member profile persists own nickname, bio and avatar without sharing other users' data",async()=>{
  const req=(path:string,method="GET",body?:unknown,cookie="")=>fetch(base+path,{method,redirect:"manual",headers:{Origin:base,Cookie:cookie,...(body instanceof FormData?{}:{"Content-Type":"application/json"})},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body)});
  const create=async(suffix:string)=>{const credentials={username:`profile${Date.now()}${suffix}`,password:"Local-profile-test-123"};const r=await req("/api/members","POST",{...credentials,name:"原昵称"});assert.equal(r.status,201);const id=(await r.json()).doc.id;const login=await req("/api/login","POST",credentials);assert.equal(login.status,200);return {id,cookie:login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')};};
  const a=await create("a"),b=await create("b");
  assert.equal((await req('/account')).headers.get('location'),'/login');
  const form=new FormData();form.set('_payload',JSON.stringify({alt:'头像测试'}));form.set('file',new Blob([new Uint8Array(await sharp({create:{width:32,height:32,channels:3,background:'#cbdaf5'}}).png().toBuffer())],{type:'image/png'}),'avatar-test.png');
  const uploaded=await req('/api/private-media','POST',form,a.cookie);assert.equal(uploaded.status,201);const avatar=(await uploaded.json()).doc;
  const body={name:'海风来信',bio:'收藏一点可爱，也认真记录每一天。',avatar:avatar.id};
  const saved=await req(`/api/members/${a.id}`,'PATCH',body,a.cookie);assert.equal(saved.status,200,await saved.clone().text());
  const own=await (await req(`/api/members/${a.id}?depth=1`,'GET',undefined,a.cookie)).json();assert.equal(own.name,body.name);assert.equal(own.bio,body.bio);assert.equal(own.avatar.id,avatar.id);
  const sessionResponse=await req('/api/writing-session?profile=1','GET',undefined,a.cookie);
  assert.match(sessionResponse.headers.get('cache-control')||'',/private.*no-store/);
  const session=await sessionResponse.json();assert.equal(session.profile.username,own.username);assert.equal(session.profile.name,body.name);assert.ok(session.profile.avatar.includes(avatar.filename));assert.deepEqual(Object.keys(session.profile).sort(),['avatar','name','username']);
  const otherSession=await (await req('/api/writing-session?profile=1','GET',undefined,b.cookie)).json();assert.equal(otherSession.profile.avatar,'');assert.notEqual(otherSession.profile.username,own.username);
  assert.deepEqual(await (await req('/api/writing-session?profile=1')).json(),{authenticated:false,kind:null});
  const page=await req('/account','GET',undefined,a.cookie);assert.equal(page.status,200);assert.match(page.headers.get('cache-control')||'',/no-store/);const html=await page.text();assert.ok(html.includes(body.bio));assert.ok(html.includes(avatar.filename));
  const other=await req(`/api/members/${a.id}`,'PATCH',{name:'被篡改'},b.cookie);assert.ok([403,404].includes(other.status));
  const foreignAvatar=await req(`/api/members/${b.id}`,'PATCH',{avatar:avatar.id},b.cookie);assert.equal(foreignAvatar.status,400);
  for(const cookie of ['',b.cookie]){const r=await req(`/api/members/${a.id}`,'GET',undefined,cookie);assert.ok([403,404].includes(r.status));assert.ok(!(await r.text()).includes(body.bio));}
  assert.equal((await req(`/api/members/${a.id}`,'PATCH',{bio:'x'.repeat(301)},a.cookie)).status,400);
  assert.equal((await req(`/api/members/${a.id}`,'PATCH',{avatar:null},a.cookie)).status,200);
  assert.equal((await (await req(`/api/members/${a.id}`,'GET',undefined,a.cookie)).json()).avatar,null);
  assert.equal((await (await req('/api/writing-session?profile=1','GET',undefined,a.cookie)).json()).profile.avatar,'');
});
