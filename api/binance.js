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
    const symbol=String(req.query?.symbol||'BTCUSDT').replace(/[\/-]/g,'').toUpperCase();
    const interval=String(req.query?.interval||'1h');
    const allowed=new Set(['1m','3m','5m','15m','30m','1h','2h','4h','6h','8h','12h','1d','3d','1w','1M']);
    if(!/^[A-Z0-9]{5,20}$/.test(symbol))throw new Error('Símbolo inválido');
    if(!allowed.has(interval))throw new Error('Intervalo inválido');
    const data=await getJson('/api/v3/klines?symbol='+encodeURIComponent(symbol)+'&interval='+encodeURIComponent(interval)+'&limit=1000');
    if(!Array.isArray(data)||!data.length)throw new Error('Binance no devolvió velas');
    res.setHeader('cache-control','public, max-age=0, s-maxage=15, stale-while-revalidate=30');
    res.status(200).json(data);
  }catch(e){
    res.status(502).json({error:'BINANCE_KLINES_ERROR',message:String(e?.message||e)});
  }
}
