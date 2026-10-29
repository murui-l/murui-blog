"use client";

import { useMemo, useRef } from "react";
import ScratchCard, { Brushes, Covers } from "react-scratchcard-v2";

type Size = { width: number; height: number };

/** Only this lazily loaded surface owns the canvas; the accessible text stays outside. */
export default function MoodScratchSurface({ size, active, getSnapshot, onSnapshot, onComplete, onReady, onError }: {
  size: Size;
  active: boolean;
  getSnapshot: () => HTMLCanvasElement | null;
  onSnapshot: (canvas: HTMLCanvasElement) => void;
  onComplete: () => void;
  onReady: () => void;
  onError: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const cover = useMemo(() => Covers.image(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}"><defs><linearGradient id="p" x2="1" y2="1"><stop stop-color="#f4dbe8"/><stop offset=".6" stop-color="#f0dce9"/><stop offset="1" stop-color="#dce9f5"/></linearGradient><pattern id="d" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r=".65" fill="#fff" opacity=".65"/></pattern></defs><rect width="100%" height="100%" rx="17" fill="url(#p)"/><rect width="100%" height="100%" rx="17" fill="url(#d)"/><rect x="8" y="8" width="${size.width - 16}" height="${size.height - 16}" rx="12" fill="none" stroke="#fff" stroke-dasharray="4 5" opacity=".85"/><g fill="#83647f" text-anchor="middle" font-family="system-ui, sans-serif"><text x="50%" y="36%" font-size="28" fill="#ba829f">✧</text><text x="50%" y="56%" font-size="17" font-weight="600">今日心情</text><text x="50%" y="73%" font-size="11">收一份今天的小心情</text></g></svg>`)}`), [size.width, size.height]);
  const brush = useMemo(() => Brushes.circle(22), []);
  const remember = () => {
    const canvas = host.current?.querySelector<HTMLCanvasElement>("canvas");
    if (canvas) onSnapshot(canvas);
  };
  return <div ref={host} className="mood-scratch-surface" aria-hidden="true" onMouseLeave={remember}>
    <ScratchCard width={size.width} height={size.height} pixelRatio={1} cover={cover} brush={brush}
      enabled={active} finishPercent={48} scratchInterval={90} onComplete={onComplete}
      onScratchEnd={remember} onScratch={remember} onError={onError}
      onReady={() => {
        const canvas = host.current?.querySelector<HTMLCanvasElement>("canvas");
        const context = canvas?.getContext("2d");
        const snapshot = getSnapshot();
        if (canvas && context && snapshot) {
          context.save();
          context.globalCompositeOperation = "copy";
          context.drawImage(snapshot, 0, 0, canvas.width, canvas.height);
          context.restore();
        }
        onReady();
      }} canvasProps={{ tabIndex: -1, "aria-hidden": true }} />
  </div>;
}
