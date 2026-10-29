"use client";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { createPortal } from "react-dom";
import { homeProfile } from "@/lib/home-profile";
import { interestStarClip, interestStarPath } from "./interest-star-shape";
import "./InterestStars.css";

function StarFace({ interest }: { interest: string }) {
  return <>
    <svg className="ml-star-face" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d={interestStarPath} />
      <path className="ml-star-shine" d="M49 13l-7 15M22 41l10 2" />
    </svg>
    <span className="ml-star-label">{interest}</span>
  </>;
}

const starStyle = { "--interest-star-clip": interestStarClip } as CSSProperties;

export default function InterestRain({ sectionRef }: { sectionRef: RefObject<HTMLElement | null> }) {
  const stageRef = useRef<HTMLUListElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setEnabled(!preference.matches);
    const initial = window.setTimeout(sync, 0);
    preference.addEventListener("change", sync);
    return () => {
      window.clearTimeout(initial);
      preference.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const section = sectionRef.current;
    if (!enabled || !stage || !section) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    // The physics chunk loads only for the animated homepage, never for reduced motion.
    import("@/lib/interest-rain").then(({ mountInterestRain }) => {
      if (!disposed) cleanup = mountInterestRain(stage, section);
    }).catch(() => {
      // Keep every interest readable if a lazy chunk cannot be fetched.
      if (!disposed) setEnabled(false);
    });
    return () => { disposed = true; cleanup?.(); };
  }, [enabled, sectionRef]);

  if (!enabled) return (
    <ul id="murui-interest-stars" className="ml-static-interests" aria-label="兴趣收藏">
      {homeProfile.interests.map((interest, index) => (
        <li key={`${interest}-${index}`} className={`ml-rain-star ml-interest-color-${index % 5}`} style={starStyle}>
          <StarFace interest={interest} />
        </li>
      ))}
    </ul>
  );

  return createPortal(
    <ul ref={stageRef} id="murui-interest-stars" className="murui-interest-rain" data-motion="idle" aria-label="兴趣收藏，标签可拖动，或按回车弹起" inert>
      {homeProfile.interests.map((interest, index) => (
        <li key={`${interest}-${index}`} className={`ml-rain-pill ml-rain-star ml-interest-color-${index % 5}`} style={starStyle}>
          <StarFace interest={interest} />
          <button type="button" aria-label={`${interest}，第${index + 1}枚兴趣，拖动或按回车弹起`} />
        </li>
      ))}
    </ul>, document.body,
  );
}
