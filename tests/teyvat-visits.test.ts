import test from "node:test";
import assert from "node:assert/strict";
import { createTeyvatVisitStore, EMPTY_VISITS, parseTeyvatVisits, TEYVAT_VISITS_KEY } from "../src/components/teyvat-visits";

test("travel footprint parser keeps only nine known identifiers and stable canonical order", () => {
  assert.deepEqual(parseTeyvatVisits('["frostmoon","inazuma","liyue","inazuma","unknown",123,{"nation":"natlan"}]'), ["liyue", "inazuma", "frostmoon"]);
  for (const raw of [null, "", "invalid", '{"mondstadt":true}', '"natlan"', '["/teyvat/natlan","__proto__","MONDSTADT"]']) assert.deepEqual(parseTeyvatVisits(raw), []);
  assert.equal(parseTeyvatVisits(null), EMPTY_VISITS);
});

test("only actual supported country paths record a visit, including Nod-Krai and Frostmoon", () => {
  const values = new Map<string, string>();
  let writes = 0;
  const store = createTeyvatVisitStore({ getStorage: () => ({ getItem: key => values.get(key) ?? null, setItem: (key, value) => { writes++; values.set(key, value); } }) });
  assert.equal(store.getServerSnapshot(), EMPTY_VISITS);
  assert.equal(store.getSnapshot(), EMPTY_VISITS);
  for (const path of ["/", "/#home-teyvat-map", "/teyvat", "/teyvat/unknown", "/teyvat/natlan/extra", "/teyvat/natlan?preview=1", "/teyvat/natlan#hero", "/teyvat/../natlan"]) assert.equal(store.recordPath(path), false, path);
  assert.equal(writes, 0);
  assert.equal(store.recordPath("/teyvat/nod-krai"), true);
  assert.equal(store.recordPath("/teyvat/frostmoon/"), true);
  assert.equal(store.recordPath("/teyvat/nod-krai"), false);
  assert.deepEqual(store.getSnapshot(), ["nod-krai", "frostmoon"]);
  assert.deepEqual(JSON.parse(values.get(TEYVAT_VISITS_KEY)!), ["nod-krai", "frostmoon"]);
  assert.equal(writes, 2);
  // Hydration always begins from a stable empty server snapshot.
  assert.equal(store.getServerSnapshot(), EMPTY_VISITS);
});

test("blocked reads or writes retain a deduplicated current-session footprint", () => {
  const unavailable = createTeyvatVisitStore({ getStorage: () => { throw new Error("storage blocked"); } });
  const unsubscribe = unavailable.subscribe(() => {});
  assert.equal(unavailable.recordPath("/teyvat/liyue"), true);
  assert.equal(unavailable.recordPath("/teyvat/liyue"), false);
  assert.deepEqual(unavailable.getSnapshot(), ["liyue"]);
  unsubscribe();
  const full = createTeyvatVisitStore({ getStorage: () => ({ getItem: () => '["mondstadt"]', setItem: () => { throw Error("quota"); } }) });
  assert.equal(full.recordPath("/teyvat/sumeru"), true);
  assert.deepEqual(full.getSnapshot(), ["mondstadt", "sumeru"]);
});

test("refresh loads saved visits; storage events merge concurrent tabs and clean up subscriptions", () => {
  let disk = '["mondstadt"]', writes = 0, subscribed = 0, cleaned = 0, notified = 0;
  let receive: ((key: string | null, value: string | null) => void) | undefined;
  const store = createTeyvatVisitStore({
    getStorage: () => ({ getItem: () => disk, setItem: (_key, value) => { disk = value; writes++; } }),
    subscribeStorage: listener => { receive = listener; subscribed++; return () => { receive = undefined; cleaned++; }; },
  });
  assert.equal(store.getSnapshot(), EMPTY_VISITS);
  const off = store.subscribe(() => { notified++; });
  const offSecond = store.subscribe(() => {});
  assert.deepEqual(store.getSnapshot(), ["mondstadt"]);
  assert.equal(subscribed, 1);
  assert.equal(store.recordPath("/teyvat/liyue"), true);
  // Another tab concurrently saved its own destination before seeing ours.
  disk = '["inazuma"]';
  receive!(TEYVAT_VISITS_KEY, disk);
  assert.deepEqual(store.getSnapshot(), ["mondstadt", "liyue", "inazuma"]);
  assert.deepEqual(JSON.parse(disk), ["mondstadt", "liyue", "inazuma"]);
  const stable = store.getSnapshot();
  receive!("unrelated", '["frostmoon"]');
  receive!(TEYVAT_VISITS_KEY, disk);
  assert.equal(store.getSnapshot(), stable);
  assert.equal(writes, 2);
  assert.equal(notified, 2);
  off(); assert.equal(cleaned, 0);
  offSecond(); assert.equal(cleaned, 1);
  assert.equal(receive, undefined);
});

test("recording merges an unseen newer disk value and explicit browser clearing removes footprints", () => {
  let disk = '["liyue"]';
  let receive: ((key: string | null, value: string | null) => void) | undefined;
  const store = createTeyvatVisitStore({ getStorage: () => ({ getItem: () => disk, setItem: (_key, value) => { disk = value; } }), subscribeStorage: listener => { receive = listener; return () => {}; } });
  const off = store.subscribe(() => {});
  disk = '["inazuma"]';
  store.recordPath("/teyvat/natlan");
  assert.deepEqual(store.getSnapshot(), ["liyue", "inazuma", "natlan"]);
  disk = '["frostmoon"]';
  assert.equal(store.recordPath("/teyvat/liyue"), true);
  assert.deepEqual(store.getSnapshot(), ["liyue", "inazuma", "natlan", "frostmoon"]);
  receive!(TEYVAT_VISITS_KEY, null);
  assert.deepEqual(store.getSnapshot(), []);
  disk = '["frostmoon"]';
  store.recordPath("/teyvat/mondstadt");
  receive!(null, null);
  assert.deepEqual(store.getSnapshot(), []);
  off();
});
