export const SCORE_MAX={structure:25,mtf:20,fib:15,emas:15,macd:10,volume:10,rr:5};

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export function ema(values,p){
  if(!values.length)return[];
  const k=2/(p+1),out=[];let prev=values[0];
  for(let i=0;i<values.length;i++){prev=i?values[i]*k+prev*(1-k):values[i];out.push(prev)}
  return out;
}
export function macd(values){
  const a=ema(values,12),b=ema(values,26),line=values.map((_,i)=>a[i]-b[i]),signal=ema(line,9);
  return{macd:line,signal,hist:line.map((x,i)=>x-signal[i])};
}
export function atr(data,p=14){
  const tr=data.map((d,i)=>i===0?d.high-d.low:Math.max(d.high-d.low,Math.abs(d.high-data[i-1].close),Math.abs(d.low-data[i-1].close)));
  return ema(tr,p);
}
function confirmedSwings(data,strength=4){
  const A=atr(data),cand=[];
  for(let i=strength;i<data.length-strength;i++){
    let hi=true,lo=true;
    for(let j=i-strength;j<=i+strength;j++){
      if(j!==i&&data[j].high>=data[i].high)hi=false;
      if(j!==i&&data[j].low<=data[i].low)lo=false;
    }
    if(hi)cand.push({i,time:data[i].time,price:data[i].high,type:'H'});
    if(lo)cand.push({i,time:data[i].time,price:data[i].low,type:'L'});
  }
  cand.sort((a,b)=>a.i-b.i);
  const filtered=[];
  for(const c of cand){
    if(!filtered.length){filtered.push(c);continue}
    const last=filtered.at(-1);
    if(c.type===last.type){
      if((c.type==='H'&&c.price>last.price)||(c.type==='L'&&c.price<last.price))filtered[filtered.length-1]=c;
      continue;
    }
    if(Math.abs(c.price-last.price)>=(A[c.i]||0)*1.15)filtered.push(c);
  }
  let prevH=null,prevL=null;
  for(const s of filtered){
    if(s.type==='H'){s.label=prevH?(s.price>prevH.price?'HH':'LH'):'H';prevH=s}
    else{s.label=prevL?(s.price>prevL.price?'HL':'LL'):'L';prevL=s}
  }
  return filtered;
}
function structureState(sw){
  const hs=sw.filter(x=>x.type==='H'),ls=sw.filter(x=>x.type==='L');
  if(hs.length<2||ls.length<2)return'indefinida';
  const h1=hs.at(-2).price,h2=hs.at(-1).price,l1=ls.at(-2).price,l2=ls.at(-1).price;
  if(h2>h1&&l2>l1)return'alcista';
  if(h2<h1&&l2<l1)return'bajista';
  return'transición';
}
function latestBreak(data,sw,structure,A){
  const bar=data.at(-1),last=bar.close,hs=sw.filter(x=>x.type==='H'),ls=sw.filter(x=>x.type==='L'),h=hs.at(-1),l=ls.at(-1),tol=(A.at(-1)||0)*.12;
  if(h&&last>h.price+tol)return structure==='bajista'?'CHoCH alcista':'BOS alcista';
  if(l&&last<l.price-tol)return structure==='alcista'?'CHoCH bajista':'BOS bajista';
  if(h&&bar.high>h.price&&last<=h.price+tol)return'Test de resistencia';
  if(l&&bar.low<l.price&&last>=l.price-tol)return'Test de soporte';
  return'Sin ruptura reciente';
}
function fibFromSwings(sw){
  if(sw.length<2)return null;
  const recent=sw.slice(-8),pairs=[];
  for(let i=1;i<recent.length;i++){
    const a=recent[i-1],b=recent[i];if(a.type===b.type)continue;
    const range=Math.abs(b.price-a.price),recency=.72+(i/(recent.length-1))*.28;
    pairs.push({a,b,rank:range*recency});
  }
  if(!pairs.length)return null;
  const best=pairs.sort((x,y)=>y.rank-x.rank)[0],a=best.a,b=best.b;
  const low=a.price<b.price?a:b,high=a.price>b.price?a:b,up=a.type==='L'&&b.type==='H',range=high.price-low.price,levels={};
  [0,.236,.382,.5,.618,.786,1].forEach(r=>levels[r]=up?high.price-range*r:low.price+range*r);
  return{a,b,up,low:low.price,high:high.price,levels};
}
export function analyzeSeries(data,key='short'){
  if(!Array.isArray(data)||data.length<80)throw new Error('Historial insuficiente');
  const cl=data.map(x=>Number(x.close)),e20=ema(cl,20),e50=ema(cl,50),e200=ema(cl,200),m=macd(cl),A=atr(data,14);
  const strength=key==='micro'?3:key==='short'?4:key==='medium'?5:6;
  const sw=confirmedSwings(data,strength),structure=structureState(sw),i=data.length-1,c=cl[i];
  let score=0;
  if(structure==='alcista')score+=2;if(structure==='bajista')score-=2;
  if(c>e200[i])score++;else score--;
  if(e20[i]>e50[i]&&e50[i]>e200[i])score++;else if(e20[i]<e50[i]&&e50[i]<e200[i])score--;
  if(m.macd[i]>m.signal[i]&&m.macd[i]>0)score++;else if(m.macd[i]<m.signal[i]&&m.macd[i]<0)score--;
  const slope=e20[i]-e20[Math.max(0,i-8)];if(slope>0)score++;else if(slope<0)score--;
  const trend=score>=3?'alcista':score<=-3?'bajista':structure==='alcista'?'corrección alcista':structure==='bajista'?'rebote bajista':'neutral / transición';
  const br=latestBreak(data,sw,structure,A),fib=fibFromSwings(sw),hs=sw.filter(x=>x.type==='H'),ls=sw.filter(x=>x.type==='L');
  const emaState=e20[i]>e50[i]&&e50[i]>e200[i]?'Alineación alcista':e20[i]<e50[i]&&e50[i]<e200[i]?'Alineación bajista':'Mixtas';
  const macdState=m.macd[i]>m.signal[i]?(m.macd[i]>0?'Alcista sobre cero':'Cruce alcista bajo cero'):(m.macd[i]<0?'Bajista bajo cero':'Cruce bajista sobre cero');
  const vols=data.map(x=>Number(x.volume)||0),n=Math.min(20,vols.length),v20=n?vols.slice(-n).reduce((s,v)=>s+v,0)/n:0;
  return{key,data,cl,e20,e50,e200,m,A,sw,structure,score,trend,breakType:br,fib,lastH:hs.at(-1),lastL:ls.at(-1),emaState,macdState,c,volumeRatio:v20>0?vols.at(-1)/v20:NaN};
}
function srZones(a){
  const av=a.A.at(-1)||a.c*.01,half=Math.max(av*.28,a.c*.0015);
  const lows=a.sw.filter(x=>x.type==='L'),highs=a.sw.filter(x=>x.type==='H');
  const s=[...lows].reverse().find(x=>x.price<=a.c)||lows.at(-1)||a.lastL;
  const r=[...highs].reverse().find(x=>x.price>=a.c)||highs.at(-1)||a.lastH;
  return{support:s?{mid:s.price,low:s.price-half,high:s.price+half}:null,resistance:r?{mid:r.price,low:r.price-half,high:r.price+half}:null};
}
function componentScores(a,dir,rr1){
  const i=a.data.length-1;let structure=0,emas=0,macdScore=0,fib=0,volume=0;
  if((dir===1&&a.structure==='alcista')||(dir===-1&&a.structure==='bajista'))structure=25;
  else if(a.structure==='transición')structure=10;else structure=4;
  if(dir===1){
    if(a.e20[i]>a.e50[i]&&a.e50[i]>a.e200[i])emas=15;else if(a.c>a.e200[i]&&a.e20[i]>a.e50[i])emas=11;else if(a.c>a.e200[i])emas=6;
    if(a.m.macd[i]>a.m.signal[i]&&a.m.macd[i]>0)macdScore=10;else if(a.m.macd[i]>a.m.signal[i])macdScore=6;
  }else{
    if(a.e20[i]<a.e50[i]&&a.e50[i]<a.e200[i])emas=15;else if(a.c<a.e200[i]&&a.e20[i]<a.e50[i])emas=11;else if(a.c<a.e200[i])emas=6;
    if(a.m.macd[i]<a.m.signal[i]&&a.m.macd[i]<0)macdScore=10;else if(a.m.macd[i]<a.m.signal[i])macdScore=6;
  }
  if(a.fib){
    const lo=Math.min(a.fib.levels[.382],a.fib.levels[.618]),hi=Math.max(a.fib.levels[.382],a.fib.levels[.618]),av=a.A.at(-1)||0;
    if(a.c>=lo&&a.c<=hi)fib=15;else{const d=a.c<lo?lo-a.c:a.c-hi;fib=d<=av?10:5}
  }
  if(Number.isFinite(a.volumeRatio))volume=a.volumeRatio>=1.35?10:a.volumeRatio>=1.05?7:a.volumeRatio>=.75?4:2;else volume=4;
  const rr=Number.isFinite(rr1)?(rr1>=2?5:rr1>=1.5?3:rr1>=1.2?1:0):0;
  return{structure,mtf:10,fib,emas,macd:macdScore,volume,rr};
}
function weighted(comp){
  let total=0;
  for(const k of Object.keys(SCORE_MAX))total+=clamp((Number(comp[k])||0)/SCORE_MAX[k])*SCORE_MAX[k];
  return total;
}
export function computeTradePlan(a){
  if(!a||!Number.isFinite(a.c))return null;
  const dir=a.score>=2?1:a.score<=-2?-1:0,why=[],wait=[];
  if(dir===0)return{direction:'SIN SETUP',status:'SIN SETUP',score:Math.max(0,Math.min(55,50+a.score*6)),components:{},why:['No existe confluencia direccional suficiente.'],action:'Esperar estructura definida y alineación de medias/momentum.',invalidation:'No hay idea operativa activa.'};
  const bull=dir===1,z=srZones(a),av=a.A.at(-1)||a.c*.01,f=a.fib,structural=bull?z.support:z.resistance;
  const structureAligned=(bull&&a.structure==='alcista')||(!bull&&a.structure==='bajista'),fibDirectional=!!(f&&(bull?f.up:!f.up));
  let e1,e2,zoneEvidence=false;
  if(f&&fibDirectional){
    e1=Math.min(f.levels[.5],f.levels[.618]);e2=Math.max(f.levels[.5],f.levels[.618]);zoneEvidence=true;
    if(structural){const x1=Math.max(e1,structural.low),x2=Math.min(e2,structural.high);if(x1<=x2){e1=x1;e2=x2;why.push('Fibonacci 0,50–0,618 coincide con estructura.')}else why.push('Fibonacci y estructura no coinciden.')}
  }else if(structural){
    e1=structural.low;e2=structural.high;zoneEvidence=true;
    why.push(f&&!fibDirectional?'El impulso Fibonacci contradice la dirección.':'Entrada apoyada sólo en estructura confirmada.');
  }else{e1=a.c-av*.25;e2=a.c+av*.25;why.push('Sin zona estructural defendible.')}
  const entry=(e1+e2)/2,prev=a.data.at(-2),trigger=bull?Math.max(e2,a.e20.at(-1),prev?.high||e2):Math.min(e1,a.e20.at(-1),prev?.low||e1);
  const stop=bull?(structural?.low??a.lastL?.price??(entry-av))-av*.35:(structural?.high??a.lastH?.price??(entry+av))+av*.35;
  const risk=Math.abs(entry-stop);let tp1,tp2;
  if(bull){const swing=a.lastH?.price;tp1=Number.isFinite(swing)&&swing>entry?swing:entry+risk*2;const ext=f?f.high+(f.high-f.low)*.272:entry+risk*3;tp2=Math.max(tp1+risk*.5,ext)}
  else{const swing=a.lastL?.price;tp1=Number.isFinite(swing)&&swing<entry?swing:entry-risk*2;const ext=f?f.low-(f.high-f.low)*.272:entry-risk*3;tp2=Math.min(tp1-risk*.5,ext)}
  const rr1=risk>0?Math.abs(tp1-entry)/risk:NaN,rr2=risk>0?Math.abs(tp2-entry)/risk:NaN,comp=componentScores(a,dir,rr1);
  let score=Math.round(weighted(comp));
  if(rr1<1.5)score=Math.min(score,59);
  if(!structureAligned||!zoneEvidence||(f&&!fibDirectional))score=Math.min(score,64);
  why.push(`Estructura ${a.structure}; medias: ${a.emaState.toLowerCase()}.`);
  why.push(`MACD: ${a.macdState.toLowerCase()}.`);
  why.push(`R:R a TP1 ${Number.isFinite(rr1)?'1:'+rr1.toFixed(2):'no calculable'}.`);
  const inZone=a.c>=e1-av*.10&&a.c<=e2+av*.10,triggerMet=bull?a.c>=trigger:a.c<=trigger,tooExtended=bull?a.c>e2+av*.75:a.c<e1-av*.75;
  let status;
  if(rr1<1.5){status='SIN SETUP';wait.push('R:R inferior a 1:1,50.')}
  else if(!structureAligned){status='ESPERAR';wait.push('La estructura todavía no confirma la dirección.')}
  else if(!zoneEvidence){status='ESPERAR';wait.push('No hay zona defendible.')}
  else if(f&&!fibDirectional){status='ESPERAR';wait.push('Fibonacci contradice la dirección.')}
  else if(tooExtended){status='ESPERAR';score=Math.min(score,59);wait.push('Precio extendido: no perseguir.')}
  else if(score>=75&&inZone&&triggerMet){status='OPERABLE';wait.push('Zona, trigger, estructura y R:R están alineados.')}
  else{status='ESPERAR';if(!inZone)wait.push('Esperar ingreso a zona.');if(!triggerMet)wait.push('Esperar trigger.');if(score<75)wait.push('Confluencia debajo de 75/100.')}
  return{direction:bull?'LONG':'SHORT',status,score,components:comp,entryLow:e1,entryHigh:e2,entry,trigger,stop,tp1,tp2,rr1,rr2,why,action:wait.join(' '),invalidation:bull?`Cierre debajo de ${stop}`:`Cierre encima de ${stop}`};
}
export function opportunityState(a,p){
  if(!p)return{kind:'none',label:'SIN DATOS',rank:0};
  if(p.status==='OPERABLE')return{kind:p.direction==='LONG'?'buy':'sell',label:p.direction==='LONG'?'OPERABLE LONG':'OPERABLE SHORT',rank:500+p.score};
  if(p.direction==='SIN SETUP'||p.status==='SIN SETUP')return{kind:'none',label:'SIN SETUP',rank:p.score};
  const dist=Number.isFinite(p.entryLow)&&Number.isFinite(p.entryHigh)?(a.c<p.entryLow?(p.entryLow-a.c)/a.c*100:a.c>p.entryHigh?(a.c-p.entryHigh)/a.c*100:0):NaN;
  if(Number.isFinite(dist)&&dist<=2.5)return{kind:'near',label:'CERCA DE ZONA',rank:350+p.score-dist*10,dist};
  return{kind:'wait',label:'ESPERAR',rank:200+p.score,dist};
}
