import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const base=process.env.TEST_URL||'http://localhost:3127';
if(new URL(base).hostname!=='localhost')throw new Error('Only run against disposable local data');
test('published Chinese article links render their content and metadata',async()=>{
  const account=JSON.parse(await readFile(new URL('../../local-test-account.json',import.meta.url),'utf8'));
  const login=await fetch(base+'/api/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify(account)});
  assert.equal(login.status,200);
  const cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
  const slug=`对人生的愿望-${Date.now()}`,title='中文链接回归测试',text='这段文字应该能在发布后的文章页读到。';
  const content={root:{type:'root',version:1,direction:null,format:'',indent:0,children:[{type:'paragraph',version:1,direction:null,format:'',indent:0,children:[{type:'text',version:1,text,detail:0,format:0,mode:'normal',style:''}]}]}};
  const created=await fetch(base+'/api/posts',{method:'POST',headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({title,slug,category:'生活随笔',content,_status:'published'})});
  assert.equal(created.status,201,await created.clone().text());
  for(const path of [`/posts/${encodeURIComponent(slug)}`,`/posts/${slug}`]){
    const page=await fetch(base+path);const html=await page.text();assert.equal(page.status,200,path);assert.ok(html.includes(text));assert.ok(html.includes(`<title>${title}`));
  }
});
