export type RGB = readonly [number, number, number];
export type HomePalette = { paperA: RGB; paperB: RGB; accent: RGB; highlight: RGB };
const white: RGB = [255, 255, 255];
export function mixColor(a: RGB, b: RGB, amount: number): RGB { return a.map((value, i) => Math.round(value * (1 - amount) + b[i] * amount)) as unknown as RGB; }
function hsl(rgb: RGB) {
  const [r, g, b] = rgb.map(value => value / 255), hi = Math.max(r, g, b), lo = Math.min(r, g, b), d = hi - lo, l = (hi + lo) / 2;
  if (!d) return [0, 0, l];
  const h = hi === r ? ((g - b) / d + (g < b ? 6 : 0)) : hi === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, d / (1 - Math.abs(2 * l - 1)), l];
}
function rgb(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const channels = h < 60 ? [c,x,0] : h < 120 ? [x,c,0] : h < 180 ? [0,c,x] : h < 240 ? [0,x,c] : h < 300 ? [x,0,c] : [c,0,x];
  return channels.map(v => Math.round((v + m) * 255)) as unknown as RGB;
}
function luminance(color: RGB) { const c = color.map(v => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }); return c[0] * .2126 + c[1] * .7152 + c[2] * .0722; }
export function contrast(a: RGB, b: RGB) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
function palette(hue: number): HomePalette {
  const base = rgb(hue, .48, .64), companion = rgb((hue + 32) % 360, .38, .69);
  const paperA = mixColor(base, white, .88), paperB = mixColor(companion, white, .79);
  let accent = rgb(hue, .32, .42);
  while (Math.min(contrast(accent, white), contrast(accent, paperB)) < 4.8) accent = mixColor(accent, [0,0,0], .06);
  return { paperA, paperB, accent, highlight: mixColor(base, white, .40) };
}
export const defaultHomePalette = palette(285);

/** Small, local pixel sample. Ignore transparent, near-white, dark and neutral pixels. */
export function paletteFromPixels(pixels: ArrayLike<number>): HomePalette {
  const bins = Array.from({ length: 18 }, () => ({ score: 0, hue: 0 }));
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i+3] < 128) continue;
    const [h,s,l] = hsl([pixels[i],pixels[i+1],pixels[i+2]]);
    if (s < .13 || l < .10 || l > .94) continue;
    const score = Math.sqrt(s) * (1 - Math.abs(l - .55)) * pixels[i+3] / 255;
    const bin = bins[Math.min(17, Math.floor(h / 20))]; bin.score += score; bin.hue += h * score;
  }
  const best = bins.reduce((a,b) => b.score > a.score ? b : a);
  return best.score ? palette(best.hue / best.score) : defaultHomePalette;
}
