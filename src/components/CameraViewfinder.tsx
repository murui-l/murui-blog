"use client";

import { useLayoutEffect, useRef } from "react";
import "./CameraViewfinder.css";

/** A measured overlay: the original lightbox image and its layout stay intact. */
export default function CameraViewfinder({ imageSelector }: { imageSelector: string }) {
  const frame = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const node = frame.current;
    const dialog = node?.closest("dialog");
    const image = dialog?.querySelector<HTMLImageElement>(imageSelector);
    if (!node || !dialog || !image) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const measure = () => {
      const rect = image.getBoundingClientRect();
      node.style.left = `${rect.left}px`; node.style.top = `${rect.top}px`;
      node.style.width = `${rect.width}px`; node.style.height = `${rect.height}px`;
      node.dataset.ready = String(dialog.open && rect.width > 0 && rect.height > 0);
    };
    const visibility = () => { node.dataset.quiet = String(document.hidden || motion.matches); if (!document.hidden) measure(); };
    visibility(); measure();
    const initial = requestAnimationFrame(measure);
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
    observer?.observe(image);
    image.addEventListener("load", measure);
    dialog.addEventListener("scroll", measure, { passive: true });
    dialog.addEventListener("toggle", measure);
    window.addEventListener("resize", measure);
    document.addEventListener("visibilitychange", visibility);
    motion.addEventListener("change", visibility);
    return () => {
      cancelAnimationFrame(initial); observer?.disconnect(); image.removeEventListener("load", measure);
      dialog.removeEventListener("scroll", measure); dialog.removeEventListener("toggle", measure);
      window.removeEventListener("resize", measure); document.removeEventListener("visibilitychange", visibility); motion.removeEventListener("change", visibility);
    };
  }, [imageSelector]);
  return <span ref={frame} className="camera-viewfinder" data-ready="false" data-quiet="true" aria-hidden="true">
    <i className="camera-viewfinder__corner camera-viewfinder__corner--tl" /><i className="camera-viewfinder__corner camera-viewfinder__corner--tr" />
    <i className="camera-viewfinder__corner camera-viewfinder__corner--bl" /><i className="camera-viewfinder__corner camera-viewfinder__corner--br" />
  </span>;
}
