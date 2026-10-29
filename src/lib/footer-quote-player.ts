import { initialFooterQuote, type FooterQuote } from "./footer-quote-data";
import { createFallbackDeck, fetchFooterQuote, QUOTE_FADE, QUOTE_INTERVAL, quoteWasSeen, readQuoteHistory, rememberQuote, saveQuoteHistory, type QuoteStorage } from "./footer-quotes";

type Clock = { set: (callback: () => void, ms: number) => unknown; clear: (id: unknown) => void };
type Options = {
  onQuote: (quote: FooterQuote) => void;
  onFade: (fading: boolean) => void;
  reducedMotion: () => boolean;
  storage?: QuoteStorage;
  load?: (signal: AbortSignal) => Promise<FooterQuote | null>;
  clock?: Clock;
  random?: () => number;
};
/** One visible reading period owns one request and one switch; footer's 1s clock is unrelated. */
export function createFooterQuotePlayer(options: Options) {
  const clock: Clock = options.clock ?? { set: (fn, ms) => setTimeout(fn, ms), clear: id => clearTimeout(id as ReturnType<typeof setTimeout>) };
  const load = options.load ?? fetchFooterQuote;
  const fallback = createFallbackDeck(options.random);
  let history = readQuoteHistory(options.storage);
  let current = initialFooterQuote;
  let pending: FooterQuote | null = null;
  let active = false, initialized = false, generation = 0, turns = 0;
  let timer: unknown, fade: unknown, request: AbortController | undefined;
  const remember = (quote: FooterQuote) => { history = rememberQuote(quote, history); saveQuoteHistory(history, options.storage); };
  const prefetch = () => {
    if (pending || request) return;
    const controller = new AbortController(), run = generation;
    request = controller;
    void load(controller.signal).then(quote => {
      if (active && run === generation && !controller.signal.aborted && quote && !quoteWasSeen(quote, history)) pending = quote;
    }).catch(() => { /* Local deck is already ready. */ }).finally(() => { if (request === controller) request = undefined; });
  };
  const schedule = () => { timer = clock.set(switchQuote, QUOTE_INTERVAL); };
  const switchQuote = () => {
    // Do not carry an unexpectedly slow custom/provider request into another period.
    request?.abort(); request = undefined;
    // Four local cards per online card keep warm notes dominant.
    turns++;
    const useOnline = turns % 5 === 0 && pending !== null && !quoteWasSeen(pending, history);
    const next = useOnline ? pending! : fallback(history, current);
    if (useOnline || pending && quoteWasSeen(pending, history)) pending = null;
    const commit = () => { current = next; remember(next); options.onQuote(next); options.onFade(false); prefetch(); };
    if (options.reducedMotion()) commit();
    else { options.onFade(true); fade = clock.set(commit, QUOTE_FADE); }
    schedule();
  };
  const stop = () => {
    active = false; generation++;
    clock.clear(timer); clock.clear(fade); timer = fade = undefined;
    request?.abort(); request = undefined; options.onFade(false);
  };
  return {
    start() {
      if (active) return;
      active = true;
      if (!initialized) {
        initialized = true;
        if (quoteWasSeen(current, history)) current = fallback(history, current);
        remember(current); options.onQuote(current);
      }
      prefetch(); schedule();
    },
    stop,
    dispose() { stop(); pending = null; },
  };
}
