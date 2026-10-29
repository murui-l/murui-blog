import test from "node:test";
import assert from "node:assert/strict";
import { paletteFromPixels, defaultHomePalette, contrast, type RGB } from "../src/lib/home-palette";
const pixels = (color: RGB, alpha=255) => new Uint8ClampedArray(Array.from({length:64},()=>[...color,alpha]).flat());
test("transparent, white and neutral images use a safe fallback",()=>{
  for(const color of [[255,255,255],[0,0,0],[128,128,128]] as RGB[]) assert.deepEqual(paletteFromPixels(pixels(color)),defaultHomePalette);
  assert.deepEqual(paletteFromPixels(pixels([240,40,70],0)),defaultHomePalette);
});
test("warm and cool pictures yield distinct pastels with readable accent buttons",()=>{
  const warm=paletteFromPixels(pixels([230,100,75])),cool=paletteFromPixels(pixels([50,130,220]));
  assert.notDeepEqual(warm,cool); assert.ok(warm.paperA[0]>warm.paperA[2]);assert.ok(cool.paperA[2]>cool.paperA[0]);
  for(let r=30;r<=240;r+=35)for(let g=30;g<=240;g+=35)for(let b=30;b<=240;b+=35){
    const palette=paletteFromPixels(pixels([r,g,b]));
    assert.ok(contrast(palette.accent,[255,255,255])>=4.8);assert.ok(contrast(palette.accent,palette.paperB)>=4.8);
    assert.ok(palette.paperA.every(value=>value>=220));
  }
});
test("large neutral margins do not drown out the illustration colour",()=>{
 const result=paletteFromPixels(new Uint8ClampedArray([...pixels([255,255,255]),...pixels([40,140,220])]));
 assert.deepEqual(result,paletteFromPixels(pixels([40,140,220])));
});
