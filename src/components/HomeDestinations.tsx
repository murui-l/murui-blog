"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GalleryImage, GallerySnapshot } from "@/lib/gallery-types";
import Icon from "./Icon";

function TileBackground({ image, onError }: { image: GalleryImage; onError: () => void }) {
  const [displayed, setDisplayed] = useState<{ image: GalleryImage; previous: GalleryImage | null }>({ image, previous: null });
  useEffect(() => {
    if (image.id === displayed.image.id && image.src === displayed.image.src) return;
    let cancelled = false;
    const loader = new window.Image();
    const show = async () => {
      try { await loader.decode(); } catch { /* Display a loaded image when decode is unavailable. */ }
      if (!cancelled && loader.naturalWidth) setDisplayed(previous => previous.image.id === image.id && previous.image.src === image.src ? previous : { image, previous: previous.image });
    };
    loader.onload = () => { void show(); };
    loader.onerror = () => { if (!cancelled) onError(); };
    loader.src = image.src;
    if (loader.complete && loader.naturalWidth) void show();
    return () => { cancelled = true; loader.onload = null; loader.onerror = null; };
  }, [image, onError, displayed.image.id, displayed.image.src]);
  useEffect(() => {
    if (!displayed.previous) return;
    const timer = window.setTimeout(() => setDisplayed(current => ({ ...current, previous: null })), 950);
    return () => window.clearTimeout(timer);
  }, [displayed.image, displayed.previous]);
  return <span className="hb-tile-background" aria-hidden="true">
    {displayed.previous && <img key={`previous-${displayed.previous.id}`} src={displayed.previous.src} alt="" className="hb-tile-background-outgoing" />}
    <img key={displayed.image.id} src={displayed.image.src} alt="" className={displayed.previous ? "hb-tile-background-incoming" : ""} onError={onError} />
  </span>;
}

const destinations = [
  { href: "/gallery", className: "gallery", title: "照片墙", description: "", icon: "image" },
  { href: "/notes", className: "notes", title: "生活随笔", description: "翻开我的手记", icon: "book" },
  { href: "/megumin", className: "megumin", title: "惠惠的小屋", description: "每日一句与爆裂魔法", glyph: "✦" },
  { href: "/changelog", className: "log", title: "小窝成长记", description: "记录每一次变化", glyph: "✿" },
] as const;

function DestinationTile({ destination, gallery, index }: { destination: typeof destinations[number]; gallery: GallerySnapshot; index: number }) {
  const [currentId, setCurrentId] = useState(gallery.images[index % Math.max(1, gallery.images.length)]?.id ?? "");
  const [failedIds, setFailedIds] = useState<string[]>([]);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [interacting, setInteracting] = useState(false);
  const bag = useRef<string[]>([]);
  const available = useMemo(() => gallery.images.filter(image => !failedIds.includes(image.id)), [gallery.images, failedIds]);
  const current = available.find(image => image.id === currentId) ?? available[index % Math.max(1, available.length)];
  const next = useCallback(() => {
    const valid = new Set(available.map(image => image.id));
    bag.current = bag.current.filter(id => valid.has(id) && id !== current?.id);
    if (!bag.current.length) {
      bag.current = available.map(image => image.id).filter(id => id !== current?.id);
      for (let position = bag.current.length - 1; position > 0; position--) {
        const other = Math.floor(Math.random() * (position + 1));
        [bag.current[position], bag.current[other]] = [bag.current[other], bag.current[position]];
      }
    }
    const id = bag.current.pop();
    if (id) setCurrentId(id);
  }, [available, current?.id]);
  const imageFailed = useCallback(() => {
    if (current) setFailedIds(ids => ids.includes(current.id) ? ids : [...ids, current.id]);
    bag.current = [];
  }, [current]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    const frame = requestAnimationFrame(() => {
      update();
      const image = gallery.images[Math.floor(Math.random() * gallery.images.length)];
      if (image) setCurrentId(image.id);
    });
    media.addEventListener("change", update);
    return () => { cancelAnimationFrame(frame); media.removeEventListener("change", update); };
    // Start with deterministic server images; randomize only after hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (reducedMotion || interacting || available.length < 2) return;
    const timer = window.setInterval(() => { if (!document.hidden) next(); }, 7000);
    return () => window.clearInterval(timer);
  }, [reducedMotion, interacting, available.length, next]);
  const description = destination.className === "gallery" ? `${gallery.categories.length} 个相册 · ${gallery.images.length} 张照片` : destination.description;
  return <Link href={destination.href} className={`hb-tile hb-tile-${destination.className} hb-glass${current ? " hb-tile-photo" : ""}`} onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocus={() => setInteracting(true)} onBlur={() => setInteracting(false)}>
    {current && <TileBackground image={current} onError={imageFailed} />}
    <span className="hb-tile-icon" aria-hidden="true">{"icon" in destination ? <Icon name={destination.icon} size={29} /> : destination.glyph}</span>
    <span className="hb-tile-copy">{destination.title}<small>{description}</small></span>
    <Icon name="upRight" size={20} />
  </Link>;
}

export default function HomeDestinations({ initialGallery }: { initialGallery: GallerySnapshot }) {
  const [gallery, setGallery] = useState(initialGallery);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const response = await fetch("/api/gallery", { signal: controller.signal, cache: "no-store", credentials: "omit" });
        if (!response.ok) return;
        const data = await response.json() as GallerySnapshot;
        if (Array.isArray(data.images) && Array.isArray(data.categories)) setGallery(data);
      } catch { /* Keep the server gallery when the connection is unavailable. */ }
    };
    void refresh();
    window.addEventListener("focus", refresh);
    return () => { controller.abort(); window.removeEventListener("focus", refresh); };
  }, []);
  return <nav className="hb-destinations" aria-label="小窝栏目">
    {destinations.map((destination, index) => <DestinationTile key={destination.href} destination={destination} gallery={gallery} index={index} />)}
  </nav>;
}
