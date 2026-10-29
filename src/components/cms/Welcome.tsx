import Link from "next/link";

export default function Welcome() {
  return <section style={{padding:"28px 32px",background:"#f0f3e9",borderRadius:12,marginBottom:32,color:"#35472f"}}>
    <p style={{fontSize:11,letterSpacing:".15em",marginTop:0}}>WELCOME HOME</p>
    <h1 style={{fontSize:28,margin:"10px 0"}}>今天，又有什么想写的？</h1>
    <p>把闪过的念头，留在自己的小天地。草稿会自动保存，发布之前可以随时预览。</p>
    <Link href="/admin/collections/posts/create" style={{display:"block",padding:"22px 20px",marginTop:20,border:"1px solid #e2d4df",borderRadius:10,background:"#fff8fc",color:"#72546f",textDecoration:"none"}}>
      <strong style={{display:"block",fontSize:19}}>写生活随笔 →</strong>
      <span style={{display:"block",marginTop:8,fontSize:13,lineHeight:1.8}}>记录今天的心情、琐事和小确幸。新文章默认分类为“生活随笔”，发布后会显示在生活随笔列表中。</span>
    </Link>
    <Link href="/admin/globals/site-settings" style={{display:"block",padding:"18px 20px",marginTop:20,border:"1px solid #cdd8c2",borderRadius:10,background:"#fff",color:"#35472f",textDecoration:"none"}}>
      <strong style={{display:"block",fontSize:17}}>更换头像 →</strong>
      <span style={{display:"block",marginTop:7,fontSize:13,lineHeight:1.8}}>为小窝换一张喜欢的头像。上传新图片或从图片库选择，保存后同步显示在首页与关于页。</span>
    </Link>
    <div style={{display:"flex",flexWrap:"wrap",gap:"16px 24px",marginTop:20}}>
      <Link href="/admin/collections/posts/create">写一篇新文章 →</Link>
      <Link href="/gallery">管理照片墙 →</Link>
      <Link href="/" target="_blank">看看小窝 ↗</Link>
      <Link href="/admin-backup">导出内容备份 ↓</Link>
      <a href="https://vercel.com/murui-ls-projects/qqfc-ranking/observability" target="_blank" rel="noopener noreferrer">查看访问与性能 ↗</a>
      <a href="https://vercel.com/murui-ls-projects/~/usage" target="_blank" rel="noopener noreferrer">查看服务用量 ↗</a>
    </div>
  </section>;
}
