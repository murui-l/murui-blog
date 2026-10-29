"use client";

import { useLayoutEffect, useRef } from "react";
import { Lrc } from "react-lrc";
import LyricText from "./LyricText";

/** React LRC handles ordinary line changes; align paused mounts/resizes too. */
export default function ScrollingMusicLyrics({ lrc, currentMillisecond }: { lrc: string; currentMillisecond: number }) {
  const host = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const container = host.current;
    if (!container) return;
    const align = () => {
      const root = container.querySelector<HTMLDivElement>(".mlp-scroll");
      const current = root?.querySelector<HTMLElement>(".is-current");
      if (!root || !current) return;
      const top = current.parentElement!.offsetTop - root.clientHeight / 2 + current.parentElement!.clientHeight / 2;
      // A newly visible/reshaped paper jumps directly to the real audio position.
      const behavior = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto"; root.scrollTop = Math.max(0, top); root.style.scrollBehavior = behavior;
    };
    align();
    const observer = new ResizeObserver(align);
    observer.observe(container);
    return () => observer.disconnect();
  }, [lrc]);

  return <div ref={host} className="mlp-scroll-host"><Lrc className="mlp-scroll" lrc={lrc} currentMillisecond={currentMillisecond}
    verticalSpace recoverAutoScrollInterval={3000} style={{ height: "100%", overflow: "hidden", scrollBehavior: "smooth" }}
    lineRenderer={({ line, active }) => <p className={`mlp-line${active ? " is-current" : ""}`} aria-current={active ? "true" : undefined}><LyricText text={line.content.trim()} sparkle /></p>} /></div>;
}
