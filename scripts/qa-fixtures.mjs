export async function installMarketFixtures(page,base) {
function makeBars(count=420,start=100,step=0.08,seconds=86400){
  const now=Math.floor(Date.now()/1000),bars=[];
  for(let i=0;i<count;i++){
    const time=now-(count-i)*seconds;
    const center=start+i*step+Math.sin(i/9)*2+Math.sin(i/31)*3;
    const open=center+Math.sin(i/3)*0.35;
    const close=center+Math.cos(i/5)*0.45;
    const high=Math.max(open,close)+1.1+(i%5)*0.03;
    const low=Math.min(open,close)-1.0-(i%7)*0.02;
    bars.push({time,open,high,low,close,volume:1000000+i*1700});
  }
  return bars;
}
const daily=makeBars(520,100,0.09,86400);
const hourly=makeBars(520,100,0.025,3600);
const bymaPayload=bars=>({s:'ok',t:bars.map(x=>x.time),o:bars.map(x=>x.open),h:bars.map(x=>x.high),l:bars.map(x=>x.low),c:bars.map(x=>x.close),v:bars.map(x=>x.volume)});
const yahooPayload=bars=>({chart:{result:[{timestamp:bars.map(x=>x.time),meta:{regularMarketPrice:bars.at(-1).close,chartPreviousClose:bars.at(-2).close},indicators:{quote:[{open:bars.map(x=>x.open),high:bars.map(x=>x.high),low:bars.map(x=>x.low),close:bars.map(x=>x.close),volume:bars.map(x=>x.volume)}]}}],error:null}});
const binancePayload=bars=>bars.map(x=>[x.time*1000,String(x.open),String(x.high),String(x.low),String(x.close),String(x.volume),x.time*1000+3599999,'0',100,'0','0','0']);
const listItem=(symbol,price,volume,extra={})=>({symbol,trade:price,closingPrice:price,volume,tradeVolume:volume,volumeAmount:price*volume,settlementType:'2',denominationCcy:'ARS',source:'QA fixture',...extra});
const bymaEquitiesFixture={source:'QA fixture',items:[listItem('GGAL',7200,250000),listItem('YPFD',58200,180000),listItem('PAMP',5100,160000),listItem('VIST',18900,140000),listItem('TGSU2',6400,120000)]};
const bymaCedearsFixture={source:'QA fixture',items:[listItem('AAPL',42000,350000),listItem('NVDA',39800,330000),listItem('MELI',29800,210000),listItem('MSFT',36000,190000),listItem('AMZN',31000,170000)]};
const cedearProgramsFixture={source:'Banco Comafi · QA fixture',count:5,items:[
  {symbol:'AAPL',underlying:'AAPL',program:'Apple Inc.',ratioText:'10:1'},
  {symbol:'NVDA',underlying:'NVDA',program:'NVIDIA Corp.',ratioText:'24:1'},
  {symbol:'MELI',underlying:'MELI',program:'MercadoLibre',ratioText:'60:1'},
  {symbol:'MSFT',underlying:'MSFT',program:'Microsoft',ratioText:'30:1'},
  {symbol:'AMZN',underlying:'AMZN',program:'Amazon',ratioText:'144:1'}
]};
const bymaFixedFixture={source:'QA fixture',items:[listItem('AL30',78.4,900000,{type:'bond',category:'Soberano'}),listItem('AE38',73.2,780000,{type:'bond',category:'Soberano'}),listItem('GD30',79.1,760000,{type:'bond',category:'Soberano'}),listItem('S31O6',101.5,650000,{type:'bond',category:'LECAP/BONCAP'})]};
const cedearAnalysisFixture={
  source:'QA fixture · liquid CEDEAR analysis',
  count:bymaCedearsFixture.items.length,
  liquidCount:bymaCedearsFixture.items.length,
  analyzedCount:bymaCedearsFixture.items.length,
  items:bymaCedearsFixture.items.map((x,i)=>({
    ...x,
    changePct:i%2===0?1.2:-.8,
    bars:daily.map((b,j)=>({...b,close:b.close+i*2,volume:b.volume+i*1000})),
    historyOk:true,
    historySource:'QA fixture',
    analysis:i%4===0?{kind:'buy',label:'OPORTUNIDAD',oppScore:88,setup:'Ruptura con momentum',trend:'Alcista'}:
      i%4===1?{kind:'near',label:'POSIBLE',oppScore:72,setup:'Tendencia alcista',trend:'Alcista'}:
      i%4===2?{kind:'wait',label:'SEGUIMIENTO',oppScore:50,setup:'Esperar confirmación',trend:'Lateral'}:
      {kind:'sell',label:'EVITAR',oppScore:22,setup:'Presión bajista',trend:'Bajista'}
  }))
};
const yahooBatchPayload=u=>{
  const bars=u.searchParams.get('interval')==='15m'?hourly:daily;
  const symbols=(u.searchParams.get('symbols')||'').split(',').filter(Boolean);
  return {source:'QA fixture',items:symbols.map((symbol,i)=>{
    const shifted=bars.map((b,j)=>({...b,close:b.close+i*3,open:b.open+i*3,high:b.high+i*3,low:b.low+i*3}));
    const last=shifted.at(-1).close,prev=shifted.at(-2).close;
    return {symbol,ok:true,last,changePct:((last/prev)-1)*100,volume:shifted.at(-1).volume,bars:shifted,source:'QA fixture'};
  })};
};

await page.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.origin!==new URL(base).origin)return route.continue();
  if(u.pathname==='/api/binance')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(binancePayload(hourly))});
  if(u.pathname==='/api/yahoo')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(yahooPayload(u.searchParams.get('interval')==='1wk'?daily:hourly))});
  if(u.pathname==='/api/yahoo-batch')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(yahooBatchPayload(u))});
  if(u.pathname==='/api/byma/equities')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(bymaEquitiesFixture)});
  if(u.pathname==='/api/byma/cedears')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(bymaCedearsFixture)});
  if(u.pathname==='/api/cedear/programs')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(cedearProgramsFixture)});
  if(u.pathname==='/api/byma/cedears-analysis')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(cedearAnalysisFixture)});
  if(u.pathname==='/api/byma/fixed-income')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(bymaFixedFixture)});
  if(u.pathname==='/api/byma/scan-history'||u.pathname==='/api/byma/history')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(bymaPayload(daily))});
  return route.continue();
});

}
