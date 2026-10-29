import assert from "node:assert/strict";
import test from "node:test";
import { displayLrc, displayLyricLines, lyricLineIndex } from "../src/lib/music-lyrics";
import type { MusicTrack } from "../src/lib/music";
const track = (lyrics: MusicTrack["lyrics"], instrumental = false): MusicTrack => ({ id:"qa",title:"qa",artist:"qa",src:"/qa.mp3",source:"/",provider:"local",lyrics,instrumental });

test("lyrics preserve cache, order lines, merge simultaneous translations and keep timed interludes", () => {
  const input = [{time:4,text:""},{time:2,text:"hello"},{time:2,text:"你好"},{time:NaN,text:"bad"}];
  const before = structuredClone(input);
  const lines = displayLyricLines(track(input));
  assert.deepEqual(lines,[{time:0,text:"前奏"},{time:2,text:"hello / 你好"},{time:4,text:"间奏"}]);
  assert.deepEqual(input,before);
  assert.equal(lyricLineIndex(lines,1.999),0); assert.equal(lyricLineIndex(lines,2),1);
  assert.equal(lyricLineIndex(lines,4),2); assert.equal(lyricLineIndex(lines,1000),2);
  assert.equal(lyricLineIndex(lines,-4),0); assert.equal(lyricLineIndex(lines,NaN),0);
});
test("display LRC keeps millisecond boundaries and text as text, without injected time tags", () => {
  const lines=displayLyricLines(track([{time:61.125,text:"[00:01.00] literal\nline"},{time:0,text:"<script>text</script>"}]));
  assert.equal(displayLrc(lines),'[00:00.000] <script>text</script>\n[01:01.125] [00:01.00] literal line');
  assert.equal(lyricLineIndex(lines,61.124),0); assert.equal(lyricLineIndex(lines,61.125),1);
});
test("instrumental/empty lyrics stay empty and seeking backwards selects the right line", () => {
  assert.deepEqual(displayLyricLines(track([{time:0,text:"wrong"}],true)),[]);
  assert.deepEqual(displayLyricLines(track([])),[]); assert.equal(lyricLineIndex([],0),-1);
  const lines=displayLyricLines(track([{time:10,text:"second"},{time:0,text:"first"}]));
  assert.equal(lyricLineIndex(lines,10),1); assert.equal(lyricLineIndex(lines,3),0);
});
