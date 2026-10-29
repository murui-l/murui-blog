"use client";

import dynamic from "next/dynamic";
import { Command } from "cmdk";
import { useEffect, useId, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { findItems, type KeepsakePost } from "@/lib/keepsakes";
import type { GallerySnapshot } from "@/lib/gallery-types";
import type { KeepsakePanel } from "./KeepsakeProvider";

const MemoryBook = dynamic(() => import("./MemoryBook"), { ssr: false, loading: () => <p role="status">正在翻开回忆册…</p> });
function visible(node: HTMLElement | null) { if (!node?.isConnected || node.closest("[inert],[aria-hidden='true']")) return false; const rect = node.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight; }

export default function KeepsakePanels({ panel, posts, gallery, onClose, returnFocus }: { panel: KeepsakePanel; posts: KeepsakePost[]; gallery: GallerySnapshot; onClose: () => void; returnFocus: RefObject<HTMLElement | null> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const router = useRouter();
  const items = useMemo(() => findItems(posts, gallery), [posts, gallery]);
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    const previous = returnFocus.current;
    document.querySelectorAll<HTMLDialogElement>("dialog[open]").forEach(other => { if (other !== node) other.close("switch"); });
    node.returnValue = ""; node.showModal();
    const focusFrame = requestAnimationFrame(() => { if (node.open && panel === "search") node.querySelector<HTMLInputElement>("input")?.focus(); });
    const closed = () => {
      // Native close events are queued. Ignore a cleanup event from a previous
      // effect generation if this same dialog has already been opened again.
      if (node.open) return;
      if (node.returnValue !== "switch" && visible(previous)) previous?.focus({ preventScroll: true });
      onClose();
    };
    node.addEventListener("close", closed);
    return () => { cancelAnimationFrame(focusFrame); node.removeEventListener("close", closed); if (node.open) node.close("switch"); };
  }, [onClose, panel, returnFocus]);
  const close = () => dialog.current?.close();
  const select = (href: string) => { if (dialog.current) dialog.current.returnValue = "navigate"; close(); router.push(href); };
  const titles = { search: "小窝寻物盒", book: "翻页回忆册" };
  let content: ReactNode;
  if (panel === "search") content = <>
    <p className="mk-intro">找一篇文字，或去喜欢的角落坐坐。</p>
    <Command label="搜索小窝公开内容" loop filter={(value, search, keywords = []) => {
      const terms = search.normalize("NFKC").toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
      const haystack = `${value} ${keywords.join(" ")}`.normalize("NFKC").toLocaleLowerCase();
      return terms.every(term => haystack.includes(term)) ? 1 : 0;
    }}>
      <Command.Input placeholder="试试：心海、照片、生活随笔…" aria-label="搜索公开文章、相册和栏目" />
      <Command.List><Command.Empty>暂时没有找到，换个词试试吧。</Command.Empty>
        {["去逛逛", "相册", "公开文章"].map(group => <Command.Group key={group} heading={group}>
          {items.filter(item => item.group === group).map(item => <Command.Item key={item.id} value={`${item.label} ${item.id}`} keywords={[item.description, ...item.keywords]} onSelect={() => select(item.href)}>
            <span className="mk-result-icon" aria-hidden="true">{group === "相册" ? "▧" : group === "公开文章" ? "✎" : "⌂"}</span><span><b>{item.label}</b><small>{item.description}</small></span><span className="mk-result-arrow" aria-hidden="true">↗</span>
          </Command.Item>)}
        </Command.Group>)}
      </Command.List>
    </Command><p className="mk-search-help">只收纳公开内容</p>
  </>;
  else content = <MemoryBook gallery={gallery} posts={posts} />;
  return <dialog ref={dialog} className={`mk-dialog mk-${panel}-dialog`} aria-labelledby={titleId} onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="mk-dialog-body"><button type="button" className="mk-close" aria-label={`关闭${titles[panel]}`} autoFocus onClick={close}>×</button><p className="mk-eyebrow">MURUI / LITTLE KEEPSAKES</p><h2 id={titleId}>{titles[panel]} <span aria-hidden="true">✧</span></h2>{content}</div>
  </dialog>;
}
