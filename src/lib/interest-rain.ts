import Matter from "matter-js";
import { interestStarPoints } from "../components/interest-star-shape";

const { Bodies, Body, Composite, Constraint, Engine, Sleeping, Vertices } = Matter;
type Pill = { element: HTMLLIElement; body: Matter.Body; width: number; height: number };

export function makeInterestBody(x: number, y: number, width: number, height: number, angle: number) {
  const vertices = interestStarPoints.map(point => ({ x: point.x * width / 100, y: point.y * height / 100 }));
  // Five convex arm triangles plus the central pentagon exactly cover the
  // concave star. A single convex hull would fill the notches while stacking.
  // Explicit parts avoid a new polygon-decomposition dependency.
  const polygons = [vertices.filter((_, index) => index % 2 === 1),
    ...Array.from({ length: 5 }, (_, index) => {
      const tip = index * 2;
      return [vertices[(tip + 9) % 10], vertices[tip], vertices[(tip + 1) % 10]];
    })];
  const parts = polygons.map(polygon => {
    const centre = Vertices.centre(polygon);
    return Bodies.fromVertices(centre.x, centre.y, [polygon]);
  });
  const body = Body.create({
    parts, restitution: 0.26, friction: 0.65, frictionStatic: 1,
    frictionAir: 0.012, sleepThreshold: 75, slop: 0.2,
  });
  // Include each arm's offset in the moment of inertia so a pointed resting
  // star does not spin from tiny contact corrections between compound parts.
  Body.setInertia(body, parts.reduce((sum, part) => sum + part.inertia + part.mass * (
    (part.position.x - body.position.x) ** 2 + (part.position.y - body.position.y) ** 2
  ), 0));
  Body.setPosition(body, { x, y });
  Body.setAngle(body, angle);
  return body;
}

export function makeInterestBounds(width: number, height: number) {
  const options = { isStatic: true, friction: 0.8, restitution: 0.18 };
  return [
    Bodies.rectangle(width / 2, height + 30, width + 160, 80, options),
    Bodies.rectangle(-30, height / 2 - 600, 80, height + 1400, options),
    Bodies.rectangle(width + 30, height / 2 - 600, 80, height + 1400, options),
  ];
}

/** Resize the existing world instead of respawning its stars when mobile
 * browser chrome changes the viewport. Pending arrivals and velocities survive. */
export function resizeInterestViewport(engine: Matter.Engine, bodies: Matter.Body[], previous: { width: number; height: number }, next: { width: number; height: number }) {
  if (![previous.width, previous.height, next.width, next.height].every(value => Number.isFinite(value) && value > 0)) return false;
  for (const body of Composite.allBodies(engine.world)) if (body.isStatic) Composite.remove(engine.world, body);
  Composite.add(engine.world, makeInterestBounds(next.width, next.height));
  for (const body of bodies) {
    const halfWidth = Math.min(next.width / 2, (body.bounds.max.x - body.bounds.min.x) / 2 + 10);
    Body.setPosition(body, {
      x: Math.max(halfWidth, Math.min(next.width - halfWidth, body.position.x * next.width / previous.width)),
      y: body.position.y < 0 ? body.position.y : body.position.y + next.height - previous.height,
    });
  }
  return true;
}

type QuietPile = { steps: number; origins: { x: number; y: number; angle: number }[] };
/** Compound tips can keep waking a resting pile with subpixel solver motion.
 * Require the whole pile to stay within 1px / .02rad for 1.5 seconds. Falling
 * stars cannot pass this sustained displacement check, even at their apex. */
export function settleInterestBodies(bodies: Matter.Body[], quiet: QuietPile | null): QuietPile {
  if (!quiet || bodies.length !== quiet.origins.length || bodies.some((body, index) => {
    const origin = quiet.origins[index];
    return Math.hypot(body.position.x - origin.x, body.position.y - origin.y) > 1 || Math.abs(body.angle - origin.angle) > .02;
  })) return { steps: 0, origins: bodies.map(body => ({ ...body.position, angle: body.angle })) };
  quiet.steps++;
  if (quiet.steps >= 90) for (const body of bodies) Sleeping.set(body, true);
  return quiet;
}

export function mountInterestRain(stage: HTMLUListElement, section: HTMLElement) {
  const engine = Engine.create({ enableSleeping: true, positionIterations: 8, velocityIterations: 8 });
  const elements = Array.from(stage.querySelectorAll<HTMLLIElement>(".ml-rain-pill"));
  const replay = section.querySelector<HTMLButtonElement>(".ml-rain-replay");
  const dismiss = section.querySelector<HTMLButtonElement>(".ml-rain-dismiss");
  let pills: Pill[] = [];
  let pending: Pill[] = [];
  let elapsed = 0;
  let frame = 0;
  let previousTime = 0;
  let accumulator = 0;
  let quiet: QuietPile | null = null;
  let visible = false;
  let initialized = false;
  let width = 0;
  let height = 0;
  let resizeTimer = 0;
  let dismissTimer = 0;
  let dismissed = false;
  let destroyed = false;
  let drag: { pointerId: number; target: HTMLElement; pill: Pill; constraint: Matter.Constraint } | undefined;
  const step = 1000 / 60;

  const paint = () => {
    for (const { element, body, width: w, height: h } of pills) {
      element.style.transform = `translate3d(${(body.position.x - w / 2).toFixed(2)}px,${(body.position.y - h / 2).toFixed(2)}px,0) rotate(${body.angle.toFixed(4)}rad)`;
    }
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    accumulator = 0;
  };
  const release = () => {
    if (!drag) return;
    Composite.remove(engine.world, drag.constraint);
    drag.target.classList.remove("is-dragging");
    if (drag.target.hasPointerCapture(drag.pointerId)) drag.target.releasePointerCapture(drag.pointerId);
    drag = undefined;
  };
  const animate = (time: number) => {
    frame = 0;
    if (!initialized || document.hidden || destroyed || dismissed) return;
    accumulator += previousTime ? Math.min(time - previousTime, 50) : step;
    previousTime = time;
    while (accumulator >= step) {
      elapsed += step;
      // Staggered arrival lets each star bounce and turn before the next arrives.
      while (pending.length && elapsed >= (pills.length - pending.length) * 155) {
        const pill = pending.shift()!;
        Composite.add(engine.world, pill.body);
        pill.element.style.visibility = "visible";
      }
      Engine.update(engine, step);
      quiet = !drag && !pending.length ? settleInterestBodies(pills.map(pill => pill.body), quiet) : null;
      accumulator -= step;
    }
    paint();
    if (!drag && !pending.length && pills.every(({ body }) => body.isSleeping)) {
      stage.dataset.motion = "settled";
      return;
    }
    frame = requestAnimationFrame(animate);
  };
  const resume = () => {
    if (initialized && !document.hidden && !destroyed && !dismissed && !frame) {
      stage.dataset.motion = "falling";
      quiet = null;
      frame = requestAnimationFrame(animate);
    }
  };
  const reset = () => {
    stop();
    release();
    clearTimeout(dismissTimer);
    dismissTimer = 0;
    dismissed = false;
    stage.hidden = false;
    stage.inert = false;
    stage.dataset.visible = "true";
    delete stage.dataset.dissolving;
    dismiss?.setAttribute("aria-disabled", "false");
    Composite.clear(engine.world, false);
    Engine.clear(engine);
    const rect = stage.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    Composite.add(engine.world, makeInterestBounds(width, height));
    pills = elements.map((element, index) => {
      const w = element.offsetWidth;
      const h = element.offsetHeight;
      const x = 30 + w / 2 + ((index * 0.61803398875 + Math.random() * 0.16) % 1) * Math.max(0, width - w - 60);
      const body = makeInterestBody(x, -Math.max(w, h), w, h, (Math.random() - 0.5) * 2.6);
      Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.07);
      Body.setVelocity(body, { x: (Math.random() - 0.5) * 2.5, y: 1 });
      element.style.visibility = "hidden";
      return { element, body, width: w, height: h };
    });
    pending = [...pills];
    elapsed = 0;
    initialized = true;
    paint();
    resume();
  };
  const point = (event: PointerEvent) => {
    const rect = stage.getBoundingClientRect();
    return { x: Math.min(width - 20, Math.max(20, event.clientX - rect.left)), y: Math.min(height - 20, Math.max(20, event.clientY - rect.top)) };
  };
  const onDown = (event: PointerEvent) => {
    if (!initialized || dismissed || document.hidden || drag || event.button !== 0 || !event.isPrimary) return;
    const target = (event.target as Element).closest<HTMLButtonElement>(".ml-rain-pill button");
    const pill = pills.find(item => item.element.contains(target));
    if (!target || !pill || pending.includes(pill)) return;
    if (event.pointerType !== "touch") event.preventDefault();
    Sleeping.set(pill.body, false);
    const p = point(event);
    const constraint = Constraint.create({
      pointA: p, bodyB: pill.body,
      pointB: { x: p.x - pill.body.position.x, y: p.y - pill.body.position.y },
      stiffness: 0.18, damping: 0.15, length: 0,
    });
    Composite.add(engine.world, constraint);
    drag = { pointerId: event.pointerId, target, pill, constraint };
    target.setPointerCapture(event.pointerId);
    target.classList.add("is-dragging");
    resume();
  };
  const onMove = (event: PointerEvent) => {
    if (drag?.pointerId !== event.pointerId) return;
    drag.constraint.pointA = point(event);
    Sleeping.set(drag.pill.body, false);
  };
  const onEnd = (event: PointerEvent) => { if (drag?.pointerId === event.pointerId) release(); };
  const onKey = (event: KeyboardEvent) => {
    if (!initialized || dismissed || document.hidden || !["Enter", " ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    const pill = pills.find(item => item.element.contains(event.target as Node));
    if (!pill || pending.includes(pill)) return;
    event.preventDefault();
    Sleeping.set(pill.body, false);
    Body.setVelocity(pill.body, { x: event.key === "ArrowLeft" ? -5 : event.key === "ArrowRight" ? 5 : 0, y: -8 });
    Body.setAngularVelocity(pill.body, event.key === "ArrowLeft" ? -0.07 : 0.07);
    resume();
  };
  const syncVisibility = () => {
    if (dismissed) return;
    if (document.hidden) { release(); stop(); stage.dataset.motion = "paused"; }
    else if (initialized) resume();
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !dismissed) {
      stage.inert = false;
      stage.dataset.visible = "true";
      if (!initialized) reset();
      else resume();
    }
    // Intersection starts the rain once. Scrolling away must not freeze it,
    // hide its parent while visible children remain, or restart it on return.
  }, { rootMargin: "-15% 0px -20% 0px", threshold: 0 });
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const rect = stage.getBoundingClientRect();
      if (!initialized || dismissed || destroyed || rect.width <= 0 || rect.height <= 0) return;
      if (Math.abs(rect.width - width) <= 2 && Math.abs(rect.height - height) <= 2) return;
      // A breakpoint may actually change the star geometry; only that needs a
      // new collider. Address-bar and ordinary viewport changes retain the pile.
      if (pills.some(pill => pill.element.offsetWidth !== pill.width || pill.element.offsetHeight !== pill.height)) { reset(); return; }
      release();
      if (resizeInterestViewport(engine, pills.map(pill => pill.body), { width, height }, rect)) {
        width = rect.width; height = rect.height; paint(); resume();
      }
    }, 150);
  };
  // An explicit button action must work even before the observer has caught up
  // with focus scrolling or a newly unhidden viewport.
  const onReplay = () => { if (!document.hidden) reset(); };
  const onDismiss = () => {
    if (!initialized || dismissed || destroyed) return;
    dismissed = true;
    stop();
    release();
    pending = [];
    stage.inert = true;
    stage.dataset.dissolving = "true";
    stage.dataset.motion = "dissolving";
    dismiss?.setAttribute("aria-disabled", "true");
    dismissTimer = window.setTimeout(() => {
      if (!dismissed || destroyed) return;
      stage.hidden = true;
      stage.dataset.visible = "false";
      stage.dataset.motion = "dismissed";
      Composite.clear(engine.world, false);
      Engine.clear(engine);
      dismissTimer = 0;
    }, 500);
  };
  stage.addEventListener("pointerdown", onDown);
  stage.addEventListener("pointermove", onMove);
  stage.addEventListener("pointerup", onEnd);
  stage.addEventListener("pointercancel", onEnd);
  stage.addEventListener("lostpointercapture", onEnd);
  stage.addEventListener("keydown", onKey);
  replay?.addEventListener("click", onReplay);
  dismiss?.addEventListener("click", onDismiss);
  document.addEventListener("visibilitychange", syncVisibility);
  window.addEventListener("resize", onResize);
  observer.observe(section);

  return () => {
    destroyed = true; release(); stop(); clearTimeout(resizeTimer); clearTimeout(dismissTimer); observer.disconnect();
    stage.removeEventListener("pointerdown", onDown);
    stage.removeEventListener("pointermove", onMove);
    stage.removeEventListener("pointerup", onEnd);
    stage.removeEventListener("pointercancel", onEnd);
    stage.removeEventListener("lostpointercapture", onEnd);
    stage.removeEventListener("keydown", onKey);
    replay?.removeEventListener("click", onReplay);
    dismiss?.removeEventListener("click", onDismiss);
    document.removeEventListener("visibilitychange", syncVisibility);
    window.removeEventListener("resize", onResize);
    Composite.clear(engine.world, false); Engine.clear(engine);
  };
}
