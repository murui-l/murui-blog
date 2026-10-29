import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { teyvatMap, teyvatDestinations, teyvatNations, teyvatDestination, destinationFromPath, isTeyvatPath } from "../src/lib/teyvat";

test("seven nations, Nod-Krai and Frostmoon have complete destinations and valid map placement", () => {
  assert.equal(teyvatNations.length, 7);
  assert.equal(teyvatDestinations.length, 9);
  assert.equal(teyvatDestination("nod-krai")!.parentSlug, "snezhnaya");
  assert.equal(teyvatDestination("nod-krai")!.kind, "region");
  assert.equal(teyvatDestination("frostmoon")!.kind, "moon");
  assert.equal(teyvatDestination("frostmoon")!.parentSlug, undefined);
  assert.equal(new Set(teyvatDestinations.map(nation => nation.slug)).size, 9);
  for (const nation of teyvatDestinations) {
    assert.equal(teyvatDestination(nation.slug), nation);
    assert.equal(destinationFromPath(`/teyvat/${nation.slug}`), nation);
    if (nation.kind === "moon") assert.equal(nation.point, null);
    else assert.ok(nation.point && nation.point.every(value => value > 0 && value < 1));
    assert.equal(nation.scenes.length, 3);
    assert.equal(new Set([nation.cover.src, ...nation.scenes.map(image => image.src)]).size, 4);
    for (const image of [nation.crest, nation.cover, ...nation.scenes]) {
      assert.ok(image.width > 0 && image.height > 0);
      assert.ok(existsSync(new URL(`../public${image.src}`, import.meta.url)));
      const sourceHost=new URL(image.source).hostname;
      if (nation.kind !== "nation" && image === nation.crest) assert.equal(sourceHost,"muruiwen.cn");
      else if (nation.kind === "moon") assert.ok(["genshin.hoyoverse.com","www.hoyoverse.com","www.bilibili.com","www.youtube.com"].includes(sourceHost));
      else assert.equal(sourceHost,"genshin.hoyoverse.com");
    }
    assert.equal(nation.tracks.length, 2);
    assert.equal(new Set(nation.tracks.map(track => track.id)).size, 2);
    for (const track of nation.tracks) {
      assert.match(track.artist, /HOYO-MiX/);
      assert.match(track.src, /^https:\/\/music\.163\.com\/song\/media\/outer\/url\?id=\d+\.mp3$/);
      assert.equal(track.provider, "netease");
    }
  }
  assert.ok(existsSync(new URL(`../public${teyvatMap.src}`, import.meta.url)));
  assert.equal(teyvatDestination("snezhnaya")!.tracks[1].instrumental, false, "vocal songs must retain the normal lyric-loading path");
  assert.equal(teyvatDestination("natlan")!.tracks[0].hasTimedLyrics, true);
});

test("travel route matching rejects lookalikes, unknown countries and extra segments", () => {
  assert.ok(isTeyvatPath("/teyvat"));
  for (const path of ["/teyvat-extra", "/teyvat/unknown", "/teyvat/liyue/other", "/gallery", "/"]) assert.equal(isTeyvatPath(path), false);
  assert.equal(teyvatDestination("../../account"), undefined);
});

test("every home anchor leaves regional music; only standalone travel routes retain it", () => {
  for (const href of ["/", "/#home-teyvat-map", "/#home-collection-title", "/?from=teyvat#home-teyvat-map", "/gallery#home-teyvat-map"]) assert.equal(isTeyvatPath(new URL(href, "https://muruiwen.cn").pathname), false, href);
  for (const href of ["/teyvat", "/teyvat/liyue", "/teyvat/frostmoon"]) assert.equal(isTeyvatPath(href), true, href);
});

test("local map and scenic assets have recorded official provenance, without copying music files", () => {
  const source=JSON.parse(readFileSync(new URL("../licenses/teyvat-sources.json", import.meta.url),"utf8"));
  assert.equal(source.images.length, 40);
  assert.equal(source.music.length, 16);
  assert.equal(source.map.tiles.length, 108);
  assert.ok(source.map.tiles.every((tile: { url: string }) => new URL(tile.url).hostname === "act-webstatic.hoyoverse.com"));
  const lunar=JSON.parse(readFileSync(new URL("../licenses/teyvat-frostmoon-sources.json", import.meta.url),"utf8"));
  assert.equal(lunar.images.length,5);
  assert.equal(lunar.music.length,2);
  assert.equal(lunar.music[0].id,"netease-3411268918", "Frostmoon uses the user's selected Ungien's Circle track");
  assert.equal(lunar.music[1].id,"netease-3411268292");
  assert.equal(new Set(lunar.images.filter((image: { kind: string })=>image.kind!=="crest").map((image: { original: string })=>image.original)).size,4);
});
