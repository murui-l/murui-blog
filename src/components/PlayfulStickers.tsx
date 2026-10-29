"use client";
/* eslint-disable @next/next/no-img-element */
// Peel geometry adapted from React Bits StickerPeel. See licenses/playful-react-bits-LICENSE.md.
import { useId, type CSSProperties } from "react";
import "./PlayfulStickers.css";

type StickerKind = "cat" | "starfish" | "flower";
type StickerCorner = "top-left" | "top-right" | "bottom-right";
const tilts: Record<StickerKind, string> = { cat: "-10deg", starfish: "12deg", flower: "-7deg" };

/** Decorative paper corner: it never intercepts a card's pointer or keyboard input. */
export default function CornerSticker({ kind, corner }: { kind: StickerKind; corner: StickerCorner }) {
  const id = useId().replaceAll(":", "");
  const vars = { "--cs-tilt": tilts[kind], "--cs-shadow": `url(#${id}-shadow)`, "--cs-fill": `url(#${id}-fill)`, "--cs-light": `url(#${id}-light)` } as CSSProperties;
  return <span className={`corner-sticker corner-sticker-${corner}`} data-sticker={kind} style={vars} aria-hidden="true">
    <svg width="0" height="0" focusable="false"><defs>
      <filter id={`${id}-shadow`} x="-35%" y="-35%" width="170%" height="180%"><feDropShadow dx="1" dy="4" stdDeviation="3" floodColor="#6e7192" floodOpacity=".24" /></filter>
      <filter id={`${id}-fill`}><feFlood floodColor="#dfd5e8" /><feComposite in2="SourceAlpha" operator="in" /></filter>
      <filter id={`${id}-light`}><feGaussianBlur in="SourceAlpha" stdDeviation="2" result="soft" /><feSpecularLighting in="soft" surfaceScale="2" specularConstant=".18" specularExponent="30" lightingColor="#ffffff" result="light"><fePointLight x="30" y="5" z="150" /></feSpecularLighting><feComposite in="light" in2="SourceAlpha" operator="in" result="shine" /><feComposite in="SourceGraphic" in2="shine" operator="arithmetic" k1="0" k2="1" k3=".12" k4="0" /></filter>
    </defs></svg>
    <span className="cs-peel">
      <span className="cs-main"><span className="cs-light"><img src={`/images/playful/${kind}.svg`} width="64" height="64" alt="" draggable={false} /></span></span>
      <span className="cs-flap"><img src={`/images/playful/${kind}.svg`} width="64" height="64" alt="" draggable={false} /></span>
    </span>
  </span>;
}
