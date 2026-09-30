const base=(process.env.RADAR_URL||'https://radar-lovat-five.vercel.app').replace(/\/$/,'');
const expected=(process.env.EXPECTED_SHA||'').trim();
const required=['Yahoo SPY','Crypto BTC','BYMA acciones','BYMA CEDEAR','BYMA histórico GGAL','Dólar','Renta fija'];

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function json(url,timeoutMs=45000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const r=await fetch(url,{cache:'no-store',signal:controller.signal,headers:{'user-agent':'RadarProductionHealth/1.0'}});
    const text=await r.text();
    if(!r.ok)throw new Error('HTTP '+r.status+' '+text.slice(0,300));
    return JSON.parse(text);
  }finally{clearTimeout(timer)}
}

async function waitForDeployment(){
  let last=null;
  for(let attempt=1;attempt<=30;attempt++){
    try{
      last=await json(base+'/api/health',20000);
      const seen=String(last?.gitSha||'');
      if(!expected||seen===expected||seen.startsWith(expected)||expected.startsWith(seen)){
        console.log('Deployment ready',JSON.stringify({release:last?.release,gitSha:seen,attempt}));
        return last;
      }
      console.log('Waiting for expected deployment',JSON.stringify({attempt,expected,seen}));
    }catch(e){
      console.log('Health probe pending',JSON.stringify({attempt,error:String(e?.message||e)}));
    }
    await sleep(10000);
  }
  throw new Error('Production never exposed expected git SHA. Last health: '+JSON.stringify(last));
}

await waitForDeployment();
const deep=await json(base+'/api/health/deep',90000);
const checks=Array.isArray(deep?.checks)?deep.checks:[];
const byName=new Map(checks.map(x=>[x.name,x]));
const missing=required.filter(name=>!byName.has(name));
const failed=checks.filter(x=>x?.critical&&!x?.ok);

console.log('\nRadar production provider health');
for(const name of required){
  const x=byName.get(name);
  console.log(`${x?.ok?'PASS':'FAIL'}  ${name.padEnd(22)}  ${String(x?.latencyMs??'—').padStart(6)} ms  ${x?.ok?JSON.stringify(x.detail||{}):String(x?.error||'missing')}`);
}
const optional=checks.filter(x=>!x?.critical);
for(const x of optional){
  console.log(`${x?.ok?'PASS':'WARN'}  ${String(x.name).padEnd(22)}  ${String(x?.latencyMs??'—').padStart(6)} ms  ${x?.ok?JSON.stringify(x.detail||{}):String(x?.error||'unavailable')}`);
}

if(missing.length)throw new Error('Deep health contract incomplete; missing: '+missing.join(', '));
if(deep?.status!=='OK'||deep?.ok!==true||Number(deep?.criticalFailures)!==0||failed.length){
  throw new Error('Production provider gate failed: '+JSON.stringify({status:deep?.status,criticalFailures:deep?.criticalFailures,failed:failed.map(x=>({name:x.name,error:x.error}))}));
}
console.log('\nCERTIFIED',JSON.stringify({release:deep.release,gitSha:deep.gitSha,status:deep.status,checkedAt:deep.checkedAt,durationMs:deep.durationMs}));
