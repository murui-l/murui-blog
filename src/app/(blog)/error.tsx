"use client";
export default function ErrorPage({reset}:{reset:()=>void}){return <main id="main" className="not-found"><h1>小窝正在打个盹。</h1><p>暂时无法读取内容，稍后再试一下吧。</p><button className="button primary" onClick={reset}>重新加载</button></main>;}
