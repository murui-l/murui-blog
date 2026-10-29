"use client";

/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { publicImageSource } from "@/lib/public-image";
import "./SoftImage.css";

export type SoftImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
  fade?: boolean;
  retry?: boolean;
  onError?: () => void;
};

function DecodedImage({ src, alt, width = 1200, height = 800, sizes = "100vw", className = "", style, priority = false, fade = true, retry = true, onError }: SoftImageProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const alive = useRef(true);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 1200;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 800;
  const publicSource = publicImageSource(src);
  const reveal = useCallback(async (image: HTMLImageElement) => {
    try { await image.decode(); } catch { /* Browsers without decode still report a valid loaded raster. */ }
    if (alive.current && imageRef.current === image && image.naturalWidth > 0) setStatus("ready");
  }, []);
  const assignImage = useCallback((image: HTMLImageElement | null) => {
    imageRef.current = image;
    if (image?.complete && image.naturalWidth) void reveal(image);
  }, [reveal]);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  const fail = () => {
    setStatus("error");
    onError?.();
  };
  const imageProps = {
    src: publicSource || src, alt, width: safeWidth, height: safeHeight, sizes,
    className: "soft-image__img", ref: assignImage,
    loading: priority ? "eager" as const : "lazy" as const,
    fetchPriority: priority ? "high" as const : "auto" as const,
    decoding: "async" as const,
    onLoad: (event: React.SyntheticEvent<HTMLImageElement>) => { void reveal(event.currentTarget); },
    onError: fail,
  };
  return <span className={`soft-image ${className}`} data-state={status} data-fade={fade} style={{ aspectRatio: `${safeWidth} / ${safeHeight}`, ...style }}>
    {publicSource
      ? <Image key={attempt} {...imageProps} alt={alt} />
      : <img key={attempt} {...imageProps} alt={alt} />}
    {status === "error" && (retry
      ? <button type="button" className="soft-image__retry" onClick={() => { setStatus("loading"); setAttempt(value => value + 1); }} aria-label={`重新加载${alt || "图片"}`}>重新加载</button>
      : <span className="soft-image__unavailable" role="img" aria-label="图片暂时无法加载" />)}
  </span>;
}

export default function SoftImage(props: SoftImageProps) {
  // Source changes reset readiness without an effect that could flash the old frame.
  return <DecodedImage key={props.src} {...props} />;
}
