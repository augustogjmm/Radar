const UA='Mozilla/5.0 RadarTecnico/5.0';
const BYMA='https://open.bymadata.com.ar/vanoms-be-core/rest/api/bymadata/free';

function send(res,status,body,headers={}){
  res.statusCode=status;
  res.setHeader('content-type',typeof body==='string'?'text/plain; charset=utf-8':'application/json; charset=utf-8');
  res.setHeader('cache-control','public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  for(const [k,v] of Object.entries(headers))res.setHeader(k,v);
  res.end(typeof body==='string'?body:JSON.stringify(body));
}
function arr(x){return Array.isArray(x)?x:Array.isArray(x?.data)?x.data:Array.isArray(x?.content?.data)?x.content.data:x&&x.symbol?[x]:[]}
function num(v){const n=Number(v);return Number.isFinite(n)?n:null}
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
  for(const u of ['https://dolarapi.com/v1/ambito/dolares','https://dolarapi.com/v1/dolares']){
    try{const x=await getJson(u,{timeout:9000});rows=Array.isArray(x)?x:[];if(rows.length)break}catch{}
  }
  const pick=(casa)=>{
    const x=rows.find(r=>String(r.casa||'').toLowerCase()===casa);
    return x?{compra:num(x.compra),venta:num(x.venta),changePct:num(x.variacion),fecha:x.fechaActualizacion||'',source:'DolarApi'}:{compra:null,venta:null,changePct:null,fecha:'',source:'No disponible'};
  };
  return {updated:new Date().toISOString(),fx:{mep:pick('bolsa'),ccl:pick('contadoconliqui'),official:pick('oficial')}};
}
async function history(series,limit=240){
  const map={
    risk:['https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais','index'],
    inflation:['https://api.argentinadatos.com/v1/finanzas/indices/inflacion','index'],
    mep:['https://api.argentinadatos.com/v1/cotizaciones/dolares/bolsa','fx'],
    ccl:['https://api.argentinadatos.com/v1/cotizaciones/dolares/contadoconliqui','fx'],
    official:['https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial','fx']
  };
  const spec=map[series]; if(!spec)throw new Error('Serie inválida');
  const x=await getJson(spec[0],{timeout:12000});
  const rows=(Array.isArray(x)?x:arr(x)).map(r=>({date:String(r.fecha||r.date||'').slice(0,10),value:num(spec[1]==='fx'?r.venta:r.valor)})).filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&r.value!==null).sort((a,b)=>a.date.localeCompare(b.date));
  return rows.slice(-limit);
}
async function riskNow(){
  try{
    const x=await getJson('https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais/ultimo',{timeout:8000});
    const value=num(x.valor),date=String(x.fecha||'').slice(0,10);
    const h=await history('risk',3).catch(()=>[]);
    const prev=h.length>1?h[h.length-2].value:null;
    return {value,previous:prev,change:value!==null&&prev!==null?value-prev:null,date,source:'ArgentinaDatos · riesgo país',fallback:true,status:'ACTUAL',verifiedAt:new Date().toISOString()};
  }catch(e){return {value:null,previous:null,change:null,date:'',source:'No disponible',fallback:true,status:'STALE',warning:String(e.message||e)}}
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
  for(const line of lines){const [date,val]=line.split(',');const value=Number(val);if(Date.parse(date)>=cutoff&&Number.isFinite(value))rows.push({date,value})}
  return rows;
}
async function treasuryCurve(){
  const defs=[['1M','DGS1MO'],['3M','DGS3MO'],['6M','DGS6MO'],['1Y','DGS1'],['2Y','DGS2'],['3Y','DGS3'],['5Y','DGS5'],['7Y','DGS7'],['10Y','DGS10'],['20Y','DGS20'],['30Y','DGS30']];
  const out=[];for(const [tenor,s] of defs){try{const r=await fred(s,'1mo');const z=r.at(-1);if(z)out.push({tenor,value:z.value,date:z.date,series:s})}catch{}}
  return {source:'FRED / U.S. Treasury',updated:new Date().toISOString(),curve:out};
}
async function handler(req,res){
  if(!['GET','POST','OPTIONS'].includes(req.method||''))return send(res,405,{error:'METHOD_NOT_ALLOWED'});
  if(req.method==='OPTIONS')return send(res,204,'',{'access-control-allow-origin':'*'});
  const url=new URL(req.url,'https://radar.local'),p=url.pathname;
  try{
    if(p==='/api/health'||p==='/health')return send(res,200,{ok:true,service:'radar-web-api',version:'5.0.0',phase:'12A',runtime:'vercel-serverless',time:new Date().toISOString()});
    if(p==='/api/yahoo')return send(res,200,await yahoo(url));
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
    if(p==='/api/treasury-curve'||p==='/api/fixed-income/curve')return send(res,200,await treasuryCurve());
    if(p==='/api/local-rates')return send(res,200,{source:'Web runtime',updated:new Date().toISOString(),rates:[],warning:'Tasas locales avanzadas pendientes de proveedor web estable.'});
    if(p==='/api/fixed-income/analytics'){const cr=await riskNow();return send(res,200,{source:'Radar Web',countryRisk:cr,bonds:[],letters:[],warning:'Analítica RF avanzada usa el motor local en la release de escritorio.'})}
    if(p==='/api/alphavantage/fundamentals')return send(res,200,{available:false,source:'Alpha Vantage',reason:'API key no configurada en Radar Web'});
    if(p==='/api/finviz')return send(res,200,{available:false,source:'Finviz',reason:'Scraping deshabilitado en runtime serverless'});
    if(p==='/api/yahoo/fundamentals')return send(res,200,{available:false,source:'Yahoo',reason:'Fundamentales avanzados no disponibles en este endpoint web'});
    if(p==='/api/byma/merval-usd')return send(res,200,{available:false,source:'Radar Web',warning:'Serie Merval USD pendiente de adaptación web'});
    if(p==='/api/g2/features')return send(res,200,{marketData:true,webRuntime:true,version:'5.0.0',phase:'12A',technical:false,fixedIncome:false,portfolio:false,risk:false,opportunity:false,advisor:false});
    return send(res,404,{error:'NOT_FOUND',path:p});
  }catch(e){
    return send(res,502,{error:'UPSTREAM_ERROR',path:p,message:String(e?.message||e)});
  }
}
export default handler;
