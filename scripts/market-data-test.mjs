import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
const source=await fs.readFile(new URL('../runtime/01-market-data.js',import.meta.url),'utf8');
function environment(fetcher, storage=new Map()) {
 let now=Date.now();
 class Clock extends Date {static now(){return now;}}
 const window={fetch:fetcher,dispatchEvent(){}};
 const context={window,location:{origin:'https://radar.test'},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},URL,URLSearchParams,Response,AbortController,DOMException,CustomEvent:class{},Date:Clock,setTimeout,clearTimeout};
 vm.runInNewContext(source,context);
 return {window,advance:ms=>now+=ms,storage};
}
const fixture=()=>new Response(JSON.stringify({items:[{symbol:'SPY',ok:true,last:123,bars:[]}]}));
test('coalesces cache-busting requests and keeps the original observation time',async()=>{
 let calls=0;
 const e=environment(async()=>{calls++;await new Promise(r=>setTimeout(r,10));return fixture();});
 const [a,b]=await Promise.all([e.window.fetch('/api/yahoo-batch?symbols=SPY&_=1'),e.window.fetch('/api/yahoo-batch?_=2&symbols=SPY')]);
 assert.equal(calls,1);assert.deepEqual(await a.json(),await b.json());
 const time=e.window.RadarMarketData.quality(a).observedAt;
 e.advance(1000);
 const cached=await e.window.fetch('/api/yahoo-batch?symbols=SPY&_=3');
 assert.equal(calls,1);assert.equal(e.window.RadarMarketData.quality(cached).observedAt,time);
});
test('outages return a marked reference, suspend signals and do not refresh its timestamp',async()=>{
 let failed=false;
 const e=environment(async()=>failed?new Response('denied',{status:403}):fixture());
 const first=await e.window.fetch('/api/yahoo-batch?symbols=SPY');const time=e.window.RadarMarketData.quality(first).observedAt;
 failed=true;e.advance(301000);
 const fallback=await e.window.fetch('/api/yahoo-batch?symbols=SPY');const q=e.window.RadarMarketData.quality(fallback);
 assert.equal(fallback.status,200);assert.equal(q.state,'stale');assert.equal(q.observedAt,time);
 const bars=Array.from({length:40},(_,i)=>({time:Date.now()/1000-i,close:123}));
 assert.equal(e.window.RadarMarketData.canSignal(bars,q),false);
 e.advance(86400000);
 assert.equal((await e.window.fetch('/api/yahoo-batch?symbols=SPY')).status,503);
});
test('failed, empty and malformed responses cannot replace a usable cache',async()=>{
 let payload=fixture();const e=environment(async()=>payload);
 await e.window.fetch('/api/yahoo-batch?symbols=SPY');
 for(const text of ['<html>Error</html>','{"items":[]}','{"items":[{"ok":false}]}','{"error":"FAIL"}']) {
  payload=new Response(text);
  const r=await e.window.fetch('/api/yahoo-batch?symbols=SPY&fresh=1');
  assert.equal(e.window.RadarMarketData.quality(r).state,'stale');
  assert.equal((await r.json()).items[0].last,123);
 }
});
test('cancellation rejects one caller without cancelling another or returning cached data',async()=>{
 let release;const e=environment(()=>new Promise(resolve=>release=resolve));
 const controller=new AbortController();
 const cancelled=e.window.fetch('/api/yahoo-batch?symbols=SPY',{signal:controller.signal});
 const other=e.window.fetch('/api/yahoo-batch?symbols=SPY');
 controller.abort();await assert.rejects(cancelled,{name:'AbortError'});
 release(fixture());assert.equal((await other).status,200);
 await assert.rejects(e.window.fetch('/api/yahoo-batch?symbols=SPY',{signal:controller.signal}),{name:'AbortError'});
});
test('cache survives reload but expires and per-item failures remain unverified',async()=>{
 const first=environment(async()=>fixture());await first.window.fetch('/api/yahoo-batch?symbols=SPY');
 const e=environment(async()=>{throw new Error('offline');},first.storage);
 const r=await e.window.fetch('/api/yahoo-batch?symbols=SPY');assert.equal(e.window.RadarMarketData.quality(r).state,'verified');
 const data=await r.json();e.advance(301000);assert.equal(e.window.RadarMarketData.quality(data.items[0]).state,'stale');
 const partial=environment(async()=>new Response(JSON.stringify({items:[{ok:true,last:123},{ok:false,error:'missing'}]})));
 const items=(await (await partial.window.fetch('/api/yahoo-batch?symbols=A,B')).json()).items;
 assert.equal(partial.window.RadarMarketData.quality(items[0]).state,'verified');
 assert.equal(partial.window.RadarMarketData.quality(items[1]).state,'unavailable');
});
test('does not cache private state, writes or external destinations',async()=>{
 let calls=0;const e=environment(async()=>{calls++;return fixture();});
 for(const input of ['/api/config','/api/health/deep','https://other.test/api/yahoo']) {
  await e.window.fetch(input);await e.window.fetch(input);
 }
 await e.window.fetch('/api/yahoo',{method:'POST'});await e.window.fetch('/api/yahoo',{method:'POST'});
 assert.equal(calls,8);assert.equal(e.storage.size,0);
});
test('historical candles, missing timestamps and null values do not enable signals',()=>{
 const e=environment(async()=>fixture()),q={state:'verified',observedAt:Date.now(),ttl:300000,interval:'1h',crypto:true};
 const bars=Array.from({length:40},()=>({time:Date.now()/1000-18000,open:122,high:124,low:121,close:123}));
 assert.equal(e.window.RadarMarketData.canSignal(bars,q),false);
 bars.at(-1).time=Date.now()/1000-3600;assert.equal(e.window.RadarMarketData.canSignal(bars,q),true);
 bars.at(-1).time=null;assert.equal(e.window.RadarMarketData.canSignal(bars,q),false);
 assert.equal(e.window.RadarMarketData.usable({value:null}),false);
 assert.equal(e.window.RadarMarketData.usable({value:''}),false);
});


test('a forced failure invalidates cached provenance until the source succeeds again',async()=>{
 let failed=false;const e=environment(async()=>failed?new Response('offline',{status:503}):fixture());
 const first=await e.window.fetch('/api/yahoo-batch?symbols=SPY');const original=await first.json();
 failed=true;await e.window.fetch('/api/yahoo-batch?symbols=SPY&fresh=1');
 assert.equal(e.window.RadarMarketData.quality(original.items[0]).state,'stale');
 const repeated=await e.window.fetch('/api/yahoo-batch?symbols=SPY');assert.equal(e.window.RadarMarketData.quality(repeated).state,'stale');
 failed=false;const recovered=await e.window.fetch('/api/yahoo-batch?symbols=SPY');assert.equal(e.window.RadarMarketData.quality(recovered).state,'verified');
});
