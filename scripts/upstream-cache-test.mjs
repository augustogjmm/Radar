import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const source=await fs.readFile(new URL('../api/[...path].js',import.meta.url),'utf8');
const {request,compactYahooChart}=await import('data:text/javascript;base64,'+Buffer.from(source+'\nexport {request,compactYahooChart};').toString('base64'));
test('upstream public reads are coalesced and warm-cached',async()=>{
 const previous=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;await new Promise(r=>setTimeout(r,10));return new Response('{"value":123}');};
 try{
  const values=await Promise.all([request('https://provider.test/read'),request('https://provider.test/read')]);
  assert.deepEqual(values,['{"value":123}','{"value":123}']);assert.equal(calls,1);
  await request('https://provider.test/read');assert.equal(calls,1);
 }finally{globalThis.fetch=previous;}
});
test('failed upstream responses are retried, never served as warm data',async()=>{
 const previous=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return new Response('denied',{status:403});};
 try{
  await assert.rejects(request('https://provider.test/failure'),/HTTP 403/);
  await assert.rejects(request('https://provider.test/failure'),/HTTP 403/);assert.equal(calls,2);
 }finally{globalThis.fetch=previous;}
});
test('HTTP 200 error envelopes remain retryable and arbitrary writes are not shared',async()=>{
 const previous=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return new Response('{"error":"unavailable"}');};
 try{
  await request('https://provider.test/error');await request('https://provider.test/error');assert.equal(calls,2);
  await Promise.all([request('https://provider.test/write',{method:'POST',body:{x:1}}),request('https://provider.test/write',{method:'POST',body:{x:1}})]);assert.equal(calls,4);
 }finally{globalThis.fetch=previous;}
});

test('close-only series are not converted into invented OHLC candles or volume',()=>{
 const result=compactYahooChart('SPY',{chart:{result:[{timestamp:[1,2],indicators:{quote:[{close:[100,101]}]}}]}});
 assert.equal(result.bars[0].open,null);assert.equal(result.bars[0].high,null);assert.equal(result.bars[0].low,null);assert.equal(result.bars[0].volume,null);
 assert.equal(result.last,101);
});
