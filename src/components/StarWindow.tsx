"use client";

import { useEffect, useId, useRef } from "react";
import type { Container } from "@tsparticles/engine";
import "./StarWindow.css";

let loaded: Promise<typeof import("@tsparticles/engine")> | undefined;
function engine() {
  loaded ??= Promise.all([import("@tsparticles/engine"), import("@tsparticles/slim")]).then(async ([module, { loadSlim }]) => { await loadSlim(module.tsParticles); return module; }).catch(error => { loaded = undefined; throw error; });
  return loaded;
}

// A decorative layer inside the existing radio card, with no separate UI.
export default function RadioStarlight() {
  const surface = useRef<HTMLDivElement>(null);
  const id = useId().replaceAll(":", "");
  useEffect(() => {
    const target = surface.current;
    const root = target?.closest<HTMLElement>(".homepage-music");
    if (!root || !target) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let inView = false, disposed = false, loading = false, failed = false;
    let container: Container | undefined;
    const shouldPlay = () => !document.hidden && inView && !motion.matches;
    const start = async () => {
      loading = true;
      try {
        const { tsParticles } = await engine();
        if (disposed) return;
        const created = await tsParticles.load({ id: "murui-radio-stars-" + id, element: target, options: {
          fullScreen: { enable: false }, autoPlay: false, fpsLimit: 30, detectRetina: false, pauseOnBlur: true, pauseOnOutsideViewport: true,
          background: { color: "transparent" },
          particles: { number: { value: 22 }, color: { value: ["#ce91b5", "#94b3d4", "#baa0d4"] }, shape: { type: "star" }, opacity: { value: { min: .18, max: .48 } }, size: { value: { min: 1.5, max: 3 } }, move: { enable: true, speed: .18, outModes: { default: "out" } }, links: { enable: false } },
          interactivity: { events: { onHover: { enable: false }, onClick: { enable: false } } },
        } });
        if (disposed) { created?.destroy(); return; }
        container = created;
        if (shouldPlay()) container?.play(); else container?.pause();
      } catch { failed = true; /* Static stars remain if loading is unavailable. */ }
      finally { loading = false; }
    };
    const update = () => {
      if (disposed) return;
      if (!shouldPlay()) container?.pause();
      else if (container) container.play();
      else if (!loading && !failed) void start();
    };
    const observer = new IntersectionObserver(entries => { inView = entries.some(entry => entry.isIntersecting); update(); });
    observer.observe(root);
    document.addEventListener("visibilitychange", update); motion.addEventListener("change", update);
    return () => { disposed = true; observer.disconnect(); document.removeEventListener("visibilitychange", update); motion.removeEventListener("change", update); container?.destroy(); };
  }, [id]);
  return <div className="hm-radio-starlight" aria-hidden="true">
    <div ref={surface} className="hm-radio-stars-canvas" />
    <div className="hm-radio-stars-static">{[0, 1, 2, 3, 4, 5, 6].map(index => <span key={index} style={{ left: (8 + index * 13) + "%", top: (17 + index % 3 * 28) + "%" }}>✧</span>)}</div>
  </div>;
}
