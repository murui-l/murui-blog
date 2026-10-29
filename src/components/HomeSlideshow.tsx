"use client";
import Link from "next/link";
import { getImageProps } from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GalleryImage, GallerySnapshot } from "@/lib/gallery-types";
import Icon from "./Icon";
import PhotoTilt from "./PhotoTilt";
import SoftImage from "./SoftImage";
import { publicImageSource } from "@/lib/public-image";

const PHOTO_SIZES = "(max-width: 640px) 88vw, (max-width: 960px) 80vw, 640px";

function SlideImage({ image, onError }: { image: GalleryImage; onError: () => void }) {
  const [displayed, setDisplayed] = useState<{ image: GalleryImage; outgoing: GalleryImage | null }>({ image, outgoing: null });
  const [firstImage] = useState(image.id);

  useEffect(() => {
    if (image.id === displayed.image.id && image.src === displayed.image.src) return;
    let cancelled = false;
    const loader = new window.Image();
    const show = async () => {
      try { await loader.decode(); } catch { /* A loaded image can still be displayed when decoding is unavailable. */ }
      if (cancelled || !loader.naturalWidth) return;
      setDisplayed(previous => previous.image.id === image.id && previous.image.src === image.src ? previous : { image, outgoing: previous.image });
    };
    loader.onload = () => { void show(); };
    loader.onerror = () => { if (!cancelled) onError(); };
    // Warm exactly the responsive resource that the incoming Next image will use.
    // Keep the previous photo visible until this resource is loaded and decoded.
    const publicSource = publicImageSource(image.src);
    if (publicSource) {
      const { props } = getImageProps({ src: publicSource, width: image.width, height: image.height, alt: "", sizes: PHOTO_SIZES });
      loader.sizes = props.sizes || PHOTO_SIZES;
      loader.srcset = props.srcSet || "";
      loader.src = props.src;
    } else loader.src = image.src;
    if (loader.complete && loader.naturalWidth) void show();
    return () => { cancelled = true; loader.onload = null; loader.onerror = null; };
  }, [image, onError, displayed.image.id, displayed.image.src]);

  useEffect(() => {
    if (!displayed.outgoing) return;
    const timer = window.setTimeout(() => setDisplayed(current => ({ ...current, outgoing: null })), 950);
    return () => window.clearTimeout(timer);
  }, [displayed.image, displayed.outgoing]);

  return <>
    {displayed.outgoing && <div key={`previous-${displayed.outgoing.id}`} className="hb-slide-link hb-slide-outgoing" aria-hidden="true">
      <PhotoTilt width={displayed.outgoing.width} height={displayed.outgoing.height} disabled>
        <SoftImage src={displayed.outgoing.src} alt="" width={displayed.outgoing.width} height={displayed.outgoing.height} sizes={PHOTO_SIZES} className="hb-slide-image" fade={false} retry={false} />
      </PhotoTilt>
    </div>}
    <Link key={displayed.image.id} href={`/gallery?album=${encodeURIComponent(displayed.image.categoryId)}&image=${encodeURIComponent(displayed.image.id)}`} className={`hb-slide-link${displayed.outgoing ? " hb-slide-incoming" : ""}`} aria-label="在相册中放大查看当前图片">
      <PhotoTilt width={displayed.image.width} height={displayed.image.height}>
        <SoftImage src={displayed.image.src} alt={displayed.image.alt || "收藏图片"} width={displayed.image.width} height={displayed.image.height} sizes={PHOTO_SIZES} className="hb-slide-image" priority={displayed.image.id === firstImage} fade={!displayed.outgoing} retry={false} onError={onError} />
      </PhotoTilt>
    </Link>
  </>;
}

export default function HomeSlideshow({ initialImages }: { initialImages: GalleryImage[] }) {
  const [images, setImages] = useState(initialImages);
  const [currentId, setCurrentId] = useState(initialImages[0]?.id ?? "");
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [failedIds, setFailedIds] = useState<string[]>([]);
  const bag = useRef<string[]>([]);
  const current = images.find(image => image.id === currentId) ?? images[0];
  const available = images.filter(image => !failedIds.includes(image.id));
  const next = useCallback(() => {
    const validIds = new Set(available.map(image => image.id));
    bag.current = bag.current.filter(id => validIds.has(id) && id !== currentId);
    if (!bag.current.length) {
      bag.current = available.map(image => image.id).filter(id => id !== currentId);
      for (let i = bag.current.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag.current[i], bag.current[j]] = [bag.current[j], bag.current[i]];
      }
    }
    const id = bag.current.pop();
    if (id) setCurrentId(id);
  }, [available, currentId]);
  const imageFailed = useCallback(() => {
    if (current) setFailedIds(ids => ids.includes(current.id) ? ids : [...ids, current.id]);
    bag.current = [];
    next();
  }, [current, next]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const frame = requestAnimationFrame(() => {
      setPaused(media.matches);
      if (initialImages.length) setCurrentId(initialImages[Math.floor(Math.random() * initialImages.length)].id);
    });
    const reduceMotion = () => { if (media.matches) setPaused(true); };
    media.addEventListener("change", reduceMotion);
    return () => { cancelAnimationFrame(frame); media.removeEventListener("change", reduceMotion); };
  }, [initialImages]);

  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const response = await fetch("/api/gallery", { signal: controller.signal, credentials: "omit", cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as GallerySnapshot;
        if (Array.isArray(data.images)) { setImages(data.images); setCurrentId(id => data.images.some(image => image.id === id) ? id : data.images[0]?.id ?? ""); }
      } catch { /* Keep the initial cached gallery when offline. */ }
    };
    void refresh();
    window.addEventListener("focus", refresh);
    return () => { controller.abort(); window.removeEventListener("focus", refresh); };
  }, []);

  useEffect(() => {
    if (paused || interacting || available.length < 2) return;
    const timer = window.setInterval(() => { if (!document.hidden) next(); }, 7000);
    return () => window.clearInterval(timer);
  }, [paused, interacting, available.length, next]);

  return <section className="hb-slideshow" aria-label="收藏图片随机轮播" onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocus={() => setInteracting(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}>
    <div className="hb-slide-frame">
      {current && available.length ? <SlideImage image={current} onError={imageFailed} /> : <Link href="/gallery" className="hb-slide-empty"><Icon name="image" size={40} /><span>{images.length ? "图片暂时无法加载" : "去相册添加第一张照片"}</span></Link>}
    </div>
  </section>;
}
