/** Pure text and decorative spans; no timing, playback, or focus ownership. */
export default function LyricText({ text, sparkle = false }: { text: string; sparkle?: boolean }) {
  return <span className="mlp-line-copy"><span className="mlp-ink-text">{text}</span>{sparkle && <span className="mlp-line-twinkle" aria-hidden="true">✧</span>}</span>;
}
