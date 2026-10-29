import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client";
import { characterCollection, characterCollections, characterPhotos } from "../src/lib/characters";
import type { GalleryImage, GallerySnapshot } from "../src/lib/gallery-types";
import { mutateGallery, readGallerySnapshot } from "../src/lib/gallery-store";

const photo = (id: string, categoryId = "kokomi"): GalleryImage => ({ id, categoryId, src: `/images/${id}.webp?v=1`, width: 1200, height: 800 });
const snapshot = (images: GalleryImage[], name = "心海"): GallerySnapshot => ({ categories: [{ id: "kokomi", name }, { id: "other", name: "心海" }], images, revision: "test" });

test("bookmarks keep Megumin's original room and only three new character routes", () => {
  assert.deepEqual(characterCollections.map(item => item.albumId), ["kokomi", "megumin", "roxy", "mahiru"]);
  assert.equal(characterCollections.find(item => item.slug === "megumin")?.href, "/megumin");
  assert.equal(characterCollection("megumin"), undefined);
  assert.equal(characterCollection("missing"), undefined);
  assert.equal(characterCollection("roxy")?.href, "/characters/roxy");
});

test("selection binds to the stable album ID, never a mutable or duplicate name", () => {
  const data = snapshot([photo("one"), photo("unrelated", "other"), photo("two")], "更名后的相册");
  const selected = characterPhotos(data, "kokomi");
  assert.equal(selected.cover?.id, "one");
  assert.deepEqual(selected.remaining.map(image => image.id), ["two"]);
  assert.deepEqual(selected.images.map(image => image.id), ["one", "two"]);
});

test("add, delete, move and reorder snapshots update cover and remaining photos without duplicating the cover", () => {
  const first = photo("first"), second = photo("second"), added = photo("new");
  assert.deepEqual(characterPhotos(snapshot([first, second, added]), "kokomi").remaining.map(image => image.id), ["second", "new"]);
  const deleted = characterPhotos(snapshot([second, added]), "kokomi");
  assert.equal(deleted.cover?.id, "second");
  assert.deepEqual(deleted.remaining.map(image => image.id), ["new"]);
  const moved = characterPhotos(snapshot([{ ...second, categoryId: "other" }, added]), "kokomi");
  assert.equal(moved.cover?.id, "new");
  assert.deepEqual(moved.remaining, []);
  const reordered = characterPhotos(snapshot([added, first, second]), "kokomi");
  assert.equal(reordered.cover?.id, "new");
  assert.deepEqual(reordered.remaining.map(image => image.id), ["first", "second"]);
});

test("missing/deleted albums and empty albums cannot leak photos from another collection or trash", () => {
  assert.deepEqual(characterPhotos(snapshot([photo("other", "other")]), "kokomi"), { images: [], cover: null, remaining: [] });
  const removed = { ...snapshot([photo("orphan")]), categories: [], trash: [{ ...photo("deleted"), deletedAt: "2026-10-22" }] };
  assert.deepEqual(characterPhotos(removed, "kokomi"), { images: [], cover: null, remaining: [] });
});

test("real gallery mutations feed character collections through an isolated in-memory database", async () => {
  // Both store entry points receive an explicit client; no environment DB or global client is used.
  // Keep a second, non-transactional connection alive: libsql hands off and closes
  // its connection after each transaction, which would discard a private :memory: DB.
  const anchor = createClient({ url: "file::memory:?cache=shared" });
  const client = createClient({ url: "file::memory:?cache=shared" });
  const catalog = { categories: [{ id: "kokomi", name: "心海" }, { id: "roxy", name: "洛琪希" }], images: [photo("cover"), photo("next")] };
  const options = { client, catalog };
  try {
    await anchor.executeMultiple(await readFile(new URL("../scripts/gallery-schema.sql", import.meta.url), "utf8"));
    let data = await readGallerySnapshot(options);
    assert.equal(data.revision, "0");
    assert.equal(characterPhotos(data, "kokomi").cover?.id, "cover");

    data = await mutateGallery({ action: "addImages", categoryId: "kokomi", revision: data.revision, images: [{ mediaId: 990001, src: "/api/media/file/isolated.webp?v=123", width: 640, height: 960 }] }, options);
    assert.equal(data.revision, "1");
    assert.deepEqual(characterPhotos(data, "kokomi").images.map(image => image.id), ["cover", "next", "media-990001"]);
    assert.equal(characterPhotos(data, "kokomi").remaining[1].src, "/api/media/file/isolated.webp?v=123");

    data = await mutateGallery({ action: "deleteImage", id: "cover", revision: data.revision }, options);
    assert.equal(data.revision, "2");
    assert.equal(characterPhotos(data, "kokomi").cover?.id, "next");
    const publicRead = await readGallerySnapshot(options);
    assert.equal(publicRead.images.some(image => image.id === "cover"), false);
    assert.equal(publicRead.trash, undefined);

    data = await mutateGallery({ action: "moveImage", id: "media-990001", categoryId: "roxy", revision: data.revision }, options);
    assert.equal(data.revision, "3");
    assert.deepEqual(characterPhotos(data, "kokomi").images.map(image => image.id), ["next"]);
    assert.equal(characterPhotos(data, "roxy").cover?.id, "media-990001");

    data = await mutateGallery({ action: "renameCategory", categoryId: "roxy", name: "仍然绑定原 ID", revision: data.revision }, options);
    assert.equal(characterPhotos(data, "roxy").cover?.id, "media-990001");
    data = await mutateGallery({ action: "restoreImage", id: "cover", revision: data.revision }, options);
    assert.equal(characterPhotos(data, "kokomi").cover?.id, "cover");
    assert.deepEqual(characterPhotos(data, "kokomi").remaining.map(image => image.id), ["next"]);
  } finally { client.close(); anchor.close(); }
});
