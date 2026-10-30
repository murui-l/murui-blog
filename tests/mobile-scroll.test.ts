import assert from "node:assert/strict";
import test from "node:test";
import Matter from "matter-js";
import { backdropImageSource } from "../src/lib/backdrop-image";
import { makeInterestBody, makeInterestBounds, resizeInterestViewport } from "../src/lib/interest-rain";

test("wallpaper uses bounded public derivatives and retains the media version", () => {
  const source = "https://muruiwen.cn/api/media/file/wide.jpg?v=17";
  const phone = new URL(backdropImageSource(source, 640), "https://muruiwen.cn");
  const desktop = new URL(backdropImageSource(source, 1200), "https://muruiwen.cn");
  assert.equal(phone.pathname, "/_next/image");
  assert.equal(phone.searchParams.get("url"), "/api/media/file/wide.jpg?v=17");
  assert.equal(phone.searchParams.get("w"), "640");
  assert.equal(desktop.searchParams.get("w"), "1200");
  assert.equal(backdropImageSource("/api/private-media/secret.jpg"), "/api/private-media/secret.jpg");
  assert.equal(backdropImageSource("https://elsewhere.example/image.jpg"), "https://elsewhere.example/image.jpg");
});

test("viewport height changes retain the same falling, resting and pending stars", () => {
  const engine = Matter.Engine.create({ enableSleeping: true });
  Matter.Composite.add(engine.world, makeInterestBounds(360, 740));
  const falling = makeInterestBody(180, 230, 92, 92, .3);
  const resting = makeInterestBody(80, 680, 92, 92, -.2);
  const pending = makeInterestBody(250, -120, 92, 92, .1);
  Matter.Body.setVelocity(falling, { x: 2, y: 6 });
  Matter.Sleeping.set(resting, true);
  Matter.Composite.add(engine.world, [falling, resting]);
  const identity = [falling.id, resting.id, pending.id];
  const velocity = { ...falling.velocity };
  assert.equal(resizeInterestViewport(engine, [falling, resting, pending], { width: 360, height: 740 }, { width: 360, height: 805 }), true);
  assert.deepEqual([falling.id, resting.id, pending.id], identity);
  assert.deepEqual(falling.velocity, velocity);
  assert.equal(falling.angle, .3);
  assert.equal(falling.position.y, 295);
  assert.equal(resting.position.y, 745);
  assert.equal(resting.isSleeping, true);
  assert.equal(pending.position.y, -120);
  assert.equal(Matter.Composite.allBodies(engine.world).filter(body => !body.isStatic).length, 2);
  assert.equal(Matter.Composite.allBodies(engine.world).filter(body => body.isStatic).length, 3);
  assert.equal(resizeInterestViewport(engine, [falling, resting, pending], { width: 360, height: 805 }, { width: 360, height: 740 }), true);
  assert.equal(falling.position.y, 230);
  assert.equal(resting.position.y, 680);
  Matter.Engine.clear(engine);
});

test("invalid or temporarily zero viewport does not destroy an existing world", () => {
  const engine = Matter.Engine.create();
  const star = makeInterestBody(140, 200, 92, 92, 0);
  Matter.Composite.add(engine.world, [...makeInterestBounds(320, 740), star]);
  const ids = Matter.Composite.allBodies(engine.world).map(body => body.id);
  assert.equal(resizeInterestViewport(engine, [star], { width: 320, height: 740 }, { width: 0, height: 740 }), false);
  assert.deepEqual(Matter.Composite.allBodies(engine.world).map(body => body.id), ids);
  assert.equal(star.position.y, 200);
  Matter.Engine.clear(engine);
});
