import { getPublicPosts, getSettings } from "@/lib/db";
import { getGallerySnapshot } from "@/lib/gallery-store";
import { toKeepsakePosts } from "@/lib/keepsakes";
import KeepsakeProvider from "@/components/KeepsakeProvider";
import Header from "@/components/Header";
import SiteFooter from "@/components/SiteFooter";
import AdminTools from "@/components/writing/AdminTools";
import MusicPlayer from "@/components/MusicPlayer";
import TeyvatAudioBridge from "@/components/TeyvatAudioBridge";
import RotatingBackground from "@/components/RotatingBackground";
import type { Metadata, Viewport } from "next";
import "../globals.css";
import "@/components/GlassTheme.css";
export const revalidate=300;
export const viewport: Viewport={themeColor:"#f7f7ef"};
export async function generateMetadata():Promise<Metadata>{
  const s=await getSettings();
  const tabName=s.name.endsWith("🐷")?s.name:`${s.name}🐷`;
  return {metadataBase:new URL(process.env.SITE_URL||"https://muruiwen.cn"),title:{default:tabName,template:`%s · ${tabName}`},description:s.description,icons:{icon:[{url:"/site-pig-32.png?v=663f7394d8b2",type:"image/png",sizes:"32x32"},{url:"/icon.svg?v=663f7394d8b2",type:"image/svg+xml",sizes:"any"}],apple:[{url:"/site-pig-180.png?v=663f7394d8b2",sizes:"180x180",type:"image/png"}]},alternates:{types:{"application/rss+xml":"/feed.xml"}},openGraph:{type:"website",locale:"zh_CN",siteName:tabName,title:tabName,description:s.description}};
}
export default async function BlogLayout({ children }: { children: React.ReactNode }) {
  const [s, posts, gallery] = await Promise.all([getSettings(), getPublicPosts(), getGallerySnapshot()]);
  return <html lang="zh-CN" data-scroll-behavior="smooth"><body className="blog-glass"><RotatingBackground /><a className="skip-link" href="#main">跳到正文</a><KeepsakeProvider posts={toKeepsakePosts(posts)} initialGallery={gallery}><Header><AdminTools /></Header>{children}<SiteFooter name={s.name} author={s.author} year={new Date().getFullYear()} gallery={gallery}/><MusicPlayer /><TeyvatAudioBridge /></KeepsakeProvider></body></html>;
}
