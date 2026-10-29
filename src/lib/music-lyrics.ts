import type { LyricLine, MusicTrack } from "./music";

/** A display copy: never mutate cached tracks or invent word timestamps. */
export function displayLyricLines(track: MusicTrack): LyricLine[] {
  if (track.instrumental) return [];
  const sorted = (track.lyrics ?? []).filter(line => Number.isFinite(line.time) && line.time >= 0 && line.time < 86400)
    .map(line => ({ time: Math.round(line.time * 1000) / 1000, text: line.text.replace(/[\r\n]+/g, " ").trim() || "间奏" }))
    .sort((a, b) => a.time - b.time);
  const lines: LyricLine[] = [];
  for (const line of sorted) {
    const previous = lines.at(-1);
    if (previous?.time === line.time) {
      if (previous.text !== line.text) previous.text += ` / ${line.text}`;
    } else lines.push({ ...line });
  }
  if (lines[0]?.time > 0) lines.unshift({ time: 0, text: "前奏" });
  return lines;
}

export function lyricLineIndex(lines: readonly LyricLine[], elapsed: number): number {
  const time = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  let low = 0, high = lines.length - 1, found = -1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    if (lines[middle].time <= time) { found = middle; low = middle + 1; } else high = middle - 1;
  }
  return found;
}

export function displayLrc(lines: readonly LyricLine[]): string {
  return lines.map(line => {
    const milliseconds = Math.round(line.time * 1000);
    return `[${String(Math.floor(milliseconds / 60000)).padStart(2, "0")}:${String(Math.floor(milliseconds / 1000) % 60).padStart(2, "0")}.${String(milliseconds % 1000).padStart(3, "0")}] ${line.text}`;
  }).join("\n");
}
