"use client";

import { useEffect } from "react";
import { defaultHomePalette, paletteFromPixels, type HomePalette, type RGB } from "@/lib/home-palette";
import "./HomePalette.css";

const cache = new Map<string, HomePalette>();
const properties = ["--murui-paper-a", "--murui-paper-b", "--murui-accent", "--murui-highlight"];
const color = (value: RGB, alpha = 1) => `rgb(${value.join(" ")} / ${alpha})`;
export default function HomePalette({ src }: { src: string }) {
  useEffect(() => {
    const body = document.body;
    const previous = properties.map(name => [name, body.style.getPropertyValue(name), body.style.getPropertyPriority(name)]);
    const attribute = body.getAttribute("data-home-palette");
    body.setAttribute("data-home-palette", "true");
    return () => {
      previous.forEach(([name,value,priority]) => { if (value) body.style.setProperty(name,value,priority); else body.style.removeProperty(name); });
      if (attribute === null) body.removeAttribute("data-home-palette"); else body.setAttribute("data-home-palette",attribute);
    };
  }, []);
  useEffect(() => {
    let disposed = false;
    const apply = (palette: HomePalette) => {
      if (disposed) return;
      const values = [color(palette.paperA,.88),color(palette.paperB,.83),color(palette.accent),color(palette.highlight)];
      properties.forEach((name,i) => document.body.style.setProperty(name,values[i]));
    };
    const cached = cache.get(src);
    if (cached) { apply(cached); return; }
    let url: URL;
    try { url = new URL(src, location.href); } catch { apply(defaultHomePalette); return; }
    // Only sample existing same-origin public images; never send pixels elsewhere.
    if (url.origin !== location.origin) { apply(defaultHomePalette); return; }
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (disposed) return;
      try {
        const canvas = document.createElement("canvas"); canvas.width = 32; canvas.height = 32;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) { apply(defaultHomePalette); return; }
        context.drawImage(image,0,0,32,32);
        const palette = paletteFromPixels(context.getImageData(0,0,32,32).data);
        if (cache.size >= 32) cache.delete(cache.keys().next().value!);
        cache.set(src,palette); apply(palette);
      } catch { apply(defaultHomePalette); }
    };
    image.onerror = () => apply(defaultHomePalette);
    image.src = url.href;
    return () => { disposed = true; image.onload = null; image.onerror = null; };
  }, [src]);
  return null;
}
