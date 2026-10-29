import assert from "node:assert/strict";
import { test } from "node:test";
import { fallbackQuotes, initialFooterQuote, warmQuotes, classicQuotes } from "../src/lib/footer-quote-data";
import { createFallbackDeck, fetchFooterQuote, parseOnlineQuote, QUOTE_API, quoteKey, quoteWasSeen, readQuoteHistory, rememberQuote, saveQuoteHistory, type QuoteHistory } from "../src/lib/footer-quotes";
import { createFooterQuotePlayer } from "../src/lib/footer-quote-player";

function fakeClock() {
  let now = 0, sequence = 0;
  const jobs = new Map<number, { at: number; fn: () => void }>();
  return {
    set(fn: () => void, ms: number) { const id = ++sequence; jobs.set(id, { at: now + ms, fn }); return id; },
    clear(id: unknown) { jobs.delete(id as number); },
    tick(ms: number) { const end = now + ms; for (;;) { const next = [...jobs].sort((a, b) => a[1].at - b[1].at)[0]; if (!next || next[1].at > end) break; now = next[1].at; jobs.delete(next[0]); next[1].fn(); } now = end; },
    get jobs() { return jobs.size; },
  };
}
const online = { uuid: "04a05fdb-5f12-4000-abcd-0feabb723d11", hitokoto: "把喜欢的事，放进每一天。", type: "d", from: "测试作品", from_who: null };
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

test("warm notes dominate with short and longer paragraphs, bounded unique text and honest attribution", () => {
  assert.equal(warmQuotes.length, 160); assert.equal(classicQuotes.length, 12);
  assert.equal(fallbackQuotes.length, 172);
  assert.equal(new Set(fallbackQuotes.map(q => quoteKey(q.text))).size, fallbackQuotes.length);
  assert.ok(warmQuotes.filter(q => [...q.text].length >= 45).length >= 40);
  assert.ok(warmQuotes.filter(q => [...q.text].length < 30).length >= 80);
  for (const q of fallbackQuotes) assert.ok([...q.text].length >= 8 && [...q.text].length <= 100, q.text);
  for (const q of classicQuotes) { assert.ok(q.source && q.author); assert.equal(new URL(q.href).hostname, "zh.wikisource.org"); }
  for (const q of warmQuotes) { assert.equal(q.source, "小窝暖句（原创）"); assert.equal(q.author, undefined); assert.equal(q.href, "/#home-footer-whispers"); }
});
test("untrusted provider content is validated and links never come from provider HTML", () => {
  const q = parseOnlineQuote({ ...online, href: "javascript:alert(1)" })!;
  assert.equal(q.author, undefined); assert.equal(q.source, "测试作品"); assert.match(q.href, /^https:\/\/hitokoto.cn\?uuid=/);
  for (const value of [null, "text", {}, { ...online, type: "l" }, { ...online, type: "i" }, { ...online, uuid: "bad" }, { ...online, hitokoto: "短句" }, { ...online, hitokoto: "字".repeat(101) }, { ...online, hitokoto: "<img src=x onerror=alert(1)>" }, { ...online, hitokoto: "希望最后只留下痛苦与绝望。" }, { ...online, hitokoto: "before was was was, was was is." }]) assert.equal(parseOnlineQuote(value), null);
  assert.ok(parseOnlineQuote({ ...online, type: "e", hitokoto: "愿你认真奔赴自己的热爱，也记得照顾忙碌的自己。" }));
});
test("duplicate IDs and punctuation/spacing variants are suppressed across refresh; history retains latest 200", () => {
  let history: QuoteHistory = [];
  const q = parseOnlineQuote(online)!;
  history = rememberQuote(q, history);
  assert.equal(quoteWasSeen({ ...q, id: "another", text: "把 喜欢的事 放进每一天！" }, history), true);
  assert.equal(quoteWasSeen({ ...q, text: "完全不同的文字内容" }, history), true);
  for (let index = 0; index < 210; index++) history = rememberQuote({ ...q, id: String(index), text: `句子${index}` }, history);
  assert.equal(history.length, 200); assert.equal(history[0].id, "10");
  let saved = ""; const storage = { setItem(_key: string, value: string) { saved = value; }, getItem() { return saved; } };
  saveQuoteHistory(history, storage); assert.deepEqual(readQuoteHistory(storage), history);
  storage.getItem = () => "invalid"; assert.deepEqual(readQuoteHistory(storage), []);
  const denied = { getItem(): string { throw Error("denied"); }, setItem() { throw Error("denied"); } };
  assert.deepEqual(readQuoteHistory(denied), []); assert.doesNotThrow(() => saveQuoteHistory(history, denied));
});
test("offline fallback deals full nonrepeating cycles, avoids current and prefers unseen saved entries", () => {
  const deck = createFallbackDeck(() => .4); let history: QuoteHistory = []; let current;
  for (let round = 0; round < 3; round++) { const ids = new Set(); for (let i = 0; i < fallbackQuotes.length; i++) { const q = deck(history, current); assert.notEqual(q.id, current?.id); ids.add(q.id); history = rememberQuote(q, history); current = q; } assert.equal(ids.size, fallbackQuotes.length); }
  const known = fallbackQuotes.slice(0, -1).map(q => ({ id: q.id, text: quoteKey(q.text) }));
  assert.equal(createFallbackDeck(() => .1)(known).id, fallbackQuotes.at(-1)!.id);
});
test("each quote gets 20s and online text occupies at most one in five slots", async () => {
  const clock = fakeClock(); let calls = 0; const displayed: string[] = [];
  const player = createFooterQuotePlayer({ clock, reducedMotion: () => true, onFade() {}, onQuote(q) { displayed.push(q.id); }, async load() { calls++; return parseOnlineQuote(online); } });
  player.start(); player.start(); await flush(); assert.equal(calls, 1); assert.equal(displayed.length, 1);
  clock.tick(19_999); assert.equal(displayed.length, 1);
  clock.tick(1); await flush(); assert.notEqual(displayed[1], online.uuid); assert.equal(calls, 1);
  for (let index = 2; index <= 4; index++) { clock.tick(20_000); await flush(); assert.notEqual(displayed[index], online.uuid); assert.equal(calls, 1); }
  clock.tick(20_000); await flush(); assert.equal(displayed[5], online.uuid); assert.equal(calls, 2);
  clock.tick(20_000); await flush(); assert.notEqual(displayed[6], online.uuid); assert.equal(calls, 3);
  player.dispose(); assert.equal(clock.jobs, 0);
});
test("pause aborts requests and fades; resume waits a fresh 20s; stale response and unmount never commit", async () => {
  const clock = fakeClock(), signals: AbortSignal[] = [], displayed: string[] = [], fades: boolean[] = [];
  let resolve: ((value: ReturnType<typeof parseOnlineQuote>) => void) | undefined;
  const player = createFooterQuotePlayer({ clock, reducedMotion: () => false, onFade(v) { fades.push(v); }, onQuote(q) { displayed.push(q.id); }, load(signal) { signals.push(signal); return new Promise(done => { resolve = done; }); } });
  player.start(); clock.tick(12_000); player.stop(); assert.equal(signals[0].aborted, true); assert.equal(clock.jobs, 0);
  resolve!(parseOnlineQuote(online)); await flush(); clock.tick(90_000); assert.equal(displayed.length, 1);
  player.start(); clock.tick(19_999); assert.equal(displayed.length, 1);
  clock.tick(1); assert.equal(fades.at(-1), true); clock.tick(100); player.stop(); clock.tick(1000); assert.equal(displayed.length, 1); assert.equal(fades.at(-1), false);
  player.start(); clock.tick(20_175); assert.equal(displayed.length, 2); assert.notEqual(displayed[1], online.uuid);
  player.dispose(); resolve!(parseOnlineQuote(online)); await flush(); clock.tick(50_000); assert.equal(displayed.length, 2); assert.equal(clock.jobs, 0);
});
test("refresh selects another local sentence, storage failure and offline errors keep rotation working", async () => {
  const clock = fakeClock(), displayed: string[] = [];
  const storage = { getItem() { return JSON.stringify(rememberQuote(initialFooterQuote, [])); }, setItem() { throw Error("quota"); } };
  const player = createFooterQuotePlayer({ clock, storage, reducedMotion: () => true, onFade() {}, onQuote(q) { displayed.push(q.id); }, async load() { throw Error("offline"); } });
  player.start(); await flush(); assert.notEqual(displayed[0], initialFooterQuote.id); clock.tick(20_000); await flush(); assert.equal(displayed.length, 2); assert.notEqual(displayed[0], displayed[1]); player.dispose();
});
test("network omits credentials/referrer, handles errors and cancels on caller abort", async () => {
  const control = new AbortController();
  const ok: typeof fetch = async (url, init) => { assert.equal(url, QUOTE_API); assert.equal(init?.credentials, "omit"); assert.equal(init?.referrerPolicy, "no-referrer"); return new Response(JSON.stringify(online)); };
  assert.equal((await fetchFooterQuote(control.signal, ok))?.id, online.uuid);
  assert.equal(await fetchFooterQuote(control.signal, async () => new Response("oops", { status: 503 })), null);
  assert.equal(await fetchFooterQuote(control.signal, async () => new Response("not json")), null);
  const loading = fetchFooterQuote(control.signal, async (_url, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(Error("aborted")))));
  control.abort(); assert.equal(await loading, null);
});
test("provider timeout is bounded to 4s and does not hang switching", async () => {
  const start = Date.now();
  assert.equal(await fetchFooterQuote(new AbortController().signal, async (_url, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(Error("timeout"))))), null);
  assert.ok(Date.now() - start >= 3_900 && Date.now() - start < 5_500);
});
