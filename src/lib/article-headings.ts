import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";

export type ArticleHeading = { id: string; text: string; level: 2 | 3 };

function nodeText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const node = value as { text?: unknown; type?: unknown; children?: unknown[] };
  if (typeof node.text === "string") return node.text;
  if (node.type === "linebreak") return " ";
  return Array.isArray(node.children) ? node.children.map(nodeText).join("") : "";
}

/** Derive public anchors without changing stored editor data or heading text. */
export function prepareArticleHeadings(data: SerializedEditorState) {
  const headings: ArticleHeading[] = [];
  const used = new Set<string>();
  function visit(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== "object") return value;
    const original = value as Record<string, unknown>;
    let anchor: string | undefined;
    if (original.type === "heading" && /^h[1-6]$/.test(String(original.tag))) {
      const text = nodeText(original).replace(/\s+/g, " ").trim();
      const stem = text.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 90).replace(/-$/, "") || "untitled";
      const base = `section-${stem}`;
      anchor = base;
      for (let suffix = 2; used.has(anchor); suffix++) anchor = `${base}-${suffix}`;
      used.add(anchor);
      if (text && (original.tag === "h2" || original.tag === "h3")) {
        headings.push({ id: anchor, text, level: original.tag === "h2" ? 2 : 3 });
      }
    }
    const copy = Object.fromEntries(Object.entries(original).map(([key, child]) => [key, visit(child)]));
    return anchor ? { ...copy, journalAnchor: anchor } : copy;
  }
  return { data: visit(data) as SerializedEditorState, headings };
}
