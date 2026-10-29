import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";

export type WritingMedia = { id: number; url?: string | null; alt: string; filename?: string | null; updatedAt: string };
export type WritingPost = {
  id: number; title: string; slug: string; category: string; excerpt?: string | null;
  tags?: string[] | null; cover?: WritingMedia | number | null;
  content: SerializedEditorState; _status?: "draft" | "published" | null; updatedAt: string;
};

// Keep the same Lexical document format as the CMS, including links and image references.
export function unpopulateMedia(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(unpopulateMedia);
  if (!value || typeof value !== "object") return value;
  const node = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, unpopulateMedia(child)]));
  if ((node.relationTo === "media" || node.relationTo === "private-media") && node.value && typeof node.value === "object" && "id" in node.value) node.value = node.value.id;
  return node;
}

export async function writingRequest(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    ...options, credentials: "same-origin", cache: "no-store",
    headers: { ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...options.headers },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (/\/login$/.test(path)) throw new Error(data?.errors?.map((error: { message: string }) => error.message).join("；") || "登录未成功，请检查账号、密码后重试。");
    if (response.status === 401 || response.status === 403) throw new Error("登录已失效，请重新登录后再保存。当前输入仍保留在本页。");
    if (response.status === 413) throw new Error("图片太大了，请选择 3 MB 以内的图片。");
    throw new Error(data?.errors?.map((error: { message: string }) => error.message).join("；") || "操作未完成，请检查网络后重试。");
  }
  return data;
}
