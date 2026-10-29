"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type JSX } from "react";
import { LexicalComposer } from "@payloadcms/richtext-lexical/lexical/react/LexicalComposer";
import { RichTextPlugin } from "@payloadcms/richtext-lexical/lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@payloadcms/richtext-lexical/lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@payloadcms/richtext-lexical/lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@payloadcms/richtext-lexical/lexical/react/LexicalOnChangePlugin";
import { ListPlugin } from "@payloadcms/richtext-lexical/lexical/react/LexicalListPlugin";
import { LexicalErrorBoundary } from "@payloadcms/richtext-lexical/lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext";
import { DecoratorBlockNode, type SerializedDecoratorBlockNode } from "@payloadcms/richtext-lexical/lexical/react/LexicalDecoratorBlockNode";
import { HeadingNode, QuoteNode, $createHeadingNode, $createQuoteNode } from "@payloadcms/richtext-lexical/lexical/rich-text";
import { ListNode, ListItemNode, INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND } from "@payloadcms/richtext-lexical/lexical/list";
import { $setBlocksType } from "@payloadcms/richtext-lexical/lexical/selection";
import { LinkNode, AutoLinkNode, HorizontalRuleNode } from "@payloadcms/richtext-lexical/client";
import { $applyNodeReplacement, $getNodeByKey, $getRoot, $getSelection, $setSelection, $isRangeSelection, $insertNodes, $createParagraphNode, FORMAT_TEXT_COMMAND, UNDO_COMMAND, REDO_COMMAND, type NodeKey, type SerializedEditorState, type ElementFormatType, type BaseSelection } from "@payloadcms/richtext-lexical/lexical";
import { mediaURL } from "@/lib/media-url";
import type { WritingMedia } from "@/lib/writing";
import MediaPicker from "./MediaPicker";

type ImageData = SerializedDecoratorBlockNode & { type: "upload"; relationTo: "media" | "private-media"; value: WritingMedia | number; fields: Record<string, never>; id?: string };
class WritingImageNode extends DecoratorBlockNode {
  __data: ImageData;
  static getType() { return "upload"; }
  static clone(node: WritingImageNode) { return new WritingImageNode(node.__data, node.__format, node.__key); }
  constructor(data: ImageData, format?: ElementFormatType, key?: NodeKey) { super(format, key); this.__data = data; }
  static importJSON(data: ImageData) { return $applyNodeReplacement(new WritingImageNode(data, data.format)); }
  exportJSON(): ImageData { return { ...this.__data, ...super.exportJSON(), type: "upload", version: 3 }; }
  decorate(): JSX.Element { return <ImageBlock data={this.__data} nodeKey={this.getKey()} />; }
}
function ImageBlock({ data, nodeKey }: { data: ImageData; nodeKey: NodeKey }) {
  const [editor] = useLexicalComposerContext();
  const media = typeof data.value === "object" ? data.value : null;
  return <figure className="writer-inline-image" contentEditable={false}>
    {media ? <img src={mediaURL(media)} alt={media.alt} /> : <p>图片 #{data.value as number}</p>}
    <figcaption>{media?.alt}<button type="button" onClick={() => editor.update(() => { $getNodeByKey(nodeKey)?.remove(); })}>移除配图</button></figcaption>
  </figure>;
}
function Toolbar({ disabled, privateMode }: { disabled: boolean; privateMode: boolean }) {
  const [editor] = useLexicalComposerContext();
  const selection = useRef<BaseSelection | null>(null);
  const [picker, setPicker] = useState(false);
  useEffect(() => { editor.setEditable(!disabled); }, [editor, disabled]);
  function block(kind: string) {
    editor.update(() => {
      const current = $getSelection();
      if ($isRangeSelection(current)) $setBlocksType(current, () => kind === "heading" ? $createHeadingNode("h2") : kind === "quote" ? $createQuoteNode() : $createParagraphNode());
    });
  }
  return <><fieldset disabled={disabled} className="writer-toolbar" aria-label="正文格式">
    <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}><b>加粗</b></button>
    <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}><i>斜体</i></button>
    <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => block("paragraph")}>正文</button>
    <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => block("heading")}>小标题</button>
    <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => block("quote")}>引用</button>
    <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}>列表</button>
    <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}>编号</button>
    <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => { editor.getEditorState().read(() => { selection.current = $getSelection()?.clone() ?? null; }); setPicker(true); }}>＋ 正文配图</button>
    <button type="button" aria-label="撤销" onMouseDown={e => e.preventDefault()} onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}>↶</button>
    <button type="button" aria-label="重做" onMouseDown={e => e.preventDefault()} onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}>↷</button>
  </fieldset>{picker && <MediaPicker privateMode={privateMode} onClose={() => setPicker(false)} onSelect={media => {
    editor.update(() => {
      // Restore the insertion point after interacting with the upload dialog.
      const saved = selection.current;
      if ($isRangeSelection(saved)) {
        const anchor = $getNodeByKey(saved.anchor.key), focus = $getNodeByKey(saved.focus.key);
        if (anchor && focus) $setSelection(saved.clone());
      }
      const current = $getSelection();
      if (!current) $getRoot().selectEnd();
      $insertNodes([$applyNodeReplacement(new WritingImageNode({ type: "upload", version: 3, format: "", relationTo: privateMode ? "private-media" : "media", value: media, fields: {}, id: crypto.randomUUID() }))]);
      const paragraph = $createParagraphNode();
      $insertNodes([paragraph]);
      paragraph.selectEnd();
    });
    setPicker(false);
  }} />}</>;
}

export default function WritingEditor({ initialContent, onChange, onError, disabled, privateMode = false }: { initialContent?: SerializedEditorState; onChange: (content: SerializedEditorState) => void; onError: (error: Error) => void; disabled: boolean; privateMode?: boolean }) {
  return <LexicalComposer initialConfig={{ namespace: "murui-front-writing", nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, AutoLinkNode, HorizontalRuleNode, WritingImageNode],
    editorState: initialContent ? JSON.stringify(initialContent) : undefined,
    onError, theme: { text: { bold: "writer-bold", italic: "writer-italic", underline: "writer-underline", strikethrough: "writer-strike" } },
  }}><Toolbar disabled={disabled} privateMode={privateMode} /><div className="writer-editor-area"><RichTextPlugin contentEditable={<ContentEditable className="writer-editor prose" aria-label="文章正文" aria-placeholder="今天有什么值得记住的小事？" placeholder={<span className="writer-placeholder">今天有什么值得记住的小事？</span>} />} ErrorBoundary={LexicalErrorBoundary} /></div><HistoryPlugin /><ListPlugin /><OnChangePlugin ignoreSelectionChange onChange={state => onChange(state.toJSON())} /></LexicalComposer>;
}
