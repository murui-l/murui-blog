"use client";

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { GallerySnapshot } from "@/lib/gallery-types";
import type { KeepsakePost } from "@/lib/keepsakes";
import "./Keepsakes.css";

export type KeepsakePanel = "search" | "book";
type ContextValue = { open: (panel: KeepsakePanel, trigger?: HTMLElement) => void };
const Context = createContext<ContextValue | null>(null);
const Panels = dynamic(() => import("./KeepsakePanels"), { ssr: false, loading: () => <span className="mk-loading" role="status">正在打开小抽屉…</span> });
export function useKeepsakes() { const context = useContext(Context); if (!context) throw new Error("KeepsakeProvider is required"); return context; }

export default function KeepsakeProvider({ children, posts, initialGallery }: { children: ReactNode; posts: KeepsakePost[]; initialGallery: GallerySnapshot }) {
  const [panel, setPanel] = useState<KeepsakePanel | null>(null);
  const [gallery, setGallery] = useState(initialGallery);
  const returnFocus = useRef<HTMLElement | null>(null);
  const path = usePathname();
  const currentPath = useRef(path);
  const close = useCallback(() => setPanel(null), []);
  const open = useCallback((next: KeepsakePanel, trigger?: HTMLElement) => {
    returnFocus.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setPanel(next);
  }, []);
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || (!event.ctrlKey && !event.metaKey) || event.altKey || event.repeat) return;
      if (document.querySelector("dialog[open]")) return;
      const target = event.target;
      if (target instanceof Element && target.closest("input,textarea,select,[contenteditable='true']")) return;
      event.preventDefault(); open("search");
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open]);
  useEffect(() => {
    if (currentPath.current === path) return;
    currentPath.current = path;
    const frame = requestAnimationFrame(close);
    return () => cancelAnimationFrame(frame);
  }, [path, close]);
  useEffect(() => {
    if (!panel) return;
    const controller = new AbortController();
    void fetch("/api/gallery", { cache: "no-store", signal: controller.signal }).then(response => response.ok ? response.json() : null).then((value: GallerySnapshot | null) => {
      if (!controller.signal.aborted && value && Array.isArray(value.categories) && Array.isArray(value.images)) setGallery(value);
    }).catch(() => {});
    return () => controller.abort();
  }, [panel]);
  return <Context.Provider value={{ open }}>{children}{panel && <Panels key={panel} panel={panel} onClose={close} returnFocus={returnFocus} posts={posts} gallery={gallery} />}</Context.Provider>;
}

export function KeepsakeButton({ panel, children, className }: { panel: KeepsakePanel; children: ReactNode; className?: string }) {
  const { open } = useKeepsakes();
  return <button type="button" className={className ?? "mk-entry"} aria-haspopup="dialog" onClick={event => open(panel, event.currentTarget)}>{children}</button>;
}
