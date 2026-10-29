"use client";
import {useState} from "react";
export default function Backup(){
  const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
  async function download(){
    setBusy(true);setMessage("正在收集文章与设置…");
    try{
      const get=async(url:string)=>{const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw new Error(r.status===401?"登录已过期，请重新登录":"备份未完成，请重试");return r;};
      const settings=await(await get("/api/blog-backup?kind=settings")).json();
      const collect=async(kind:string)=>{const docs:Record<string,unknown>[]=[];let page=1;while(true){const r=await(await get(`/api/blog-backup?kind=${kind}&page=${page}`)).json();docs.push(...r.docs);if(!r.hasNextPage)break;page++;}return docs;};
      const posts=await collect("posts"),media=await collect("media");
      for(let i=0;i<media.length;i++){
        setMessage(`正在备份图片 ${i+1} / ${media.length}…`);
        const item=media[i],blob=await(await get(`/api/media/file/${encodeURIComponent(String(item.filename))}`)).blob();
        item.base64=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(",")[1]);r.onerror=reject;r.readAsDataURL(blob);});
      }
      const blob=new Blob([JSON.stringify({format:"murui-payload",version:1,exportedAt:new Date().toISOString(),settings,posts,media},null,2)],{type:"application/json"});
      const href=URL.createObjectURL(blob),a=document.createElement("a");a.href=href;a.download=`murui-blog-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
      setMessage(`备份已下载：${posts.length} 篇文章、${media.length} 张图片。`);
    }catch(e){setMessage(e instanceof Error?e.message:"下载失败，请重试");}finally{setBusy(false);}
  }
  return <><button className="button primary" disabled={busy} onClick={download}>{busy?"正在导出…":"下载完整内容备份 ↓"}</button><p role="status">{message}</p></>;
}
