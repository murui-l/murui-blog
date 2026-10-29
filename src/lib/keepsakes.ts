import type { Post } from "./domain";
import type { GallerySnapshot } from "./gallery-types";

export type KeepsakePost = { id: string; title: string; excerpt: string; href: string; category: string; keywords: string[]; date: string };
export type FindItem = { id: string; label: string; description: string; href: string; keywords: string[]; group: string };
export const keepsakeLinks: FindItem[] = [
  { id: "home", label: "回到小窝", description: "照片、音乐与生活的小片段", href: "/", keywords: ["首页", "Murui", "沐瑞"], group: "去逛逛" },
  { id: "notes", label: "沐瑞の生活随笔", description: "翻一翻公开的日常文字", href: "/notes", keywords: ["生活", "随笔", "文章"], group: "去逛逛" },
  { id: "gallery", label: "照片墙", description: "收藏的插画与喜欢的瞬间", href: "/gallery", keywords: ["相册", "图片", "照片"], group: "去逛逛" },
  { id: "megumin", label: "惠惠的小屋", description: "每日一句与爆裂魔法", href: "/megumin", keywords: ["惠惠", "素晴", "魔法"], group: "去逛逛" },
  { id: "archive", label: "文字归档", description: "按时间找回公开文章", href: "/archive", keywords: ["归档", "文章"], group: "去逛逛" },
  { id: "about", label: "关于沐瑞", description: "认识一下小窝的主人", href: "/about", keywords: ["关于", "Murui"], group: "去逛逛" },
];
export function keepsakeDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function toKeepsakePosts(posts: readonly Post[]): KeepsakePost[] {
  return posts.filter(post => post.status === "PUBLISHED").map(post => ({
    id: post.id, title: post.title, excerpt: Array.from(post.excerpt.replace(/\s+/g, " ").trim()).slice(0, 160).join(""),
    href: `/posts/${encodeURIComponent(post.slug)}`, category: post.category,
    keywords: post.tags.filter(tag => typeof tag === "string").slice(0, 12),
    date: post.publishedAt && Number.isFinite(Date.parse(post.publishedAt)) ? keepsakeDay(new Date(post.publishedAt)) : "",
  }));
}
export function findItems(posts: readonly KeepsakePost[], gallery: GallerySnapshot): FindItem[] {
  return [...keepsakeLinks, ...gallery.categories.map(album => ({ id: `album-${album.id}`, label: album.name, description: `${gallery.images.filter(image => image.categoryId === album.id).length} 张收藏图片`, href: `/gallery?album=${encodeURIComponent(album.id)}`, keywords: ["相册", "照片", "图库", album.name], group: "相册" })),
    ...posts.map(post => ({ id: `post-${post.id}`, label: post.title, description: post.excerpt || post.category, href: post.href, keywords: [post.category, ...post.keywords], group: "公开文章" }))];
}
