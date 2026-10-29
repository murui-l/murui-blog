"use client";

import { useEffect, useRef, type ReactNode } from "react";

export default function HandDrawnMark({ children, kind = "underline", color = "#edb3cd" }: { children: ReactNode; kind?: "underline" | "circle" | "highlight"; color?: string }) {
  const target = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = target.current;
    if (!node) return;
    let disposed = false;
    let visible = false;
    let started = false;
    let loading = false;
    let frame = 0;
    let annotation: ReturnType<typeof import("rough-notation")["annotate"]> | undefined;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const load = () => {
      if (loading || disposed) return;
      loading = true;
      void import("rough-notation").then(async ({ annotate }) => {
        await document.fonts.ready;
        if (disposed) return;
        annotation = annotate(node, { type: kind, color, strokeWidth: kind === "highlight" ? 1 : 1.5, padding: kind === "circle" ? 7 : 3, multiline: true, animationDuration: 600, iterations: 1 });
        schedule();
      }).catch(() => { /* The heading remains readable without decoration. */ });
    };
    const render = () => {
      if (disposed || !visible || document.hidden) return;
      if (!annotation) { load(); return; }
      annotation.hide();
      annotation.animate = !started && !motion.matches;
      annotation.show();
      started = true;
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(render); };
    const observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      if (visible) schedule();
      else { annotation?.hide(); cancelAnimationFrame(frame); }
    }, { threshold: .3 });
    observer.observe(node);
    const size = new ResizeObserver(schedule);
    size.observe(node);
    const visibility = () => { if (document.hidden) { annotation?.hide(); cancelAnimationFrame(frame); } else schedule(); };
    document.addEventListener("visibilitychange", visibility);
    motion.addEventListener("change", schedule);
    return () => { disposed = true; observer.disconnect(); size.disconnect(); annotation?.remove(); cancelAnimationFrame(frame); document.removeEventListener("visibilitychange", visibility); motion.removeEventListener("change", schedule); };
  }, [kind, color]);
  return <span ref={target} className="murui-hand-drawn-mark" style={{ display: "inline-block", position: "relative", isolation: "isolate" }}>{children}</span>;
}
