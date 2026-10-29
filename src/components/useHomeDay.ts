"use client";
import { useSyncExternalStore } from "react";
import { getHomeDay, type HomeDay } from "@/lib/home-daily";

let snapshot: HomeDay | null = null;
let timer: ReturnType<typeof setInterval> | undefined;
const subscribers = new Set<() => void>();
function tick() { snapshot = getHomeDay(); subscribers.forEach(listener => listener()); }
function visibilityChanged() {
  clearInterval(timer); timer = undefined;
  if (!document.hidden) { tick(); timer = setInterval(tick, 1000); }
}
function subscribe(listener: () => void) {
  subscribers.add(listener);
  if (subscribers.size === 1) { document.addEventListener("visibilitychange", visibilityChanged); visibilityChanged(); }
  return () => { subscribers.delete(listener); if (!subscribers.size) { clearInterval(timer); timer = undefined; document.removeEventListener("visibilitychange", visibilityChanged); snapshot = null; } };
}
export default function useHomeDay() { return useSyncExternalStore(subscribe, () => snapshot, () => null); }
