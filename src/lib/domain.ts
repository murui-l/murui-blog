import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
export type PostStatus = "DRAFT" | "PUBLISHED" | "TRASH";
export type Post = {
  id: string; slug: string; title: string; excerpt: string; content: string;
  category: string; tags: string[]; cover: string; coverWidth?: number; coverHeight?: number; status: PostStatus; featured: boolean;
  createdAt: string; updatedAt: string; publishedAt: string | null; revision: number; richContent?: SerializedEditorState;
};
export type Settings = {
  name: string; author: string; tagline: string; description: string; about: string;
  avatar: string; email: string; github: string; revision: number;
};
export const defaults: Settings = {
  name: "沐瑞的小窝", author: "沐瑞", tagline: "把日子写慢一点。",
  description: "一些生活的切片，一些慢慢长出的想法。欢迎来到沐瑞的小窝。",
  about: "## 嗨，欢迎来到我的小窝。\n\n这里是沐瑞的小窝，一个用文字安放生活与想法的地方。\n\n我想把值得记住的瞬间、偶然冒出的灵感，以及一路上的小小发现，慢慢收集在这里。\n\n愿你在这里找到片刻轻松，也欢迎常来坐坐。",
  avatar: "", email: "", github: "", revision: 0,
};
export function plainText(markdown: string) {
  return markdown.replace(/```[\s\S]*?```/g, " ").replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[#*_>`~|]/g, "").replace(/\s+/g, " ").trim();
}
export function readingTime(content: string) { return Math.max(1, Math.ceil(plainText(content).length / 450)); }
export function formatDate(value: string | null, short = false) {
  if (!value) return "未发布";
  return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: short ? "2-digit" : "long", day: "numeric" }).format(new Date(value));
}
export function slugFromTitle(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-|-$/g, "").slice(0, 80).replace(/-$/, "") || `note-${Date.now().toString(36)}`;
}
export function lexicalText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const node=value as {text?:unknown;children?:unknown[];root?:unknown};
  if (typeof node.text==="string") return node.text;
  if (node.root) return lexicalText(node.root);
  return (node.children||[]).map(lexicalText).join(" ").trim();
}
