/* Public market requests: bounded cache, shared requests and explicit provenance. */
(() => {
'use strict';
const transport = window.fetch.bind(window);
const STORE = 'radar_market_cache_v1', MAX_BYTES = 2500000, MAX_ENTRIES = 24;
const cache = new Map(), pending = new Map(), qualities = new WeakMap(), records = new Map();
const marketPath = /^\/api\/(?:yahoo(?:-batch)?|binance(?:\/universe)?|byma\/(?:history|scan-history|quote|equities|cedears|cedears-analysis|fixed-income)|dashboard\/(?:fx-current|history|inflation-current|risk)|fixed-income\/curve|local-rates|treasury(?:-curve|-series|-official-series))$/;
const ignored = new Set(['_', 'ts', 'fresh', 'quiet']);
function keyOf(url) {
 const params = [...url.searchParams].filter(([key]) => !ignored.has(key)).sort(([a,av],[b,bv]) => a.localeCompare(b) || av.localeCompare(bv));
 return url.pathname + '?' + new URLSearchParams(params);
}
function ttl(url) { return /history|yahoo|treasury|curve|local-rates/.test(url.pathname) ? 300000 : 60000; }
function usable(data) {
 if (!data || data.error || data.ok === false) return false;
 if (Array.isArray(data)) return data.length > 0;
 if (data.chart) return !!data.chart.result?.[0]?.timestamp?.length;
 if (Array.isArray(data.items)) return data.items.some(x => x && x.ok !== false && !x.error);
 if (Array.isArray(data.rows)) return data.rows.length > 0;
 if (Array.isArray(data.bonds)) return data.bonds.length > 0;
 if (data.s) return data.s === 'ok' && data.t?.length > 0;
 if ('quote' in data) return [data.quote?.trade,data.quote?.closingPrice,data.quote?.settlementPrice].some(x=>x!==null&&Number(x)>0);
 if (data.fx) return Object.values(data.fx).some(x => Number(x?.venta) > 0);
 if ('available' in data) return Number(data.available) > 0;
 if ('value' in data) return data.value !== null && data.value !== '' && Number.isFinite(Number(data.value));
 return Object.keys(data).length > 0;
}
function persist() {
 while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value);
 let bytes = 0;
 for (const [key, entry] of [...cache].reverse()) {
  bytes += entry.text.length;
  if (bytes > MAX_BYTES) cache.delete(key);
 }
 try { localStorage.setItem(STORE, JSON.stringify([...cache])); } catch { /* In-memory cache remains usable if storage is full or disabled. */ }
}
try {
 const raw = localStorage.getItem(STORE);
 if (raw && raw.length <= MAX_BYTES * 2) {
  const entries = JSON.parse(raw);
  if (Array.isArray(entries)) for (const pair of entries.slice(-MAX_ENTRIES)) {
   if (!Array.isArray(pair) || pair.length !== 2) continue;
   const [key,entry] = pair;
   if (typeof key === 'string' && typeof entry?.text === 'string' && Number.isFinite(entry.observedAt) && Date.now() - entry.observedAt < 86400000 && entry.observedAt <= Date.now()) {
    const url = new URL(key, location.origin);
    if (marketPath.test(url.pathname) && usable(JSON.parse(entry.text))) cache.set(key,entry);
   }
  }
 }
} catch { /* A damaged cache never blocks startup. */ }
function current(quality) {
 if (!quality) return null;
 const latest=quality.key?records.get(quality.key):null;
 const failed=latest&&(latest.state==='stale'||latest.state==='unavailable');
 return {...quality, state: quality.state === 'verified' && (failed||Date.now() - quality.observedAt > quality.ttl) ? 'stale' : quality.state};
}
function tag(value, quality) {
 const q = quality instanceof Response ? quality._radarQuality : quality;
 if (value && typeof value === 'object' && q) qualities.set(value,q);
 return value;
}
function quality(value) { return current(value?._radarQuality || value?.dataQuality || qualities.get(value)); }
function canSignal(bars, q = quality(bars)) {
 if (!q || q.state !== 'verified' || !Array.isArray(bars) || bars.length < 30) return false;
 const time = Number(bars.at(-1)?.time), interval = q.interval || '1d';
 const step = {'15m':900,'30m':1800,'1h':3600,'60m':3600,'4h':14400,'1d':86400,'1wk':604800,'1mo':2592000}[interval] || 86400;
 const maxAge = q.crypto ? step * 4 : Math.max(step * 4, 7 * 86400);
 const validPrices=bars.slice(-30).every(b=>['open','high','low','close'].every(k=>b[k]!==null&&b[k]!==''&&Number.isFinite(Number(b[k]))&&Number(b[k])>0)&&Number(b.high)>=Math.max(Number(b.open),Number(b.close))&&Number(b.low)<=Math.min(Number(b.open),Number(b.close)));
 return validPrices && Number.isFinite(time) && time > 0 && time * 1000 <= Date.now() + step * 1000 && Date.now() - time * 1000 <= maxAge * 1000;
}
function response(text,q,status=200,headers={}) {
 const r = new Response(text,{status,headers:{'content-type':'application/json','cache-control':'no-store',...headers,'x-radar-data-state':q.state,'x-radar-observed-at':String(q.observedAt || 0)}});
 Object.defineProperty(r,'_radarQuality',{value:q});
 const parse = r.json.bind(r);
 r.json = async () => {
  const value = await parse(); tag(value,q);
  if (value && typeof value === 'object') {
   for (const list of [value.items, value.bars, value.rows, value.bonds]) if (Array.isArray(list)) {
    tag(list,q); for (const item of list) tag(item,item?.ok === false || item?.error ? {...q,state:'unavailable'} : item?.status==='STALE'||item?.isLkg||item?.stale===true?{...q,state:'stale'}:q);
   }
  }
  return value;
 };
 return r;
}
function notify(key,q) {
 records.set(key,q);
 if (records.size > 100) records.delete(records.keys().next().value);
 window.dispatchEvent(new CustomEvent('radar:data-quality'));
}
async function request(input,init,url,key) {
 const saved = cache.get(key), forced = url.searchParams.get('fresh') === '1';
 if (!forced && saved && !saved.invalidated && Date.now() - saved.observedAt < ttl(url)) {
  const q = {state:'verified',observedAt:saved.observedAt,ttl:ttl(url),cached:true,key}; notify(key,q);
  return response(saved.text,q);
 }
 const ctrl = new AbortController(); let timer;
 try {
  const deadline = new Promise((_, reject) => { timer = setTimeout(() => {ctrl.abort(); reject(new Error('Tiempo de consulta agotado'));},25000); });
  const r = await Promise.race([transport(input,{...init,signal:ctrl.signal}),deadline]);
  const text = await r.text(); let data;
  try { data = JSON.parse(text); } catch { throw new Error('Respuesta de mercado inválida'); }
  if (!r.ok || !usable(data)) throw new Error('Fuente no disponible' + (r.ok ? '' : ' (HTTP ' + r.status + ')'));
  const observedAt = Date.now(), q = {state:data.status==='STALE'||data.isLkg||data.stale===true?'stale':'verified',observedAt,ttl:ttl(url),cached:false,key};
  if(q.state==='verified'){cache.delete(key); cache.set(key,{text,observedAt}); persist();} notify(key,q);
  return response(text,q,r.status);
 } catch(error) {
  if(saved){saved.invalidated=true;persist();}
  const q = {state:'unavailable',observedAt:0,ttl:ttl(url),key,error:String(error?.message || error)};
  if (saved && Date.now() - saved.observedAt < 86400000) {
   q.state = 'stale'; q.observedAt = saved.observedAt; q.cached = true; notify(key,q);
   return response(saved.text,q);
  }
  notify(key,q);
  return response(JSON.stringify({error:'MARKET_UNAVAILABLE',message:q.error}),q,503);
 } finally {clearTimeout(timer);}
}
function subscribe(job,signal) {
 if (!signal) return job;
 if (signal.aborted) return Promise.reject(new DOMException('Consulta cancelada','AbortError'));
 return new Promise((resolve,reject) => {
  const abort = () => reject(new DOMException('Consulta cancelada','AbortError'));
  signal.addEventListener('abort',abort,{once:true});
  job.then(resolve,reject).finally(() => signal.removeEventListener('abort',abort));
 });
}
window.fetch = async (input,init={}) => {
 let url;
 try {url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url,location.origin);} catch {return transport(input,init);}
 const method = String(init.method || input?.method || 'GET').toUpperCase();
 if (url.origin !== location.origin || method !== 'GET' || !marketPath.test(url.pathname)) return transport(input,init);
 const signal = init.signal || input?.signal;
 if (signal?.aborted) throw new DOMException('Consulta cancelada','AbortError');
 const key = keyOf(url), id = key + (url.searchParams.get('fresh') === '1' ? '|force' : '');
 if (!pending.has(id)) {
  const job = request(input,init,url,key).finally(() => pending.delete(id)); pending.set(id,job);
 }
 const result = await subscribe(pending.get(id),signal);
 return response(await result.clone().text(),result._radarQuality,result.status);
};
window.RadarMarketData = Object.freeze({tag,quality,canSignal,usable,keyOf,summary:() => [...records.values()].map(current)});
})();
