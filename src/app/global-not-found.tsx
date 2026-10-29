import Link from "next/link";
import Cottage from "@/components/Cottage";
import "./globals.css";
export const metadata={title:"这一页走丢了 · 沐瑞的小窝",robots:{index:false,follow:false}};
export default function NotFound(){return <html lang="zh-CN"><body><main id="main" className="not-found"><Cottage small/><span className="eyebrow">404 · A LITTLE DETOUR</span><h1>好像走到小路尽头了。</h1><p>这篇文字可能还在草稿里，也可能已经搬走。</p><Link href="/" className="button primary">回到小窝</Link></main></body></html>;}
