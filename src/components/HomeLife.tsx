"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import InterestRain from "./InterestRain";
import { interestStarPath } from "./interest-star-shape";
import "./HomeLife.css";
import "./HomeLifeOpen.css";

export default function HomeLife({ children }: { children: ReactNode }) {
  // The full below-hero region remains the trigger, even during a fast jump.
  // Hiding the floating controls never unmounts or pauses unfinished stars.
  const sectionRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const region = sectionRef.current;
    if (!region) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReduced(motion.matches);
    const initial = requestAnimationFrame(syncMotion);
    const update = (active: boolean) => {
      if (!active && panelRef.current?.contains(document.activeElement)) {
        (document.activeElement as HTMLElement | null)?.blur();
      }
      setShown(active);
    };
    const observer = new IntersectionObserver(([entry]) => {
      update(entry.isIntersecting || entry.boundingClientRect.top < 0);
    }, { rootMargin: "-15% 0px -20% 0px", threshold: 0 });
    observer.observe(region);
    motion.addEventListener("change", syncMotion);
    return () => { observer.disconnect(); cancelAnimationFrame(initial); motion.removeEventListener("change", syncMotion); };
  }, []);

  return <div ref={sectionRef} id="home-life" className="home-below-hero">
    <aside ref={panelRef} className="home-favorites" data-visible={shown} aria-labelledby="home-favorites-title" aria-hidden={!shown} inert={!shown}>
      <h2 id="home-favorites-title">我的喜欢</h2>
      <button type="button" className="ml-rain-dismiss home-favorites__star" aria-label="让星星消散" title="让星星消散" aria-controls="murui-interest-stars" aria-disabled="true" disabled={reduced}>
        <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path d={interestStarPath} /><path className="home-favorites__shine" d="M49 13l-7 15M22 41l10 2" /></svg>
      </button>
      <button type="button" className="ml-rain-replay home-favorites__replay" aria-label="再落一次" title="再落一次" aria-controls="murui-interest-stars" disabled={reduced}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 7v5h-5M20 12a8 8 0 1 0-2.4 5.7" /></svg>
      </button>
      <InterestRain sectionRef={sectionRef} />
    </aside>
    {children}
  </div>;
}
