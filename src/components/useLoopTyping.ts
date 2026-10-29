"use client";
import { useEffect, useState, type RefObject } from "react";

export default function useLoopTyping(lines: readonly string[], active: boolean, region: RefObject<HTMLElement | null>, timing = "terminal") {
  const [text, setText] = useState<string>(lines[0]);
  useEffect(() => {
    if (!active) return;
    const node = region.current;
    let line = 0, cursor = 0, deleting = false, visible = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const name = timing === "name";
    const schedule = (delay: number) => { if (visible && !document.hidden) timer = setTimeout(tick, delay); };
    const tick = () => {
      timer = undefined;
      const characters = Array.from(lines[line]);
      if (!deleting && cursor < characters.length) { cursor++; setText(characters.slice(0, cursor).join("")); schedule(name ? 96 : 58); }
      else if (!deleting) { deleting = true; schedule(name ? 1500 : 1250); }
      else if (cursor > 0) { cursor--; setText(characters.slice(0, cursor).join("")); schedule(name ? 46 : 32); }
      else { deleting = false; line = (line + 1) % lines.length; schedule(360); }
    };
    const sync = () => {
      clearTimeout(timer); timer = undefined;
      node?.style?.setProperty("--typing-play-state", visible && !document.hidden ? "running" : "paused");
      schedule(58);
    };
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); });
    if (node) observer.observe(node);
    document.addEventListener("visibilitychange", sync);
    return () => { observer.disconnect(); clearTimeout(timer); node?.style?.setProperty("--typing-play-state", "paused"); document.removeEventListener("visibilitychange", sync); };
  }, [lines, active, region, timing]);
  return active ? text : lines[0];
}
