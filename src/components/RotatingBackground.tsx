"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { homeBackgroundAlbumName, selectHomeBackgroundScenes, takeBackgroundScene, type BackgroundScene } from "@/lib/background-queue";
import type { GallerySnapshot } from "@/lib/gallery-types";
import "./RotatingBackground.css";
import HomePalette from "./HomePalette";

const scenes = [
  { src: "/images/backgrounds/megumin-room.webp", position: "65% 45%" },
  { src: "/images/backgrounds/kokomi-underwater.webp", position: "62% 50%" },
  { src: "/images/backgrounds/kokomi-cafe.webp", position: "58% 48%" },
  { src: "/images/backgrounds/mahiru-pool.webp", position: "50% 50%" },
];
const intervalMs = 10_000;
const galleryRefreshMs = 30_000;

function FixedBackground() {
  const [active, setActive] = useState(0);
  const images = useRef<(HTMLImageElement | null)[]>([]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setInterval> | undefined;
    const updateTimer = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
      if (document.hidden || reducedMotion.matches) return;
      timer = setInterval(() => {
        setActive((current) => {
          // Stay on a loaded scene while a slow or failed download is pending.
          for (let offset = 1; offset < scenes.length; offset++) {
            const next = (current + offset) % scenes.length;
            const image = images.current[next];
            if (image?.complete && image.naturalWidth > 0) return next;
          }
          return current;
        });
      }, intervalMs);
    };
    updateTimer();
    document.addEventListener("visibilitychange", updateTimer);
    reducedMotion.addEventListener("change", updateTimer);
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", updateTimer);
      reducedMotion.removeEventListener("change", updateTimer);
    };
  }, []);

  return (
    <div className="site-backdrop" aria-hidden="true" data-source="fixed">
      {scenes.map((scene, index) => (
        <div key={scene.src} className={`site-backdrop-scene${active === index ? " is-active" : ""}`}>
          {/* Already compressed local assets; keep the same backdrop across routes. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={(element) => { images.current[index] = element; }}
            src={scene.src}
            alt=""
            style={{ objectPosition: scene.position }}
            decoding="async"
            loading="eager"
            fetchPriority={index === 0 ? "high" : "low"}
          />
        </div>
      ))}
      <div className="site-backdrop-veil" />
    </div>
  );
}

const fallbackScenes: BackgroundScene[] = scenes.map((scene, index) => ({ ...scene, id: `fallback-${index}` }));
type Display = { current: BackgroundScene; previous: BackgroundScene | null; front: boolean };

function AlbumBackground() {
  const [display, setDisplay] = useState<Display>({ current: fallbackScenes[0], previous: null, front: true });
  const [catalog, setCatalog] = useState<{ source: string; count: number; albumId: string | null }>({ source: "fallback", count: 0, albumId: null });

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let pool = fallbackScenes;
    let poolSignature = "";
    let current = fallbackScenes[0];
    let bag: string[] = [];
    const failed = new Set<string>();
    let disposed = false;
    let busy = false;
    let version = 0;
    let timer: number | undefined;
    let refreshTimer: number | undefined;
    let fetchTimeout: number | undefined;
    let request: AbortController | undefined;
    let cancelLoad: (() => void) | undefined;

    const load = (scene: BackgroundScene) => new Promise<boolean>(resolve => {
      const image = new window.Image();
      let finished = false;
      const finish = (success: boolean) => {
        if (finished) return;
        finished = true;
        window.clearTimeout(timeout);
        image.onload = null; image.onerror = null;
        if (cancelLoad === cancel) cancelLoad = undefined;
        resolve(success);
      };
      const cancel = () => finish(false);
      const timeout = window.setTimeout(cancel, 15000);
      cancelLoad = cancel;
      const ready = async () => {
        try { await image.decode(); } catch { /* Keep a successfully loaded image if decode is unavailable. */ }
        finish(image.naturalWidth > 0);
      };
      image.onload = () => { void ready(); };
      image.onerror = cancel;
      image.src = scene.src;
      if (image.complete && image.naturalWidth) void ready();
    });

    const advance = async (force = false) => {
      if (disposed || document.hidden || busy || (!force && reducedMotion.matches)) return;
      busy = true;
      const selection = ++version;
      try {
        for (let attempt = 0; attempt < pool.length; attempt++) {
          const next = takeBackgroundScene(pool, bag, current.src, failed);
          bag = next.remaining;
          if (!next.scene) return;
          const scene = next.scene;
          const loaded = await load(scene);
          if (disposed || selection !== version) return;
          if (!loaded) { failed.add(scene.src); continue; }
          if (document.hidden || (!force && reducedMotion.matches)) return;
          current = scene;
          setDisplay(previous => ({ current: scene, previous: reducedMotion.matches ? null : previous.current, front: reducedMotion.matches }));
          return;
        }
      } finally { if (selection === version) busy = false; }
    };

    const updateTimer = () => {
      if (timer) window.clearInterval(timer);
      timer = undefined;
      if (document.hidden) return;
      if (!pool.some(scene => scene.src === current.src)) void advance(true);
      if (reducedMotion.matches || pool.length < 2) return;
      timer = window.setInterval(() => { void advance(); }, intervalMs);
    };

    const refresh = async () => {
      if (disposed || document.hidden) return;
      request?.abort();
      window.clearTimeout(fetchTimeout);
      const controller = new AbortController();
      request = controller;
      fetchTimeout = window.setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch("/api/gallery", { cache: "no-store", credentials: "omit", signal: controller.signal });
        if (!response.ok) return;
        const snapshot = await response.json() as GallerySnapshot;
        if (disposed || controller.signal.aborted || !Array.isArray(snapshot.images) || !Array.isArray(snapshot.categories)) return;
        const selected = selectHomeBackgroundScenes(snapshot);
        const nextPool = selected.scenes.length ? selected.scenes : fallbackScenes;
        const signature = JSON.stringify([selected.albumId, nextPool.map(scene => [scene.id, scene.src]).sort((a, b) => a[0].localeCompare(b[0]))]);
        if (signature === poolSignature) {
          // Retry transient image failures without restarting a healthy shuffle cycle.
          if (failed.size) { failed.clear(); if (!pool.some(scene => scene.src === current.src)) void advance(true); }
          return;
        }
        poolSignature = signature;
        version += 1; cancelLoad?.(); busy = false;
        pool = nextPool;
        bag = []; failed.clear();
        setCatalog({ source: selected.scenes.length ? "gallery-album" : "fallback", count: selected.scenes.length, albumId: selected.albumId });
        updateTimer();
      } catch { /* Keep the current picture and fallback backgrounds while offline. */ }
      finally { if (request === controller) { window.clearTimeout(fetchTimeout); fetchTimeout = undefined; } }
    };

    const updateRefreshTimer = () => {
      if (refreshTimer) window.clearInterval(refreshTimer);
      refreshTimer = undefined;
      if (!document.hidden) refreshTimer = window.setInterval(() => { void refresh(); }, galleryRefreshMs);
    };
    const visible = () => { updateTimer(); updateRefreshTimer(); if (!document.hidden) void refresh(); };
    updateTimer();
    updateRefreshTimer();
    void refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    reducedMotion.addEventListener("change", updateTimer);
    return () => {
      disposed = true; version += 1; request?.abort(); cancelLoad?.();
      if (timer) window.clearInterval(timer);
      if (refreshTimer) window.clearInterval(refreshTimer);
      window.clearTimeout(fetchTimeout);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
      reducedMotion.removeEventListener("change", updateTimer);
    };
  }, []);

  useEffect(() => {
    if (!display.previous) return;
    let secondFrame = 0;
    let timer: number | undefined;
    const frame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        setDisplay(value => ({ ...value, front: true }));
        timer = window.setTimeout(() => setDisplay(value => ({ ...value, previous: null })), 2300);
      });
    });
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(secondFrame); if (timer) window.clearTimeout(timer); };
  }, [display.current.src, display.previous]);

  return <div className="site-backdrop" aria-hidden="true" data-source={catalog.source} data-gallery-count={catalog.count} data-album-name={homeBackgroundAlbumName} data-album-id={catalog.albumId ?? undefined}>
    <HomePalette src={display.current.src} />
    {display.previous && <div key={display.previous.src} className={`site-backdrop-scene${!display.front ? " is-active" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={display.previous.src} alt="" style={{ objectPosition: display.previous.position }} data-image-id={display.previous.id} />
    </div>}
    <div key={display.current.src} className={`site-backdrop-scene${display.front ? " is-active" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={display.current.src} alt="" style={{ objectPosition: display.current.position }} decoding="async" data-image-id={display.current.id} />
    </div>
    <div className="site-backdrop-veil" />
  </div>;
}

export default function RotatingBackground() {
  const pathname = usePathname();
  if (pathname === "/teyvat" || pathname.startsWith("/teyvat/")) return null;
  return pathname === "/" ? <AlbumBackground /> : <FixedBackground />;
}
