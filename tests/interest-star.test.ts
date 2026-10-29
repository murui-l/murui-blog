import assert from "node:assert/strict";
import test from "node:test";
import Matter from "matter-js";
import { makeInterestBody, makeInterestBounds, settleInterestBodies } from "../src/lib/interest-rain";
import { homeProfile } from "../src/lib/home-profile";

test("star collider has solid arms and open notches rather than a convex hull", () => {
  const body = makeInterestBody(150, 160, 100, 100, 0);
  assert.equal(body.parts.length, 7);
  const inside = (radius: number, angle: number) => Matter.Query.point([body], {
    x: 150 + Math.cos(angle) * radius, y: 160 + Math.sin(angle) * radius,
  }).length > 0;
  assert.ok(inside(0, 0));
  for (let arm = 0; arm < 5; arm++) {
    assert.ok(inside(42, -Math.PI / 2 + arm * 2 * Math.PI / 5));
    assert.equal(inside(37, -Math.PI / 2 + (arm * 2 + 1) * Math.PI / 5), false);
  }
});

test("21 stars including six named 海星 fall into the viewport and settle", () => {
  assert.equal(homeProfile.interests.length, 21);
  assert.equal(homeProfile.interests.filter(interest => interest === "海星").length, 6);
  for (const [width, height, size] of [[320, 740, 92], [1400, 1000, 118]]) {
    const engine = Matter.Engine.create({ enableSleeping: true, positionIterations: 8, velocityIterations: 8 });
    Matter.Composite.add(engine.world, makeInterestBounds(width, height));
    const stars = homeProfile.interests.map((_, index) => makeInterestBody(60 + (index * 63) % (width - 120), -size, size, size, (index % 7 - 3) * .2));
    let arrived = 0;
    let quiet: ReturnType<typeof settleInterestBodies> | null = null;
    for (let frame = 0; frame < 2400; frame++) {
      if (arrived < stars.length && frame % 10 === 0) Matter.Composite.add(engine.world, stars[arrived++]);
      Matter.Engine.update(engine, 1000 / 60);
      quiet = arrived === stars.length ? settleInterestBodies(stars, quiet) : null;
      if (arrived === stars.length && stars.every(body => body.isSleeping)) break;
    }
    for (const body of stars) {
      assert.ok(Number.isFinite(body.position.x) && Number.isFinite(body.position.y));
      assert.ok(body.position.x > 0 && body.position.x < width);
      assert.ok(body.position.y > 0 && body.position.y < height);
      assert.ok(body.speed < .1);
    }
    assert.ok(stars.every(body => body.isSleeping), `quiet steps: ${quiet?.steps}`);
    Matter.Composite.clear(engine.world, false);
    Matter.Engine.clear(engine);
  }
});

test("quiet settling never freezes an unfinished fall", () => {
  const engine = Matter.Engine.create({ enableSleeping: true });
  const body = makeInterestBody(150, -100, 92, 92, .3);
  Matter.Composite.add(engine.world, body);
  let quiet: ReturnType<typeof settleInterestBodies> | null = null;
  for (let frame = 0; frame < 120; frame++) {
    Matter.Engine.update(engine, 1000 / 60);
    quiet = settleInterestBodies([body], quiet);
  }
  assert.equal(body.isSleeping, false);
  assert.ok(body.position.y > 500);
  Matter.Engine.clear(engine);
});
