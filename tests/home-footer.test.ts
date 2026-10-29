import assert from "node:assert/strict";
import test from "node:test";
import { HOME_OPENED_AT, formatFooterUptime, formatLightTime, getFooterUptime, homeFooter } from "../src/lib/home-footer";

test("uptime uses the fixed Shanghai launch instant and floors partial seconds", () => {
  assert.equal(HOME_OPENED_AT, Date.parse("2026-09-13T16:00:00Z"));
  assert.deepEqual(getFooterUptime(HOME_OPENED_AT), { days: 0, hours: 0, minutes: 0, seconds: 0 });
  assert.deepEqual(getFooterUptime(HOME_OPENED_AT + 90061999), { days: 1, hours: 1, minutes: 1, seconds: 1 });
  assert.deepEqual(getFooterUptime(HOME_OPENED_AT + 86400000 * 365 + 59999), { days: 365, hours: 0, minutes: 0, seconds: 59 });
});

test("uptime remains a stable placeholder before hydration and rejects invalid or future starts", () => {
  for (const now of [null, Number.NaN, Number.POSITIVE_INFINITY, HOME_OPENED_AT - 1]) assert.equal(getFooterUptime(now), null);
  assert.equal(formatFooterUptime(null), "— 天 —:—:—");
  assert.equal(formatFooterUptime({ days: 100, hours: 1, minutes: 2, seconds: 3 }), "100 天 01:02:03");
});

test("light travel time carries rounded seconds through minute and hour boundaries", () => {
  assert.equal(formatLightTime(3599.6), "1 时 00 分 00 秒");
  assert.equal(formatLightTime(91026), "25 时 17 分 06 秒");
  assert.equal(formatLightTime(-1), "");
  assert.equal(formatLightTime(Number.NaN), "");
});

test("footer bookmarks include Teyvat while preserving core destinations and modal controls", () => {
  assert.equal(homeFooter.links.length, 13);
  const destinations = homeFooter.links.filter(entry => "href" in entry).map(entry => entry.href);
  assert.ok(destinations.includes("/#home-collection-title"));
  assert.ok(destinations.includes("/write"));
  assert.ok(destinations.includes("/#home-teyvat-map"));
  assert.equal(destinations.some(href => /guestbook|postcard/.test(href)), false);
  assert.deepEqual(homeFooter.links.filter(entry => ["book", "search", "rss"].includes(entry.kind)).map(entry => entry.kind), ["book", "search", "rss"]);
});
