import test from "node:test";
import assert from "node:assert/strict";
import { attachMusicAudio, musicActions, refreshMusicPlaylist } from "../src/lib/music-player-store";
import { musicTracks } from "../src/lib/music";
import { isTeyvatPath, teyvatNations } from "../src/lib/teyvat";

class FakeAudio extends EventTarget {
  src = ""; currentTime = 0; duration = 180; volume = .4; loop = false; paused = true; readyState = 0;
  error: { code: number } | null = null; playCalls = 0; loads = 0;
  rejectNext: Error | null = null;
  nextPlay: Promise<void> | null = null;
  load() {
    this.loads++; this.currentTime = 0; this.readyState = 0; this.error = null; this.paused = true;
    const source=this.src;
    queueMicrotask(() => { if (this.src !== source) return; this.readyState=1; this.dispatchEvent(new Event("loadedmetadata")); });
  }
  async play() {
    this.playCalls++;
    if (this.rejectNext) { const error=this.rejectNext;this.rejectNext=null;throw error; }
    if (this.nextPlay) { const promise=this.nextPlay;this.nextPlay=null;await promise; }
    this.paused=false;this.dispatchEvent(new Event("play"));this.dispatchEvent(new Event("playing"));
  }
  pause() { this.paused=true;this.dispatchEvent(new Event("pause")); }
  fail() { this.paused=true;this.error={code:4};this.dispatchEvent(new Event("error")); }
}
const tick = async () => { for (let i=0;i<10;i++) await new Promise(resolve=>setImmediate(resolve)); };

test("one shared audio restores global progress, handles route races and keeps region failures bounded", async () => {
  const originals={window:globalThis.window,document:globalThis.document,fetch:globalThis.fetch};
  const win=new EventTarget();const storage=new Map<string,string>();
  Object.assign(win,{setInterval:()=>0,clearInterval:()=>{},localStorage:{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)}});
  Object.assign(globalThis,{window:win,document:Object.assign(new EventTarget(),{visibilityState:"visible",hidden:false})});
  let catalogue: (()=>Promise<Response>) | null=null;
  let writes=0;
  globalThis.fetch=async (input, init) => {
    if(init?.method&&init.method!=="GET")writes++;
    if(String(input)==="/api/music")return catalogue ? catalogue() : Response.json([]);
    return Response.json({revision:"1",trackIds:musicTracks.map(track=>track.id),updatedAt:null,canEdit:true});
  };
  const audio=new FakeAudio(), detach=attachMusicAudio(audio as unknown as HTMLAudioElement);
  const [mondstadt,liyue,inazuma]=teyvatNations;
  try {
    await tick();
    musicActions.selectTrack(1,true);await tick();audio.currentTime=43.25;audio.dispatchEvent(new Event("timeupdate"));
    musicActions.enterTeyvat(mondstadt.slug,mondstadt.tracks,true);await tick();
    assert.equal(audio.src,mondstadt.tracks[0].src);assert.equal(audio.loop,true);assert.equal(audio.paused,false);
    const playingCalls=audio.playCalls;musicActions.syncTeyvat(mondstadt.slug,mondstadt.tracks);assert.equal(audio.playCalls,playingCalls);
    musicActions.volume(.23);
    musicActions.enterTeyvat(liyue.slug,liyue.tracks,true);await tick();assert.equal(audio.src,liyue.tracks[0].src);
    assert.equal(musicActions.moveTrack(liyue.tracks[0].id,1),false);
    musicActions.leaveTeyvat();await tick();assert.equal(audio.src,musicTracks[1].src);assert.equal(audio.currentTime,43.25);assert.equal(audio.paused,false);assert.equal(audio.volume,.23);assert.equal(audio.loop,false);
    musicActions.pause();audio.currentTime=18;
    musicActions.syncTeyvat(mondstadt.slug,mondstadt.tracks);await tick();assert.equal(audio.paused,true,"direct route waits for interaction");
    musicActions.enterTeyvat(mondstadt.slug,mondstadt.tracks,true);await tick();assert.equal(audio.paused,false);
    musicActions.leaveTeyvat();await tick();assert.equal(audio.src,musicTracks[1].src);assert.equal(audio.currentTime,18);assert.equal(audio.paused,true,"restore previous paused state");

    for (const home of ["/", "/#home-teyvat-map", "/#home-collection-title"]) {
      for (const start of [false, true]) {
        musicActions.selectTrack(1,start);await tick();audio.currentTime=27.75;audio.dispatchEvent(new Event("timeupdate"));
        musicActions.enterTeyvat(mondstadt.slug,mondstadt.tracks,true);await tick();
        musicActions.syncTeyvat(liyue.slug,liyue.tracks);await tick();
        assert.equal(audio.src,liyue.tracks[0].src);
        if (!isTeyvatPath(new URL(home,"https://muruiwen.cn").pathname)) musicActions.leaveTeyvat();
        await tick();
        assert.equal(audio.src,musicTracks[1].src,`${home}: restore the home song, not the last regional song`);
        assert.equal(audio.currentTime,27.75,`${home}: restore the saved progress`);
        assert.equal(audio.paused,!start,`${home}: restore the saved play/pause state`);
      }
    }

    let deliver!: (response:Response)=>void;
    catalogue=()=>new Promise(resolve=>{deliver=resolve;});
    const pending=refreshMusicPlaylist();
    musicActions.enterTeyvat(liyue.slug,liyue.tracks,true);
    deliver(Response.json([]));await pending;await tick();assert.equal(audio.src,liyue.tracks[0].src,"late catalogue cannot replace regional queue");catalogue=null;
    audio.fail();await tick();assert.equal(audio.src,liyue.tracks[1].src);
    const afterFirst=audio.loads;audio.fail();await tick();assert.equal(audio.src,liyue.tracks[1].src);assert.equal(audio.loads,afterFirst,"two failed regional tracks do not loop or enter the global queue");
    musicActions.enterTeyvat(liyue.slug,liyue.tracks,true);await tick();assert.equal(audio.src,liyue.tracks[0].src,"retry reloads the primary track");

    let reject!: (reason:Error)=>void;
    audio.nextPlay=new Promise((_,rejectPromise)=>{reject=rejectPromise;});
    musicActions.enterTeyvat(mondstadt.slug,mondstadt.tracks,true);
    musicActions.enterTeyvat(inazuma.slug,inazuma.tracks,true);await tick();
    reject(new Error("old source failed"));await tick();assert.equal(audio.src,inazuma.tracks[0].src,"old play rejection must not trigger fallback in the new region");
    musicActions.leaveTeyvat();musicActions.enterTeyvat(mondstadt.slug,mondstadt.tracks,true);await tick();assert.equal(audio.src,mondstadt.tracks[0].src,"late resume metadata cannot seek or restore over a new region");
    musicActions.leaveTeyvat();await tick();
    audio.rejectNext=new DOMException("blocked","NotAllowedError");musicActions.enterTeyvat(liyue.slug,liyue.tracks,true);await tick();assert.equal(audio.src,liyue.tracks[0].src,"autoplay block is not a broken-source fallback");
    musicActions.leaveTeyvat();await tick();
    assert.equal(writes,0,"travel never saves global queue or writes to the backend");
  } finally { musicActions.leaveTeyvat();detach();Object.assign(globalThis,originals); }
});
