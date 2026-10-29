"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent, ReactNode } from "react";
import Tilt from "react-parallax-tilt";
import "./PhotoTilt.css";

const MOUSE_MOTION = "(min-width: 961px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

type PhotoTiltProps = {
  width: number;
  height: number;
  children: ReactNode;
  disabled?: boolean;
};

export default function PhotoTilt({ width, height, children, disabled = false }: PhotoTiltProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<Tilt>(null);
  const enabledRef = useRef(false);
  const hoveredRef = useRef(false);
  const [enabled, setEnabled] = useState(false);
  const [hovered, setHovered] = useState(false);

  const resetMotion = useCallback(() => {
    hoveredRef.current = false;
    if (hostRef.current) hostRef.current.dataset.active = "false";
    setHovered(false);
    // The pinned library exposes this reset entry point and cancels its previous frame.
    tiltRef.current?.mainLoop(new CustomEvent("autoreset"));
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const media = window.matchMedia(MOUSE_MOTION);
    let inView = !("IntersectionObserver" in window);
    let focused = document.hasFocus();
    const updateEligibility = () => {
      const next = !disabled && media.matches && inView && focused && !document.hidden && CSS.supports("width", "1cqw");
      enabledRef.current = next;
      host.dataset.enabled = String(next);
      setEnabled(next);
      if (!next) resetMotion();
    };
    const onWindowFocus = () => { focused = true; updateEligibility(); };
    const onWindowBlur = () => { focused = false; updateEligibility(); };
    const observer = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
      inView = entries.some(entry => entry.isIntersecting && entry.intersectionRatio > 0);
      updateEligibility();
    }) : null;
    const focusTarget = host.closest("a") ?? host;
    const frame = requestAnimationFrame(updateEligibility);
    observer?.observe(host);
    media.addEventListener("change", updateEligibility);
    document.addEventListener("visibilitychange", updateEligibility);
    window.addEventListener("focus", onWindowFocus);
    window.addEventListener("blur", onWindowBlur);
    focusTarget.addEventListener("focus", resetMotion);
    focusTarget.addEventListener("blur", resetMotion);

    return () => {
      enabledRef.current = false;
      hoveredRef.current = false;
      host.dataset.enabled = "false";
      host.dataset.active = "false";
      cancelAnimationFrame(frame);
      observer?.disconnect();
      media.removeEventListener("change", updateEligibility);
      document.removeEventListener("visibilitychange", updateEligibility);
      window.removeEventListener("focus", onWindowFocus);
      window.removeEventListener("blur", onWindowBlur);
      focusTarget.removeEventListener("focus", resetMotion);
      focusTarget.removeEventListener("blur", resetMotion);
      // Tilt cancels its own pending animation frame and resize listener on unmount.
    };
  }, [disabled, resetMotion]);

  const followMouse = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") { resetMotion(); return; }
    if (!enabledRef.current || hoveredRef.current) return;
    if (!(event.target instanceof Element) || !event.target.closest(".home-photo-tilt__surface")) return;
    hoveredRef.current = true;
    if (hostRef.current) hostRef.current.dataset.active = "true";
    setHovered(true);
  };
  const active = enabled && hovered && !disabled;
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 1;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 1;
  const style = {
    "--photo-ratio": safeWidth / safeHeight,
    "--photo-native-width": `${safeWidth}px`,
  } as CSSProperties;

  return <div
    ref={hostRef}
    className="home-photo-tilt"
    style={style}
    data-enabled={enabled}
    data-active={active}
    onPointerEnter={followMouse}
    onPointerMoveCapture={followMouse}
    onPointerLeave={resetMotion}
    onPointerCancel={resetMotion}
    onPointerDownCapture={event => { if (event.pointerType !== "mouse") resetMotion(); }}
    onTouchStartCapture={resetMotion}
  >
    <Tilt
      ref={tiltRef}
      className="home-photo-tilt__surface"
      tiltEnable={active}
      tiltMaxAngleX={3}
      tiltMaxAngleY={3}
      tiltAngleXManual={active ? null : 0}
      tiltAngleYManual={active ? null : 0}
      perspective={1400}
      scale={active ? 1.012 : 1}
      glareEnable
      glareMaxOpacity={active ? 0.075 : 0}
      glarePosition="all"
      glareBorderRadius="20px"
      gyroscope={false}
      trackOnWindow={false}
      reset
      transitionSpeed={360}
      transitionEasing="cubic-bezier(.2,.65,.3,1)"
      onLeave={resetMotion}
    >{children}</Tilt>
  </div>;
}
