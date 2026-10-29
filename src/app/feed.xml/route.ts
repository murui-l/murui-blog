import { getPublicPosts, getSettings } from "@/lib/db";
export const dynamic="force-static";
export const revalidate=300;
const escape = (s: string) => s.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));
export async function GET() {
  const [posts,s] = await Promise.all([getPublicPosts(),getSettings()]);
  const base = process.env.SITE_URL || "https://muruiwen.cn";
  const items = await Promise.all(posts.slice(0,30).map(async p => { return `<item><title>${escape(p.title)}</title><link>${base}/posts/${encodeURIComponent(p.slug)}</link><guid isPermaLink="true">${base}/posts/${encodeURIComponent(p.slug)}</guid><description>${escape(p.excerpt)}</description><pubDate>${new Date(p.publishedAt!).toUTCString()}</pubDate><category>${escape(p.category)}</category></item>`; }));
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escape(s.name)}</title><link>${base}</link><description>${escape(s.description)}</description><language>zh-cn</language>${items.join("")}</channel></rss>`, { headers: { "Content-Type":"application/rss+xml; charset=utf-8", "Cache-Control":"public, max-age=60" } });
}
