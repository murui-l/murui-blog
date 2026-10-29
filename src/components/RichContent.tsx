import { createElement } from "react";
import { RichText, type JSXConvertersFunction } from "@payloadcms/richtext-lexical/react";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { versionRichTextMedia } from "@/lib/media-url";
import SoftImage from "./SoftImage";

const journalConverters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  heading: ({ node, nodesToJSX }) => createElement(node.tag, {
    id: (node as typeof node & { journalAnchor?: string }).journalAnchor,
    tabIndex: -1,
  }, nodesToJSX({ nodes: node.children })),
  upload: args => {
    const { node } = args;
    const media = typeof node.value === "object" ? node.value as { url?: string; width?: number; height?: number; alt?: string; mimeType?: string } : null;
    if (node.relationTo !== "media" || !media?.url || !media.mimeType?.startsWith("image/")) {
      const fallback = defaultConverters.upload;
      return typeof fallback === "function" ? fallback(args) : fallback;
    }
    return <SoftImage className="aj-body-image" src={media.url} alt={typeof node.fields?.alt === "string" ? node.fields.alt : media.alt || ""}
      width={media.width || 1600} height={media.height || 1000} sizes="(max-width: 650px) calc(100vw - 64px), (max-width: 1050px) calc(100vw - 140px), 740px" />;
  },
});

export default function RichContent({ data, journal = false }: { data: SerializedEditorState; journal?: boolean }) {
  return <RichText className={journal ? "prose aj-prose" : "prose"} data={versionRichTextMedia(data) as SerializedEditorState} converters={journal ? journalConverters : undefined} />;
}
