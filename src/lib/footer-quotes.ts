import { fallbackQuotes, type FooterQuote } from "./footer-quote-data";

export const QUOTE_HISTORY_KEY = "murui.footer-quotes.v1";
export const QUOTE_INTERVAL = 20_000;
export const QUOTE_FADE = 175; // 175ms out + 175ms in.
export const QUOTE_API = "https://v1.hitokoto.cn/?c=d&c=e&min_length=8&max_length=100";
export type QuoteHistory = { id: string; text: string }[];
export type QuoteStorage = Pick<Storage, "getItem" | "setItem">;
export const quoteKey = (text: string) => text.normalize("NFKC").replace(/[\p{P}\p{Z}\s]/gu, "").toLocaleLowerCase("zh-CN");
const clean = (value: unknown, max: number) => typeof value === "string" && !/[<>\u0000-\u001f\u007f]/u.test(value) && [...value.trim()].length <= max ? value.trim() : "";

// Online categories are broad. Prefer local original notes and reject obvious
// gloomy/hostile or non-Chinese submissions instead of treating all literature as uplifting.
export function isWarmOnlineText(text: string) {
  return (text.match(/\p{Script=Han}/gu)?.length ?? 0) >= 4
    && /美好|温柔|希望|勇气|热爱|喜欢|阳光|快乐|幸福|成长|进步|梦想|努力|微笑|善良|未来|明天|春天|相信|值得|光芒|前行|坚持|出发|收获|认真|笑容|可爱|热情|心愿|珍惜|遇见|自由|拥抱|心安|宁静|善意|平凡|从容|绽放|相遇/.test(text)
    && !/死亡|死去|自杀|自残|绝望|仇恨|惩罚|痛苦|悲惨|孤独|寂寞|毁灭|沉沦|报复|杀戮|流血|战争|暴力|废物|垃圾|胡说八道/.test(text);
}

export function parseOnlineQuote(value: unknown): FooterQuote | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const text = clean(data.hitokoto, 100), id = clean(data.uuid, 36);
  if ([...text].length < 8 || !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id) || !["d", "e"].includes(String(data.type)) || !isWarmOnlineText(text)) return null;
  return { id, text, author: clean(data.from_who, 30) || undefined, source: clean(data.from, 40) || undefined, href: `https://hitokoto.cn?uuid=${id}` };
}
export function quoteWasSeen(quote: FooterQuote, history: QuoteHistory) {
  const key = quoteKey(quote.text);
  return history.some(item => item.id === quote.id || item.text === key);
}
export function rememberQuote(quote: FooterQuote, history: QuoteHistory): QuoteHistory {
  const item = { id: quote.id, text: quoteKey(quote.text) };
  return [...history.filter(old => old.id !== item.id && old.text !== item.text), item].slice(-200);
}
export function readQuoteHistory(storage?: QuoteStorage): QuoteHistory {
  try {
    const value: unknown = JSON.parse(storage?.getItem(QUOTE_HISTORY_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.slice(-200).filter((item): item is QuoteHistory[number] => !!item && typeof item === "object" && typeof item.id === "string" && item.id.length <= 80 && typeof item.text === "string" && item.text.length > 0 && item.text.length <= 150);
  } catch { return []; }
}
export function saveQuoteHistory(history: QuoteHistory, storage?: QuoteStorage) {
  try { storage?.setItem(QUOTE_HISTORY_KEY, JSON.stringify(history.slice(-200))); } catch { /* Session history remains usable. */ }
}
export function createFallbackDeck(random = Math.random) {
  let deck: FooterQuote[] = [];
  return (history: QuoteHistory, current?: FooterQuote): FooterQuote => {
    if (!deck.length) {
      deck = [...fallbackQuotes];
      for (let index = deck.length - 1; index > 0; index--) {
        const other = Math.floor(random() * (index + 1));
        [deck[index], deck[other]] = [deck[other], deck[index]];
      }
    }
    const different = (quote: FooterQuote) => !current || quoteKey(quote.text) !== quoteKey(current.text);
    let index = deck.findIndex(quote => different(quote) && !quoteWasSeen(quote, history));
    if (index < 0) index = deck.findIndex(different);
    // The last card of a cycle may equal an online quote just displayed.
    if (index < 0) { deck = []; return fallbackQuotes.find(different)!; }
    return deck.splice(index, 1)[0];
  };
}

export async function fetchFooterQuote(signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<FooterQuote | null> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 4_000);
  if (signal.aborted) abort();
  try {
    if (controller.signal.aborted) return null;
    const response = await fetcher(QUOTE_API, { signal: controller.signal, credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store" });
    if (!response.ok || controller.signal.aborted) return null;
    const quote = parseOnlineQuote(await response.json());
    return controller.signal.aborted ? null : quote;
  } catch { return null; }
  finally { clearTimeout(timeout); signal.removeEventListener("abort", abort); }
}
