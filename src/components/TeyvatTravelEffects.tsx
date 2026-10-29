"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { destinationFromPath, teyvatDestination } from "@/lib/teyvat";
import { teyvatVisits } from "./teyvat-visits";
import "./TeyvatTravelEffects.css";

const TRAVEL_EVENT = "murui-teyvat-travel";
type TravelRequest = { nation: string; x: number; y: number };

/** Called in the same trusted click as audio activation; never delays routing. */
export function requestTeyvatTravel(nation: string, source: HTMLElement, event: Pick<MouseEvent, "clientX" | "clientY" | "detail">) {
  if (typeof window === "undefined" || document.hidden || !teyvatDestination(nation) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const rect = source.getBoundingClientRect();
  const keyboard = event.detail === 0;
  window.dispatchEvent(new CustomEvent<TravelRequest>(TRAVEL_EVENT, { detail: {
    nation,
    x: keyboard ? rect.left + rect.width / 2 : event.clientX,
    y: keyboard ? rect.top + rect.height / 2 : event.clientY,
  } }));
}

export default function TeyvatTravelEffects() {
  const pathname = usePathname();
  const surface = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation | null>(null);
  const stop = useCallback(() => { animation.current?.cancel(); animation.current = null; }, []);

  useEffect(() => {
    // Only a committed, recognized country route earns a travel footprint.
    teyvatVisits.recordPath(pathname);
    // Keep the brief ring across the intended country navigation, but dismiss it
    // immediately if navigation leaves the country routes.
    if (!destinationFromPath(pathname)) stop();
  }, [pathname, stop]);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const clear = () => stop();
    const start = (event: Event) => {
      stop();
      const node = surface.current;
      const request = (event as CustomEvent<TravelRequest>).detail;
      const destination = request && teyvatDestination(request.nation);
      if (!node || !destination || document.hidden || motion.matches || !Number.isFinite(request.x) || !Number.isFinite(request.y) || !node.animate) return;
      node.style.left = `${Math.max(0, Math.min(window.innerWidth, request.x))}px`;
      node.style.top = `${Math.max(0, Math.min(window.innerHeight, request.y))}px`;
      node.style.setProperty("--travel-color", destination.color);
      const duration = window.matchMedia("(max-width: 760px)").matches ? 150 : 300;
      const playing = node.animate([
        { opacity: 0, transform: "translate(-50%, -50%) scale(.45) rotate(-16deg)" },
        { opacity: .9, offset: .22 },
        { opacity: 0, transform: "translate(-50%, -50%) scale(2.2) rotate(12deg)" },
      ], { duration, easing: "cubic-bezier(.18,.65,.35,1)" });
      animation.current = playing;
      playing.onfinish = () => { if (animation.current === playing) animation.current = null; };
    };
    const visibility = () => { if (document.hidden) stop(); };
    window.addEventListener(TRAVEL_EVENT, start);
    document.addEventListener("visibilitychange", visibility);
    motion.addEventListener("change", clear);
    return () => {
      stop();
      window.removeEventListener(TRAVEL_EVENT, start);
      document.removeEventListener("visibilitychange", visibility);
      motion.removeEventListener("change", clear);
    };
  }, [stop]);

  return <div ref={surface} className="teyvat-travel-ring" aria-hidden="true">
    <svg viewBox="0 0 120 120" fill="none" focusable="false">
      <circle cx="60" cy="60" r="36" />
      <circle cx="60" cy="60" r="46" strokeDasharray="24 7 3 7" />
      <path d="m60 2 5 13-5 8-5-8Zm58 58-13 5-8-5 8-5ZM60 118l-5-13 5-8 5 8ZM2 60l13-5 8 5-8 5Z" />
      <path d="m60 39 5 16 16 5-16 5-5 16-5-16-16-5 16-5Z" />
    </svg>
  </div>;
}
