"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Map as LeafletMap } from "leaflet";
import { teyvatMap, teyvatDestinations } from "@/lib/teyvat";
import { musicActions } from "@/lib/music-player-store";
import TeyvatLink from "./TeyvatLink";
import { teyvatVisits } from "./teyvat-visits";
import { requestTeyvatTravel } from "./TeyvatTravelEffects";
import "leaflet/dist/leaflet.css";
import "./Teyvat.css";

type View = { center: [number, number]; zoom: number; width: number };
const rememberedViews: Partial<Record<"home" | "atlas", View>> = {};

export default function TeyvatMap({ embedded = false }: { embedded?: boolean }) {
  const canvas = useRef<HTMLDivElement>(null);
  const instance = useRef<LeafletMap | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  useEffect(() => {
    let disposed = false;
    let resize: ResizeObserver | undefined;
    let visibility: IntersectionObserver | undefined;
    const cleanups: (() => void)[] = [];
    const element = canvas.current;
    const viewKey = embedded ? "home" : "atlas";
    async function mount() {
      try {
        const L = await import("leaflet");
        if (disposed || !element) return;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const bounds = L.latLngBounds([0, 0], [teyvatMap.height, teyvatMap.width]);
        const coarse = window.matchMedia("(pointer: coarse)").matches;
        const map = L.map(element, { crs: L.CRS.Simple, minZoom: -4, maxZoom: 1, zoomSnap: .1, zoomDelta: .5, zoomControl: false, attributionControl: false, maxBounds: bounds.pad(.2), maxBoundsViscosity: .9, zoomAnimation: !reduced, fadeAnimation: !reduced, markerZoomAnimation: !reduced, inertia: !reduced, scrollWheelZoom: !embedded, dragging: !embedded || !coarse, keyboard: !embedded });
        instance.current = map;
        const layer = L.imageOverlay(teyvatMap.src, bounds, { alt: "提瓦特地图", interactive: false });
        layer.on("load", () => { if (!disposed) setReady(true); });
        layer.on("error", () => { if (!disposed) setFailed(true); });
        layer.addTo(map);
        let interacted = false;
        const fit = () => {
          map.fitBounds(bounds, { padding: embedded ? [8, 25] : [22, 25], animate: false });
          if (!embedded && map.getSize().x < 600) map.setZoom(Math.max(-2.8, map.getZoom()), { animate: false });
          interacted = false;
        };
        const rememberedView = rememberedViews[viewKey];
        if (rememberedView && Math.abs(rememberedView.width - map.getSize().x) < 5) { map.setView(rememberedView.center, rememberedView.zoom, { animate: false }); interacted = true; } else fit();
        let lastDrag = -Infinity;
        map.on("dragend", () => { lastDrag = performance.now(); });
        map.on("movestart zoomstart", () => { interacted = true; });
        map.on("moveend zoomend", () => { if (disposed) return; const center = map.getCenter(); rememberedViews[viewKey] = { center: [center.lat, center.lng], zoom: map.getZoom(), width: map.getSize().x }; });
        const visitAnchors: { anchor: HTMLAnchorElement; slug: string; name: string }[] = [];
        for (const nation of teyvatDestinations) {
          if (!nation.point) continue;
          const anchor = document.createElement("a");
          anchor.dataset.nation = nation.slug;
          anchor.className = "teyvat-map-pin"; anchor.href = `/teyvat/${nation.slug}`;
          anchor.style.setProperty("--nation-accent", nation.color); anchor.setAttribute("aria-label", `前往${nation.name}`);
          visitAnchors.push({ anchor, slug: nation.slug, name: nation.name });
          const crest = document.createElement("img"); crest.src = nation.crest.src; crest.alt = ""; crest.width = 42; crest.height = 42;
          const name = document.createElement("span"); name.textContent = nation.name; anchor.append(crest, name);
          const activate = (event: MouseEvent) => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            if (performance.now() - lastDrag < 220) return;
            requestTeyvatTravel(nation.slug, anchor, event);
            musicActions.enterTeyvat(nation.slug, nation.tracks, true); router.push(`/teyvat/${nation.slug}`);
          };
          anchor.addEventListener("click", activate); cleanups.push(() => anchor.removeEventListener("click", activate));
          L.marker([teyvatMap.height * (1 - nation.point[1]), teyvatMap.width * nation.point[0]], { icon: L.divIcon({ className: "teyvat-marker", html: anchor, iconSize: [96, 78], iconAnchor: [48, 39] }), keyboard: false }).addTo(map);
        }
        const updateVisits = () => {
          const visited = teyvatVisits.getSnapshot();
          for (const { anchor, slug, name } of visitAnchors) {
            const seen = visited.includes(slug);
            anchor.dataset.visited = String(seen);
            anchor.setAttribute("aria-label", `前往${name}${seen ? "，已到访" : ""}`);
          }
        };
        cleanups.push(teyvatVisits.subscribe(updateVisits));
        updateVisits();
        const reset = () => fit();
        element.addEventListener("teyvat-reset", reset);
        cleanups.push(() => element.removeEventListener("teyvat-reset", reset));
        resize = new ResizeObserver(() => { if (disposed) return; const preserve = interacted; map.invalidateSize({ pan: false, animate: false }); if (!preserve) fit(); }); resize.observe(element);
      } catch { if (!disposed) setFailed(true); }
    }
    if (embedded && element && typeof IntersectionObserver !== "undefined") {
      visibility = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { visibility?.disconnect(); void mount(); } }, { rootMargin: "300px" });
      visibility.observe(element);
    } else void mount();
    return () => { disposed = true; visibility?.disconnect(); resize?.disconnect(); cleanups.forEach(cleanup => cleanup()); instance.current?.remove(); instance.current = null; };
  }, [router, embedded]);
  useEffect(() => {
    if (!embedded || !ready || window.location.hash !== "#home-teyvat-map") return;
    // The journal above hydrates its calendar before reaching its final height.
    // Settle a map return without pulling the visitor back after they start scrolling.
    const section = canvas.current?.closest("section");
    if (!section) return;
    let frame = 0;
    const align = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => section.scrollIntoView({ behavior: "instant", block: "start" })); };
    const observer = new ResizeObserver(align);
    const stop = () => { observer.disconnect(); cancelAnimationFrame(frame); };
    observer.observe(document.body);
    align();
    const timeout = window.setTimeout(stop, 1500);
    for (const event of ["wheel", "touchstart", "keydown"]) window.addEventListener(event, stop, { once: true, passive: true });
    return () => { stop(); window.clearTimeout(timeout); for (const event of ["wheel", "touchstart", "keydown"]) window.removeEventListener(event, stop); };
  }, [embedded, ready]);
  const Container = embedded ? "section" : "main";
  return <Container id={embedded ? "home-teyvat-map" : "main"} aria-label={embedded ? "提瓦特地图" : undefined} className={`teyvat-route teyvat-atlas${embedded ? " teyvat-atlas--embedded ms-wrap" : ""}`}>
    {!embedded && <header className="teyvat-atlas__heading"><Link href="/">← 小窝</Link><div><span>TEYVAT</span><h1>提瓦特地图</h1></div><span className="teyvat-atlas__star" aria-hidden="true">✧</span></header>}
    <div className="teyvat-atlas__frame">
      {!ready && !failed && <div className="teyvat-atlas__preview" aria-hidden="true">
        {/* The exact map image shares coordinates with its Leaflet overlay. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={teyvatMap.src} alt="" width={teyvatMap.width} height={teyvatMap.height} loading="lazy" />
      </div>}
      <div ref={canvas} className="teyvat-atlas__canvas" aria-label="提瓦特地图" />
      <TeyvatLink nation="frostmoon" className="teyvat-atlas__moon" aria-label="前往霜月"><span className="teyvat-atlas__moon-orb" aria-hidden="true" /><span>霜月</span></TeyvatLink>
      {!embedded && <span className="teyvat-atlas__compass" aria-hidden="true">N<br />✧</span>}
      <div className="teyvat-atlas__tools" role="group" aria-label="地图视图"><button type="button" aria-label="放大地图" onClick={() => instance.current?.zoomIn()}>＋</button><button type="button" aria-label="缩小地图" onClick={() => instance.current?.zoomOut()}>−</button><button type="button" aria-label="复位地图" onClick={() => canvas.current?.dispatchEvent(new Event("teyvat-reset"))}>⌖</button></div>
      {failed && <p className="teyvat-atlas__error">地图暂时未能加载</p>}
      <a className="teyvat-atlas__source" href="https://act.hoyolab.com/ys/app/interactive-map/index.html" target="_blank" rel="noopener noreferrer">地图 © HoYoverse ↗</a>
    </div>
    <nav className="teyvat-nation-tabs" aria-label="选择目的地" hidden={embedded && !failed}>{teyvatDestinations.map(nation => <TeyvatLink nation={nation.slug} key={nation.slug} style={{ borderColor: nation.color }}>{nation.name}</TeyvatLink>)}</nav>
  </Container>;
}
