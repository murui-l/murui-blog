import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { isPublicOptimizableImage, publicImageSource } from "../src/lib/public-image";

test("only the site's anonymous static rasters and versioned public uploads are optimized", () => {
  for (const src of [
    "/images/artworks/kokomi-poolside.webp", "/images/backgrounds/mahiru-pool.webp",
    "/images/megumin/character.webp", "/api/media/file/photo.jpg?v=1792636600000",
    "/api/media/file/%E5%BF%83%E6%B5%B7.webp?v=1792636600000", "/api/media/file/a%20photo.png",
    "https://muruiwen.cn/api/media/file/cover.webp?v=1792636600000",
  ]) assert.equal(isPublicOptimizableImage(src), true, src);
});

test("canonical absolute public media uses the current public route and retains replacement versions", () => {
  assert.equal(publicImageSource("https://muruiwen.cn/api/media/file/cover.webp?v=123"), "/api/media/file/cover.webp?v=123");
  for (const src of ["https://other.invalid/api/media/file/cover.webp", "http://muruiwen.cn/api/media/file/cover.webp", "https://muruiwen.cn.evil.invalid/api/media/file/cover.webp", "https://muruiwen.cn/api/private-media/file/cover.webp", "https://muruiwen.cn/api/media/file/../private-media/file/cover.webp"])
    assert.equal(publicImageSource(src), null, src);
});

test("authenticated routes, animated mascots, remote URLs and non-raster formats bypass the public cache", () => {
  for (const src of [
    "/api/private-media/file/a.webp", "/api/private-notes/1/a.jpg", "/account/avatar.png",
    "/my-notes/photo.webp", "/images/megumin/pet-collapse.webp", "/images/stickers/navigation-face.webp",
    "/images/stickers/kokomi-heart.webp", "/images/artworks/animated.gif", "/images/artworks/icon.svg",
    "https://muruiwen.cn/api/private-media/file/a.webp", "//elsewhere.invalid/a.webp", "data:image/png;base64,AA==",
    "/unapproved/photo.webp", "/api/media/file/photo.webp?token=secret", "/api/media/file/photo.webp?v=1&token=x",
  ]) assert.equal(isPublicOptimizableImage(src), false, src);
});

test("encoded separators, traversal and delimiters cannot disguise a cache source", () => {
  for (const src of [
    "/api/media/file/../private-media/file/a.webp", "/api/media/file/%2e%2e/private-media/file/a.webp",
    "/api/media/file/a%2fb.webp", "/api/media/file/a%5cb.webp", "/api/media/file/a%252fb.webp",
    "/api/media/file/a%00.webp", "/api/media/file/a%0a.webp", "/api/media/file/a%7f.webp",
    "/api/media/file/a%23b.webp", "/api/media/file/a%3fb.webp", "/api/media/file/a%ZZ.webp",
    "/api/media/file/a.webp#private", "/api/media/file/a.webp?v=1?v=2", "/api/media/file/a.webp?v=1.5",
    "/api/media/file/a.webp?v=-1", "/api/media/file/a.webp\n", "/api/media/file/a\\b.webp",
  ]) assert.equal(isPublicOptimizableImage(src), false, src);
});

test("Next's server allowlist rejects private paths and the animated pet, independently of the component", () => {
  const require = createRequire(import.meta.url);
  const { hasLocalMatch } = require("next/dist/shared/lib/match-local-pattern") as {
    hasLocalMatch: (patterns: Array<{ pathname: string; search?: string }>, src: string) => boolean;
  };
  const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
  const patterns = [...config.matchAll(/\{ pathname: "([^"]+)"(?:, search: "([^"]*)")? \}/g)]
    .map(match => ({ pathname: match[1], ...(match[2] === undefined ? {} : { search: match[2] }) }));
  assert.ok(patterns.length >= 4, "Check the actual reviewed Next image allowlist");
  assert.ok(patterns.some(pattern => pattern.pathname === "/images/megumin/!(pet-collapse).webp"));
  for (const src of ["/images/artworks/kokomi-poolside.webp", "/images/megumin/character.webp", "/api/media/file/a.webp?v=2"])
    assert.equal(hasLocalMatch(patterns, src), true, src);
  for (const src of [
    "/api/private-media/file/a.webp", "/api/private-notes/a.webp", "/account/avatar.webp",
    "/images/megumin/pet-collapse.webp", "/images/stickers/kokomi-heart.webp", "/images/stickers/navigation-face.webp",
    "/api/media/file/../../private-media/file/a.webp", "/api/media/file/%2e%2e/%2e%2e/private-media/file/a.webp",
  ]) assert.equal(hasLocalMatch(patterns, src), false, src);
});
