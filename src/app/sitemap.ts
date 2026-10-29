import type { MetadataRoute } from "next";
import { teyvatDestinations } from "@/lib/teyvat";
import { getPublicPosts } from "@/lib/db";
export const revalidate = 300;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> { const base = process.env.SITE_URL || "https://muruiwen.cn"; const posts = await getPublicPosts(); return [{url:base,priority:1},{url:`${base}/about`,priority:.5},{url:`${base}/notes`,priority:.8},{url:`${base}/archive`,priority:.7},{url:`${base}/gallery`,priority:.8},{url:`${base}/megumin`,priority:.7},...["kokomi","roxy","mahiru"].map(slug=>({url:`${base}/characters/${slug}`,priority:.7})),{url:`${base}/teyvat`,priority:.7},...teyvatDestinations.map(nation=>({url:`${base}/teyvat/${nation.slug}`,priority:.6})),{url:`${base}/changelog`,priority:.5},...posts.map(p=>({url:`${base}/posts/${encodeURIComponent(p.slug)}`,lastModified:new Date(p.updatedAt),priority:.8}))]; }
