const HOSTS=['https://api.binance.com','https://api1.binance.com','https://api2.binance.com','https://api3.binance.com'];

async function getJson(path){
  let last='';
  for(const host of HOSTS){
    const c=new AbortController(),t=setTimeout(()=>c.abort(),15000);
    try{
      const r=await fetch(host+path,{signal:c.signal,headers:{accept:'application/json','user-agent':'RadarTecnico/5.0'}});
      if(!r.ok)throw new Error('HTTP '+r.status+' '+(await r.text()).slice(0,160));
      return await r.json();
    }catch(e){last=String(e?.message||e)}
    finally{clearTimeout(t)}
  }
  throw new Error('Binance no disponible: '+last);
}

export default async function handler(req,res){
  if(req.method!=='GET'){res.status(405).json({error:'METHOD_NOT_ALLOWED'});return}
  try{
    const top=Math.min(500,Math.max(1,Number(req.query?.top)||100));
    const [ex,tickers]=await Promise.all([
      getJson('/api/v3/exchangeInfo'),
      getJson('/api/v3/ticker/24hr')
    ]);
    const volume=new Map((Array.isArray(tickers)?tickers:[]).map(x=>[x.symbol,Number(x.quoteVolume)||0]));
    const items=(ex?.symbols||[])
      .filter(x=>x?.status==='TRADING'&&x?.quoteAsset==='USDT'&&x?.isSpotTradingAllowed!==false)
      .map(x=>({
        symbol:String(x.symbol||''),
        baseAsset:String(x.baseAsset||''),
        quoteAsset:String(x.quoteAsset||'USDT'),
        quoteVolume:volume.get(x.symbol)||0
      }))
      .sort((a,b)=>b.quoteVolume-a.quoteVolume||a.symbol.localeCompare(b.symbol))
      .slice(0,top);
    res.setHeader('cache-control','public, max-age=0, s-maxage=30, stale-while-revalidate=60');
    res.status(200).json({source:'Binance Spot',updated:new Date().toISOString(),count:items.length,totalAvailable:(ex?.symbols||[]).length,top,items});
  }catch(e){
    res.status(502).json({error:'BINANCE_UNIVERSE_ERROR',message:String(e?.message||e)});
  }
}
