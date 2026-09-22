const UA='Mozilla/5.0 RadarTecnico/5.0';
const BYMA='https://open.bymadata.com.ar/vanoms-be-core/rest/api/bymadata/free';

function send(res,status,body,headers={}){
  res.statusCode=status;
  res.setHeader('content-type',typeof body==='string'?'text/plain; charset=utf-8':'application/json; charset=utf-8');
  res.setHeader('cache-control','public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  for(const [k,v] of Object.entries(headers))res.setHeader(k,v);
  res.end(typeof body==='string'?body:JSON.stringify(body));
}
function arr(x){
  return Array.isArray(x)?x:
    Array.isArray(x?.results)?x.results:
    Array.isArray(x?.data)?x.data:
    Array.isArray(x?.data?.results)?x.data.results:
    Array.isArray(x?.content?.data)?x.content.data:
    x&&x.symbol?[x]:[];
}
function num(v){
  if(typeof v==='number')return Number.isFinite(v)?v:null;
  let s=String(v??'').trim().replace(/\s+/g,'').replace(/%/g,'');
  if(!s)return null;
  if(s.includes(',')&&s.includes('.')){
    if(s.lastIndexOf(',')>s.lastIndexOf('.'))s=s.replace(/\./g,'').replace(',','.');
    else s=s.replace(/,/g,'');
  }else if(s.includes(',')){
    s=s.replace(',','.');
  }
  const n=Number(s);return Number.isFinite(n)?n:null;
}
function plain(html){
  return String(html||'')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;|&#160;/gi,' ')
    .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'")
    .replace(/\s+/g,' ').trim();
}
function arDate(){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}
function dateAr(v){
  const d=new Date(v);if(!Number.isFinite(d.getTime()))return String(v||'');
  return new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'2-digit',month:'2-digit',year:'numeric'}).format(d);
}
function spanishDateIso(day,month,year){
  const m={enero:'01',febrero:'02',marzo:'03',abril:'04',mayo:'05',junio:'06',julio:'07',agosto:'08',septiembre:'09',setiembre:'09',octubre:'10',noviembre:'11',diciembre:'12'}[String(month||'').toLowerCase()];
  return m?String(year).padStart(4,'0')+'-'+m+'-'+String(day).padStart(2,'0'):'';
}
async function request(url,{method='GET',body,timeout=16000,headers={}}={}){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);
  try{
    const r=await fetch(url,{method,body:body===undefined?undefined:JSON.stringify(body),signal:c.signal,headers:{'user-agent':UA,'accept':'application/json,text/plain,*/*',...(body===undefined?{}:{'content-type':'application/json'}),...headers}});
    const text=await r.text();
    if(!r.ok)throw new Error('HTTP '+r.status+' '+text.slice(0,240));
    return text;
  }finally{clearTimeout(t)}
}
async function getJson(url,opt){return JSON.parse(await request(url,opt))}
async function postByma(endpoint,body={page_size:5000}){return JSON.parse(await request(BYMA+'/'+endpoint,{method:'POST',body,timeout:22000}))}
function uniqueBest(rows){
  const m=new Map();
  for(const x of rows){
    const s=String(x?.symbol||'').trim().toUpperCase(); if(!s)continue;
    const score=(num(x.volumeAmount)||0)+(num(x.tradeVolume)||0)+(num(x.volume)||0);
    const prev=m.get(s),prevScore=prev?((num(prev.volumeAmount)||0)+(num(prev.tradeVolume)||0)+(num(prev.volume)||0)):-1;
    if(!prev||score>prevScore)m.set(s,x);
  }
  return [...m.values()];
}
async function fxCurrent(){
  let rows=[];
  try{
    const x=await getJson('https://dolarapi.com/v1/dolares',{timeout:9000});
    if(Array.isArray(x))rows=x;
  }catch{}
  if(!rows.length){
    const defs=[['oficial','https://dolarapi.com/v1/dolares/oficial'],['bolsa','https://dolarapi.com/v1/dolares/bolsa'],['contadoconliqui','https://dolarapi.com/v1/dolares/contadoconliqui']];
    const out=await Promise.allSettled(defs.map(async ([c,u])=>({...(await getJson(u,{timeout:9000})),casa:c})));
    rows=out.filter(x=>x.status==='fulfilled').map(x=>x.value);
  }
  const pick=(casa)=>{
    const x=rows.find(r=>String(r.casa||'').toLowerCase()===casa);
    return x?{compra:num(x.compra),venta:num(x.venta),changePct:num(x.variacion),fecha:x.fechaActualizacion||'',source:'DolarApi'}:{compra:null,venta:null,changePct:null,fecha:'',source:'No disponible'};
  };
  const fx={mep:pick('bolsa'),ccl:pick('contadoconliqui'),official:pick('oficial')};
  for(const [k,series] of [['mep','mep'],['ccl','ccl'],['official','official']]){
    const x=fx[k];if(x.venta===null)continue;
    if(x.changePct===null){
      try{
        const h=await history(series,5),today=String(x.fecha||arDate()).slice(0,10);
        const prev=[...h].reverse().find(r=>String(r.date)<today&&num(r.value)!==null);
        if(prev&&num(prev.value)!==0)x.changePct=(x.venta/num(prev.value)-1)*100;
      }catch{}
    }
  }
  return {updated:new Date().toISOString(),fx};
}
async function history(series,limit=240){
  const map={
    risk:['https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais','index'],
    inflation:['https://api.argentinadatos.com/v1/finanzas/indices/inflacion','index'],
    mep:['https://api.argentinadatos.com/v1/cotizaciones/dolares/bolsa','fx'],
    ccl:['https://api.argentinadatos.com/v1/cotizaciones/dolares/contadoconliqui','fx'],
    official:['https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial','fx']
  };
  const spec=map[series];if(!spec)throw new Error('Serie inválida');
  const x=await getJson(spec[0],{timeout:12000});
  const rows=arr(x).map(r=>{
    const date=String(r.fecha||r.date||'').slice(0,10);
    const value=num(spec[1]==='fx'?(r.venta??r.value):(r.valor??r.value));
    return {date,value,fecha:date,valor:value};
  }).filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&r.value!==null)
    .sort((a,b)=>a.date.localeCompare(b.date));
  return rows.slice(-limit);
}
async function riskNow(){
  const hist=await history('risk',10).catch(()=>[]);
  const previousFor=(date)=>[...hist].reverse().find(r=>r.date<date)?.value??(hist.length>1?hist.at(-2)?.value:null);
  try{
    const html=await request('https://www.rava.com/cotizaciones/historico/riesgo-pais/hoy/',{timeout:9000,headers:{accept:'text/html,*/*'}});
    const t=plain(html);
    const mv=t.match(/Riesgo\s+Pa[ií]s\s+hoy\s*:?\s*([0-9]{2,5})/i)||t.match(/([0-9]{2,5})\s+puntos\s+b[aá]sicos/i);
    const md=t.match(/Actualizado\s+al\s+(\d{1,2})\s+de\s+([A-Za-zÁÉÍÓÚáéíóú]+)\s+de\s+(\d{4})/i);
    const value=mv?num(mv[1]):null,date=md?spanishDateIso(md[1],md[2],md[3]):arDate();
    if(value!==null){
      const mp=t.match(/Cierre\s+anterior\s+([0-9]{2,5})/i),previous=mp?num(mp[1]):previousFor(date);
      return {value,previous,change:value!==null&&previous!==null?value-previous:null,date,source:'Rava Bursátil · Riesgo País',fallback:false,status:'ACTUAL',verifiedAt:new Date().toISOString()};
    }
  }catch{}
  try{
    const x=await getJson('https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais/ultimo',{timeout:8000});
    const value=num(x.valor??x.value),date=String(x.fecha||x.date||'').slice(0,10)||hist.at(-1)?.date||arDate(),previous=previousFor(date);
    if(value!==null)return {value,previous,change:previous!==null?value-previous:null,date,source:'ArgentinaDatos · riesgo país',fallback:true,status:'ACTUAL',verifiedAt:new Date().toISOString()};
  }catch{}
  if(hist.length){
    const q=hist.at(-1),p=hist.length>1?hist.at(-2):null;
    return {value:q.value,previous:p?.value??null,change:p?q.value-p.value:null,date:q.date,source:'ArgentinaDatos · histórico',fallback:true,status:'STALE',verifiedAt:new Date().toISOString()};
  }
  return {value:null,previous:null,change:null,date:'',source:'No disponible',fallback:true,status:'STALE'};
}
async function inflationNow(){
  const rows=await history('inflation',240);
  return {rows:rows.map(r=>({fecha:r.date,valor:r.value})),source:'ArgentinaDatos / BCRA'};
}
async function yahoo(url){
  const s=url.searchParams.get('symbol')||'SPY',interval=url.searchParams.get('interval')||'1d',range=url.searchParams.get('range')||'6mo';
  let last='';
  for(const host of ['query1.finance.yahoo.com','query2.finance.yahoo.com']){
    try{
      const u='https://'+host+'/v8/finance/chart/'+encodeURIComponent(s)+'?interval='+encodeURIComponent(interval)+'&range='+encodeURIComponent(range)+'&includePrePost=false&events=div%2Csplits';
      return JSON.parse(await request(u,{timeout:18000,headers:{accept:'application/json'}}));
    }catch(e){last=String(e.message||e)}
  }
  throw new Error('Yahoo Finance: '+last);
}
function compactYahooChart(symbol,payload,source='Yahoo Finance'){
  const r=payload?.chart?.result?.[0];if(!r)return {symbol,ok:false,error:'Sin datos',bars:[]};
  const ts=Array.isArray(r.timestamp)?r.timestamp:[],cl=Array.isArray(r?.indicators?.quote?.[0]?.close)?r.indicators.quote[0].close:[],bars=[];
  for(let i=0;i<Math.min(ts.length,cl.length);i++){const c=num(cl[i]);if(c!==null)bars.push({time:Number(ts[i]),close:c})}
  let last=bars.at(-1)?.close??num(r?.meta?.regularMarketPrice),previous=bars.length>1?bars.at(-2)?.close:num(r?.meta?.chartPreviousClose),time=bars.at(-1)?.time??Math.floor(Date.now()/1000);
  if(last===null)return {symbol,ok:false,error:'Sin cotización',bars};
  const changePct=previous!==null&&previous!==0?(last/previous-1)*100:null;
  return {symbol,ok:true,last,previous,changePct,time,bars,source};
}
async function yahooBatch(url){
  const raw=String(url.searchParams.get('symbols')||''),range=url.searchParams.get('range')||'6mo',interval=url.searchParams.get('interval')||'1d';
  const symbols=[...new Set(raw.split(',').map(x=>x.trim()).filter(Boolean))].slice(0,40);
  if(!symbols.length)throw new Error('symbols requerido');
  const encoded=symbols.map(encodeURIComponent).join(',');
  let items=[],lastErr='';
  for(const host of ['query1.finance.yahoo.com','query2.finance.yahoo.com']){
    try{
      const u='https://'+host+'/v7/finance/spark?symbols='+encoded+'&range='+encodeURIComponent(range)+'&interval='+encodeURIComponent(interval)+'&indicators=close&includeTimestamps=true&includePrePost=false&corsDomain=finance.yahoo.com&.tsrc=finance';
      const j=JSON.parse(await request(u,{timeout:18000,headers:{accept:'application/json'}}));
      if(j?.spark?.error)throw new Error(j.spark.error.description||'Yahoo Spark error');
      const found=new Map();
      for(const x of (j?.spark?.result||[])){
        const symbol=String(x?.symbol||'').trim(),r=Array.isArray(x?.response)?x.response[0]:null;if(!symbol||!r)continue;
        const payload={chart:{result:[r]}},q=compactYahooChart(symbol,payload,'Yahoo Finance Spark');found.set(symbol,q);
      }
      items=symbols.map(symbol=>found.get(symbol)||{symbol,ok:false,error:'Sin datos en Yahoo Spark',bars:[]});
      if(items.some(x=>x.ok))break;
    }catch(e){lastErr=String(e.message||e);items=[]}
  }
  if(!items.length||!items.some(x=>x.ok)){
    const out=await Promise.allSettled(symbols.map(async symbol=>{
      const u=new URL('https://radar.local/api/yahoo');u.searchParams.set('symbol',symbol);u.searchParams.set('range',range);u.searchParams.set('interval',interval);
      return compactYahooChart(symbol,await yahoo(u),'Yahoo Finance Chart');
    }));
    items=out.map((r,i)=>r.status==='fulfilled'?r.value:{symbol:symbols[i],ok:false,error:String(r.reason?.message||r.reason||lastErr||'Yahoo sin datos'),bars:[]});
  }
  return {source:'Yahoo Finance',updated:new Date().toISOString(),count:items.length,items};
}
async function binanceKlines(url){
  const symbol=(url.searchParams.get('symbol')||'BTCUSDT').replace(/[\/-]/g,'').toUpperCase(),interval=url.searchParams.get('interval')||'1h';
  return await getJson('https://api.binance.com/api/v3/klines?symbol='+encodeURIComponent(symbol)+'&interval='+encodeURIComponent(interval)+'&limit=1000',{timeout:16000});
}
async function binanceUniverse(url){
  const top=Math.max(0,Number(url.searchParams.get('top'))||0);
  const [ex,tickers]=await Promise.all([
    getJson('https://api.binance.com/api/v3/exchangeInfo',{timeout:18000}),
    getJson('https://api.binance.com/api/v3/ticker/24hr',{timeout:18000})
  ]);
  const vol=new Map((Array.isArray(tickers)?tickers:[]).map(x=>[x.symbol,Number(x.quoteVolume)||0]));
  let items=(ex.symbols||[]).filter(x=>x.status==='TRADING'&&x.quoteAsset==='USDT'&&x.isSpotTradingAllowed!==false).map(x=>({symbol:x.symbol,baseAsset:x.baseAsset,quoteAsset:x.quoteAsset,quoteVolume:vol.get(x.symbol)||0})).sort((a,b)=>b.quoteVolume-a.quoteVolume||a.symbol.localeCompare(b.symbol));
  const totalAvailable=items.length;if(top>0)items=items.slice(0,top);
  return {source:'Binance Spot exchangeInfo',updated:new Date().toISOString(),count:items.length,totalAvailable,top,items};
}
async function bymaEquities(url){
  const mode=url.searchParams.get('mode')||'all';
  const [l,g]=await Promise.allSettled([postByma('leading-equity',{T1:true,page_size:5000}),postByma('general-equity',{T1:true,page_size:5000})]);
  const leading=l.status==='fulfilled'?arr(l.value):[],general=g.status==='fulfilled'?arr(g.value):[];
  const leadingSet=new Set(leading.map(x=>String(x.symbol||'').toUpperCase()));
  let items=uniqueBest([...leading,...general].filter(x=>!x.securityType||x.securityType==='CS').filter(x=>!x.market||x.market==='BYMA').filter(x=>!x.denominationCcy||String(x.denominationCcy).toUpperCase()==='ARS')).map(x=>({symbol:String(x.symbol).toUpperCase(),trade:num(x.trade),volume:num(x.volume),volumeAmount:num(x.volumeAmount),settlementType:String(x.settlementType??''),sourcePanel:leadingSet.has(String(x.symbol||'').toUpperCase())?'Lider':'General'})).sort((a,b)=>a.symbol.localeCompare(b.symbol));
  if(mode==='leading')items=items.filter(x=>x.sourcePanel==='Lider'); if(mode==='general')items=items.filter(x=>x.sourcePanel==='General');
  return {source:'Open BYMADATA leading-equity + general-equity',updated:new Date().toISOString(),mode,count:items.length,leadingCount:leadingSet.size,generalCount:new Set(general.map(x=>x.symbol)).size,errors:[],items};
}
async function bymaCedears(url){
  const liquidOnly=url.searchParams.get('liquid')==='1';
  let x=await postByma('cedears',{page_size:5000}),rows=arr(x);
  if(!rows.length){x=await postByma('cedears',{});rows=arr(x)}
  const ars=rows.filter(x=>!x.denominationCcy||String(x.denominationCcy).toUpperCase()==='ARS');if(ars.length)rows=ars;
  const settled=rows.filter(x=>!x.settlementType||String(x.settlementType)==='2');if(settled.length)rows=settled;
  let items=uniqueBest(rows).map(x=>({symbol:String(x.symbol||'').toUpperCase(),trade:num(x.trade),closingPrice:num(x.closingPrice),volume:num(x.volume),tradeVolume:num(x.tradeVolume),volumeAmount:num(x.volumeAmount),tradeHour:String(x.tradeHour||''),settlementType:String(x.settlementType||''),denominationCcy:String(x.denominationCcy||'')})).sort((a,b)=>(b.volumeAmount||0)-(a.volumeAmount||0)||a.symbol.localeCompare(b.symbol));
  const liquidCount=items.filter(x=>(x.volume||0)>0||(x.tradeVolume||0)>0||(x.volumeAmount||0)>0).length;
  if(liquidOnly&&liquidCount)items=items.filter(x=>(x.volume||0)>0||(x.tradeVolume||0)>0||(x.volumeAmount||0)>0);
  return {source:'Open BYMADATA /cedears',updated:new Date().toISOString(),liquidOnly,liquidCount,count:items.length,rawCount:rows.length,filterMode:'WEB+ARS+24hs',items};
}
async function bymaHistory(url){
  const symbol=String(url.searchParams.get('symbol')||'').toUpperCase().replace('.BA',''),days=Math.max(30,Number(url.searchParams.get('days'))||7300);
  if(!symbol)throw new Error('Ticker vacío');
  const from=Math.floor((Date.now()-days*86400000)/1000),to=Math.floor((Date.now()+86400000)/1000);
  return await getJson(BYMA+'/chart/historical-series/history?symbol='+encodeURIComponent(symbol+' 24HS')+'&resolution=D&from='+from+'&to='+to,{timeout:18000});
}
async function bymaQuote(url){
  const symbol=String(url.searchParams.get('symbol')||'').toUpperCase().replace('.BA','');if(!symbol)throw new Error('Ticker vacío');
  const x=await postByma('bnown/fichatecnica/especies/cotizacion',{symbol,settlementType:'2','Content-Type':'application/json'});
  const rows=arr(x);if(!rows.length)throw new Error('BYMA no devolvió cotización para '+symbol);
  return {quote:rows[0],serverTime:Math.floor(Date.now()/1000)};
}
async function bymaFixedIncome(url){
  const kind=(url.searchParams.get('kind')||'all').toLowerCase(),currency=(url.searchParams.get('currency')||'ALL').toUpperCase(),liquid=url.searchParams.get('liquid')==='1';
  const [pub,on]=await Promise.allSettled([postByma('public-bonds',{page_size:5000}),postByma('negociable-obligations',{page_size:5000})]);
  const publicRows=pub.status==='fulfilled'?arr(pub.value):[],onRows=on.status==='fulfilled'?arr(on.value):[];
  const norm=(x,type)=>({symbol:String(x.symbol||'').trim().toUpperCase(),type,category:type==='on'?'ON':'Soberano',securityType:String(x.securityType||''),denominationCcy:String(x.denominationCcy||''),settlementType:String(x.settlementType||''),maturityDate:String(x.maturityDate||''),daysToMaturity:num(x.daysToMaturity),trade:num(x.trade),closingPrice:num(x.closingPrice),volume:num(x.volume),tradeVolume:num(x.tradeVolume),volumeAmount:num(x.volumeAmount)});
  let items=[...publicRows.map(x=>norm(x,'bond')),...onRows.map(x=>norm(x,'on'))].filter(x=>x.symbol);
  if(kind==='on')items=items.filter(x=>x.type==='on'); else if(kind!=='all')items=items.filter(x=>x.type!=='on');
  if(currency!=='ALL')items=items.filter(x=>String(x.denominationCcy).toUpperCase()===currency);
  if(liquid)items=items.filter(x=>(x.volume||0)>0||(x.tradeVolume||0)>0||(x.volumeAmount||0)>0);
  items=uniqueBest(items).sort((a,b)=>(b.volumeAmount||0)-(a.volumeAmount||0)||a.symbol.localeCompare(b.symbol));
  return {source:'Open BYMADATA public-bonds + negociable-obligations',updated:new Date().toISOString(),count:items.length,kind,currency,liquidOnly:liquid,items};
}
async function cedearPrograms(){
  const html=await request('https://www.comafi.com.ar/Programas-CEDEARs-2483.note.aspx',{timeout:18000,headers:{accept:'text/html,*/*'}});
  const clean=s=>String(s||'').replace(/<[^>]+>/gs,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/\s+/g,' ').trim();
  const items=[];
  for(const rm of html.matchAll(/<tr\b[^>]*>(.*?)<\/tr>/gis)){
    const cells=[...rm[1].matchAll(/<t[dh]\b[^>]*>(.*?)<\/t[dh]>/gis)].map(x=>clean(x[1])); if(cells.length<7)continue;
    const m=String(cells[2]).match(/(\d+(?:[.,]\d+)?)\s*:\s*(\d+(?:[.,]\d+)?)/);if(!m)continue;
    const cedears=Number(m[1].replace(',','.')),underlyingUnits=Number(m[2].replace(',','.'));if(!(cedears>0&&underlyingUnits>0))continue;
    const symbol=String(cells[5]||'').trim().toUpperCase().replace(/\*+$/,'');let underlying=String(cells[6]||'').trim().toUpperCase().replace(/\s+EQUITY$/,'').trim();
    const mm=underlying.match(/^([A-Z0-9.\-]{1,12})\s+(US|UN|UW|UQ|UR|UA|LI|LN|GY|GR|FP|IM|SM|NA|HK|JP|CN)$/);if(mm)underlying=mm[1];
    if(symbol)items.push({symbol,underlying,program:cells[0],ratioText:cells[2],cedears,underlyingUnits,ratioFactor:cedears/underlyingUnits,sector:cells[12]||'',source:'Banco Comafi · Programas CEDEARs'});
  }
  const seen=new Set(),unique=[];for(const x of items.sort((a,b)=>a.symbol.localeCompare(b.symbol)))if(!seen.has(x.symbol)){seen.add(x.symbol);unique.push(x)}
  return {source:'Banco Comafi · Programas CEDEARs',sourceUrl:'https://www.comafi.com.ar/Programas-CEDEARs-2483.note.aspx',updated:new Date().toISOString(),count:unique.length,items:unique};
}
async function fred(series,range='1y'){
  const csv=await request('https://fred.stlouisfed.org/graph/fredgraph.csv?id='+encodeURIComponent(series),{timeout:16000,headers:{accept:'text/csv,*/*'}});
  const lines=csv.trim().split(/\r?\n/).slice(1),days={'1mo':31,'3mo':93,'6mo':186,'1y':366,'2y':732,'5y':1830,'10y':3660}[range]||366;
  const cutoff=Date.now()-days*86400000,rows=[];
  for(const line of lines){const [date,val]=line.split(','),value=num(val),ms=Date.parse(date);if(ms>=cutoff&&value!==null)rows.push({date,value,time:Math.floor(ms/1000),close:value})}
  return rows;
}
async function treasuryCurve(){
  const defs=[['1M','DGS1MO'],['3M','DGS3MO'],['6M','DGS6MO'],['1Y','DGS1'],['2Y','DGS2'],['3Y','DGS3'],['5Y','DGS5'],['7Y','DGS7'],['10Y','DGS10'],['20Y','DGS20'],['30Y','DGS30']];
  const settled=await Promise.allSettled(defs.map(async ([tenor,series])=>{const r=await fred(series,'1mo'),z=r.at(-1);return z?{tenor,value:z.value,date:z.date,series}:null}));
  const curve=settled.filter(x=>x.status==='fulfilled'&&x.value).map(x=>x.value);
  return {source:'FRED / U.S. Treasury',updated:new Date().toISOString(),curve,points:curve.map(x=>({label:x.tenor,yield:x.value,date:x.date,series:x.series}))};
}
async function lastSeries(url,source){
  try{
    const rows=arr(await getJson(url,{timeout:10000})).map(x=>({date:String(x.fecha||x.date||'').slice(0,10),value:num(x.valor??x.value)})).filter(x=>x.value!==null).sort((a,b)=>a.date.localeCompare(b.date));
    const q=rows.at(-1);return q?{value:q.value,date:q.date,source}:null;
  }catch{return null}
}
async function caucionByma(){
  try{
    const x=await postByma('cauciones',{page_size:5000});
    const rows=arr(x).map(r=>{
      const value=num(r.vwap_price??r.vwapPrice??r.vwap??r.trade??r.closing_price??r.closingPrice);
      const currency=String(r.currency??r.denominationCcy??r.currencyCode??'').toUpperCase();
      const symbol=String(r.symbol??'').toUpperCase();
      const settle=String(r.settlDate??r.settlementDate??r.settlement_date??'').replace(/\D/g,'');
      let days=999;
      if(/^\d{8}$/.test(settle)){
        const dt=Date.UTC(Number(settle.slice(0,4)),Number(settle.slice(4,6))-1,Number(settle.slice(6,8)));
        days=Math.max(0,Math.round((dt-Date.now())/86400000));
      }
      return {value,currency,symbol,days,date:String(r.Date??r.date??arDate())};
    }).filter(r=>r.value!==null&&r.value>0&&r.value<300&&(r.currency==='ARS'||!r.currency));
    if(!rows.length)return null;
    rows.sort((a,b)=>(a.symbol==='PESOS'?0:1)-(b.symbol==='PESOS'?0:1)||Math.abs(a.days-1)-Math.abs(b.days-1));
    const q=rows[0];
    return {value:q.value,date:q.date,source:'Open BYMADATA · caución ARS'};
  }catch{return null}
}
async function localRates(){
  let catalog=null;
  try{catalog=await getJson('https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias?Limit=3000',{timeout:12000,headers:{'accept-language':'es-AR'}})}catch{}
  const bcra=(id,min,max)=>{
    const r=arr(catalog).find(x=>Number(x.idVariable)===id),value=num(r?.ultValorInformado);
    return r&&value!==null&&value>=min&&value<=max?{value,date:dateAr(r.ultFechaInformada),source:'BCRA API v4.0',idVariable:id}:null;
  };
  let tamar=bcra(44,0,300),badlar=bcra(7,0,300),tm20=bcra(8,0,300),cer=bcra(30,0,100000),uva=bcra(31,0,1000000);
  if(!tamar||!badlar||!tm20){
    try{
      const t=plain(await request('https://www.bcra.gob.ar/principales-variables/',{timeout:10000,headers:{accept:'text/html,*/*'}}));
      const page=(label)=>{
        const safe=String(label).replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&'),m=t.match(new RegExp(safe+'\\s*\\(en\\s*%\\s*n\\.?a\\.?\\)\\s*(\\d{2}\\/\\d{2}\\/\\d{4})\\s*([0-9]+(?:[\\.,][0-9]+)?)','i')),value=m?num(m[2]):null;
        return value!==null&&value>0&&value<300?{value,date:m[1],source:'BCRA Principales Variables'}:null;
      };
      tamar=tamar||page('TAMAR en pesos de bancos privados');
      badlar=badlar||page('BADLAR en pesos de bancos privados');
      tm20=tm20||page('TM20 en pesos de bancos privados');
    }catch{}
  }
  const deposit30=tm20||await lastSeries('https://api.argentinadatos.com/v1/finanzas/tasas/depositos30Dias','ArgentinaDatos / BCRA · depósitos 30d');
  uva=uva||await lastSeries('https://api.argentinadatos.com/v1/finanzas/indices/uva','ArgentinaDatos / BCRA · UVA');
  let caucion=null;
  try{
    const t=plain(await request('https://www.byma.com.ar/',{timeout:9000,headers:{accept:'text/html,*/*'}})),m=t.match(/[IÍ]ndice\s+Cauci[oó]n\s+BYMA\s+([0-9]+(?:[\.,][0-9]+)?)/i),value=m?num(m[1]):null;
    if(value!==null&&value>0&&value<300)caucion={value,date:dateAr(new Date()),source:'BYMA · Índice Caución BYMA'};
  }catch{}
  if(!caucion)caucion=await caucionByma();
  const values=[caucion,tamar,badlar,tm20||deposit30,cer,uva],available=values.filter(Boolean).length;
  return {source:available?'BCRA API v4.0 · BYMA · ArgentinaDatos':'Fuentes oficiales no disponibles',updated:new Date().toISOString(),available,caucion,tamar,badlar,tm20,deposit30,cer,uva};
}
async function mervalUsd(){
  let value=null,changePct=null,source='';
  try{
    const t=plain(await request('https://www.byma.com.ar/',{timeout:9000,headers:{accept:'text/html,*/*'}})),m=t.match(/S&P\s+Merval\s+USD\s+([0-9\.,]+)\s+([+-]?[0-9\.,]+)/i);
    if(m){value=num(m[1]);changePct=num(m[2]);source='BYMA · SPMERVDT'}
  }catch{}
  if(value===null||value<=0){
    try{
      const t=plain(await request('https://www.max.capital/mercados/cotizaciones/indices/',{timeout:9000,headers:{accept:'text/html,*/*'}})),m=t.match(/SPMERVDT.*?([+-]?[0-9\.,]+)%.*?([0-9\.,]+)/i);
      if(m){changePct=num(m[1]);value=num(m[2]);source='Max Capital / BYMA'}
    }catch{}
  }
  if(value===null||value<=0){
    const u=new URL('https://radar.local/api/yahoo');u.searchParams.set('symbol','^MERV');u.searchParams.set('range','5d');u.searchParams.set('interval','1d');
    const q=compactYahooChart('^MERV',await yahoo(u),'Yahoo Finance'),fx=await fxCurrent(),mep=num(fx?.fx?.mep?.venta);
    if(q.ok&&mep!==null&&mep>0){value=q.last/mep;changePct=q.changePct;source='Proxy ^MERV / MEP · Yahoo + DolarApi'}
  }
  if(value===null||value<=0)throw new Error('SPMERVDT no disponible');
  return {value,changePct,symbol:'SPMERVDT',name:'S&P Merval USD (MEP)',source,updated:new Date().toISOString(),official:/BYMA|Max Capital/.test(source)};
}
async function fixedIncomeCurve(){
  const x=await getJson('https://compararfondos.com.ar/api/bonos',{timeout:18000});
  const rows=Array.isArray(x?.bonds)?x.bonds:arr(x),bonds=[];
  for(const b of rows){
    const ticker=String(b?.ticker||'').trim().toUpperCase(),tir=num(b?.tir),duration=num(b?.duration),paridad=num(b?.paridad);
    if(!/^(AL|GD|AE)/.test(ticker)||tir===null||duration===null||tir<=0||duration<=0)continue;
    bonds.push({ticker,tir,duration,paridad});
  }
  bonds.sort((a,b)=>a.duration-b.duration);
  return {source:'CompararFondos · curva soberana',updated:new Date().toISOString(),bonds};
}
async function handler(req,res){
  if(!['GET','POST','OPTIONS'].includes(req.method||''))return send(res,405,{error:'METHOD_NOT_ALLOWED'});
  if(req.method==='OPTIONS')return send(res,204,'',{'access-control-allow-origin':'*'});
  const url=new URL(req.url,'https://radar.local'),p=url.pathname;
  try{
    if(p==='/api/health'||p==='/health')return send(res,200,{ok:true,service:'radar-web-api',version:'5.0.0',phase:'12A',runtime:'vercel-serverless',time:new Date().toISOString()});
    if(p==='/api/yahoo')return send(res,200,await yahoo(url));
    if(p==='/api/yahoo-batch')return send(res,200,await yahooBatch(url));
    if(p==='/api/binance')return send(res,200,await binanceKlines(url));
    if(p==='/api/binance/universe')return send(res,200,await binanceUniverse(url));
    if(p==='/api/byma/equities')return send(res,200,await bymaEquities(url));
    if(p==='/api/byma/cedears')return send(res,200,await bymaCedears(url));
    if(p==='/api/byma/history'||p==='/api/byma/scan-history')return send(res,200,await bymaHistory(url));
    if(p==='/api/byma/quote')return send(res,200,await bymaQuote(url));
    if(p==='/api/byma/fixed-income')return send(res,200,await bymaFixedIncome(url));
    if(p==='/api/byma/bond-info'){
      const symbol=String(url.searchParams.get('symbol')||'').toUpperCase().replace('.BA','');const x=await postByma('bnown/fichatecnica/especies/general',{symbol});return send(res,200,x);
    }
    if(p==='/api/cedear/programs')return send(res,200,await cedearPrograms());
    if(p==='/api/dashboard/fx-current')return send(res,200,await fxCurrent());
    if(p==='/api/dashboard/dolarito'){const x=await fxCurrent();return send(res,200,{available:!!(x.fx?.ccl?.venta||x.fx?.mep?.venta),data:{...x.fx,fecha:new Date().toISOString()}})}
    if(p==='/api/dashboard/inflation-current')return send(res,200,await inflationNow());
    if(p==='/api/dashboard/risk')return send(res,200,await riskNow());
    if(p==='/api/dashboard/history'){const s=url.searchParams.get('series')||'risk';return send(res,200,{series:s,rows:await history(s,Math.max(2,Number(url.searchParams.get('limit'))||240)),source:'ArgentinaDatos'})}
    if(p==='/api/dashboard/core'){const [fx,inf]=await Promise.all([fxCurrent(),inflationNow()]);const rows=inf.rows||[],last=rows.at(-1),prev=rows.at(-2);return send(res,200,{updated:new Date().toISOString(),fx:fx.fx,inflation:{value:last?.valor??null,previous:prev?.valor??null,change:last&&prev?last.valor-prev.valor:null,period:last?.fecha||'',source:'ArgentinaDatos / BCRA'}})}
    if(p==='/api/treasury-series'){const series=String(url.searchParams.get('series')||'DGS10').toUpperCase(),range=url.searchParams.get('range')||'1y';return send(res,200,{source:'FRED',series,rows:await fred(series,range)})}
    if(p==='/api/treasury-official-series'){const field=String(url.searchParams.get('field')||'10Y').toUpperCase(),map={'1M':'DGS1MO','3M':'DGS3MO','6M':'DGS6MO','1Y':'DGS1','2Y':'DGS2','3Y':'DGS3','5Y':'DGS5','7Y':'DGS7','10Y':'DGS10','20Y':'DGS20','30Y':'DGS30'},series=map[field]||'DGS10';return send(res,200,{source:'FRED / Treasury',field,rows:await fred(series,url.searchParams.get('range')||'1y')})}
    if(p==='/api/treasury-curve')return send(res,200,await treasuryCurve());
    if(p==='/api/fixed-income/curve')return send(res,200,await fixedIncomeCurve());
    if(p==='/api/local-rates')return send(res,200,await localRates());
    if(p==='/api/fixed-income/analytics'){const cr=await riskNow();return send(res,200,{source:'Radar Web',countryRisk:cr,bonds:[],letters:[],warning:'Analítica RF avanzada usa el motor local en la release de escritorio.'})}
    if(p==='/api/alphavantage/fundamentals')return send(res,200,{available:false,source:'Alpha Vantage',reason:'API key no configurada en Radar Web'});
    if(p==='/api/finviz')return send(res,200,{available:false,source:'Finviz',reason:'Scraping deshabilitado en runtime serverless'});
    if(p==='/api/yahoo/fundamentals')return send(res,200,{available:false,source:'Yahoo',reason:'Fundamentales avanzados no disponibles en este endpoint web'});
    if(p==='/api/byma/merval-usd')return send(res,200,await mervalUsd());
    if(p==='/api/g2/features')return send(res,200,{marketData:true,webRuntime:true,version:'5.0.0',phase:'12A',technical:false,fixedIncome:false,portfolio:false,risk:false,opportunity:false,advisor:false});
    return send(res,404,{error:'NOT_FOUND',path:p});
  }catch(e){
    return send(res,502,{error:'UPSTREAM_ERROR',path:p,message:String(e?.message||e)});
  }
}
export default handler;
