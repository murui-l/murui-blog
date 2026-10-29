let disposeCurrent: (() => void) | undefined;
let lastBurst = 0;
let generation = 0;

/** A short, user-triggered effect with its own canvas and a finite lifetime. */
export async function showPlayfulStars(origin?: { x: number; y: number }): Promise<void> {
  if (typeof window === "undefined" || document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const now = Date.now();
  if (now - lastBurst < 650) return;
  lastBurst = now;
  const version = generation;
  const { default: confetti } = await import("canvas-confetti");
  if (version !== generation || document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  disposeCurrent?.();
  const canvas = document.createElement("canvas");
  canvas.className = "murui-playful-stars";
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "40" });
  canvas.setAttribute("aria-hidden", "true");
  // Native dialogs live in the top layer; their export celebration belongs
  // inside that layer so the backdrop cannot hide it.
  (document.querySelector("dialog[open]") ?? document.body).append(canvas);
  const launch = confetti.create(canvas, { resize: true, useWorker: false });
  let ended = false;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const clean = () => {
    if (ended) return;
    ended = true;
    window.clearTimeout(timer);
    launch.reset();
    canvas.remove();
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("pagehide", clean);
    motion.removeEventListener("change", clean);
    if (disposeCurrent === clean) disposeCurrent = undefined;
  };
  const visibility = () => { if (document.hidden) clean(); };
  disposeCurrent = clean;
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("pagehide", clean, { once: true });
  motion.addEventListener("change", clean);
  const timer = window.setTimeout(clean, 2600);
  await Promise.resolve(launch({ particleCount: window.innerWidth < 700 ? 24 : 38, spread: 62, startVelocity: 20, gravity: .8, ticks: 105, scalar: .8, colors: ["#f0a9ca", "#a8d7eb", "#d0b8ed", "#f7dda7"], shapes: ["star"], disableForReducedMotion: true, origin: origin ?? { x: .5, y: .62 } })).finally(clean);
}

export function stopPlayfulStars() { generation++; disposeCurrent?.(); }
