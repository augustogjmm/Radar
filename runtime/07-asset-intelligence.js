/* Radar Tecnico G2 - Asset intelligence and fundamentals
   Extracted from certified runtime; order preserved. */

/* ===== RUNTIME BLOCK 33 ===== */
// Radar Técnico G2 — Phase 10N / v4.45.0
// Asset Intelligence browser runtime extraction.
// Ownership only: profile/fundamentals behavior is preserved from the legacy bridge.

const ARG_COMPANY_PROFILES={
 ALUA:{name:'Aluar Aluminio Argentino S.A.I.C.',sector:'Materiales básicos',industry:'Aluminio',panel:'Líder'},
 BBAR:{name:'Banco BBVA Argentina S.A.',sector:'Finanzas',industry:'Bancos',panel:'Líder',adr:'BBAR'},
 BMA:{name:'Banco Macro S.A.',sector:'Finanzas',industry:'Bancos',panel:'Líder',adr:'BMA'},
 BYMA:{name:'Bolsas y Mercados Argentinos S.A.',sector:'Finanzas',industry:'Mercados de capitales',panel:'Líder'},
 CEPU:{name:'Central Puerto S.A.',sector:'Servicios públicos',industry:'Generación eléctrica',panel:'Líder',adr:'CEPU'},
 COME:{name:'Sociedad Comercial del Plata S.A.',sector:'Industriales',industry:'Holding diversificado',panel:'Líder'},
 CRES:{name:'Cresud S.A.C.I.F. y A.',sector:'Inmobiliario / Agro',industry:'Agronegocios e inmobiliario',panel:'Líder',adr:'CRESY'},
 EDN:{name:'Empresa Distribuidora y Comercializadora Norte S.A. (Edenor)',sector:'Servicios públicos',industry:'Distribución eléctrica',panel:'Líder',adr:'EDN'},
 GGAL:{name:'Grupo Financiero Galicia S.A.',sector:'Finanzas',industry:'Servicios financieros / Bancos',panel:'Líder',adr:'GGAL'},
 IRSA:{name:'IRSA Inversiones y Representaciones S.A.',sector:'Inmobiliario',industry:'Real estate',panel:'Líder',adr:'IRS'},
 LOMA:{name:'Loma Negra Compañía Industrial Argentina S.A.',sector:'Materiales básicos',industry:'Cemento y materiales de construcción',panel:'Líder',adr:'LOMA'},
 METR:{name:'Metrogas S.A.',sector:'Servicios públicos',industry:'Distribución de gas natural',panel:'General'},
 MIRG:{name:'Mirgor S.A.C.I.F.I.A.',sector:'Industriales / Tecnología',industry:'Manufactura y electrónica',panel:'Líder'},
 PAMP:{name:'Pampa Energía S.A.',sector:'Energía / Servicios públicos',industry:'Electricidad, petróleo y gas',panel:'Líder',adr:'PAM'},
 SUPV:{name:'Grupo Supervielle S.A.',sector:'Finanzas',industry:'Bancos y servicios financieros',panel:'Líder',adr:'SUPV'},
 TECO2:{name:'Telecom Argentina S.A.',sector:'Comunicaciones',industry:'Telecomunicaciones',panel:'Líder',adr:'TEO'},
 TGNO4:{name:'Transportadora de Gas del Norte S.A.',sector:'Energía',industry:'Transporte de gas natural',panel:'General'},
 TGSU2:{name:'Transportadora de Gas del Sur S.A.',sector:'Energía',industry:'Transporte y procesamiento de gas',panel:'Líder',adr:'TGS'},
 TRAN:{name:'Compañía de Transporte de Energía Eléctrica en Alta Tensión Transener S.A.',sector:'Servicios públicos',industry:'Transmisión eléctrica',panel:'Líder'},
 TXAR:{name:'Ternium Argentina S.A.',sector:'Materiales básicos',industry:'Acero',panel:'Líder'},
 VALO:{name:'Grupo Financiero Valores S.A.',sector:'Finanzas',industry:'Servicios financieros',panel:'General'},
 YPFD:{name:'YPF S.A.',sector:'Energía',industry:'Petróleo y gas integrado',panel:'Líder',adr:'YPF'},
 HARG:{name:'Holcim (Argentina) S.A.',sector:'Materiales básicos',industry:'Cemento y materiales de construcción',panel:'General'},
 AGRO:{name:'Agrometal S.A.I.',sector:'Industriales',industry:'Maquinaria agrícola',panel:'General'},
 BOLT:{name:'Boldt S.A.',sector:'Consumo / Tecnología',industry:'Entretenimiento y soluciones tecnológicas',panel:'General'},
 CAPX:{name:'Capex S.A.',sector:'Energía / Servicios públicos',industry:'Generación eléctrica y energía',panel:'General'},
 CELU:{name:'Celulosa Argentina S.A.',sector:'Materiales básicos',industry:'Papel y celulosa',panel:'General'},
 DGCU2:{name:'Distribuidora de Gas Cuyana S.A.',sector:'Servicios públicos',industry:'Distribución de gas natural',panel:'General'},
 FERR:{name:'Ferrum S.A. de Cerámica y Metalurgia',sector:'Industriales',industry:'Productos para construcción',panel:'General'},
 GCLA:{name:'Grupo Clarín S.A.',sector:'Comunicaciones',industry:'Medios',panel:'General'},
 INVJ:{name:'Inversora Juramento S.A.',sector:'Consumo defensivo',industry:'Alimentos / Ganadería',panel:'General'},
 LEDE:{name:'Ledesma S.A.A.I.',sector:'Consumo defensivo',industry:'Alimentos, azúcar y papel',panel:'General'},
 MOLI:{name:'Molinos Río de la Plata S.A.',sector:'Consumo defensivo',industry:'Alimentos',panel:'General'},
 MORI:{name:'Morixe Hermanos S.A.C.I.',sector:'Consumo defensivo',industry:'Alimentos',panel:'General'},
 OEST:{name:'Grupo Concesionario del Oeste S.A.',sector:'Industriales',industry:'Infraestructura vial',panel:'General'},
 RICH:{name:'Laboratorios Richmond S.A.C.I.F.',sector:'Salud',industry:'Farmacéutica',panel:'General'},
 SAMI:{name:'S.A. San Miguel A.G.I.C.I. y F.',sector:'Consumo defensivo',industry:'Agroindustria / Alimentos',panel:'General'},
 SEMI:{name:'Molinos Juan Semino S.A.',sector:'Consumo defensivo',industry:'Alimentos',panel:'General'}
};

const CRYPTO_NAMES={
 BTC:'Bitcoin',ETH:'Ethereum',BNB:'BNB',SOL:'Solana',XRP:'XRP',ADA:'Cardano',DOGE:'Dogecoin',
 AVAX:'Avalanche',LINK:'Chainlink',LTC:'Litecoin',BCH:'Bitcoin Cash',DOT:'Polkadot',TRX:'TRON',
 SUI:'Sui',APT:'Aptos',UNI:'Uniswap',AAVE:'Aave',ATOM:'Cosmos',ETC:'Ethereum Classic',NEAR:'NEAR Protocol'
};

const SECTOR_ES={
 'Technology':'Tecnología','Financial':'Finanzas','Healthcare':'Salud','Industrials':'Industriales',
 'Energy':'Energía','Basic Materials':'Materiales básicos','Consumer Cyclical':'Consumo cíclico',
 'Consumer Defensive':'Consumo defensivo','Communication Services':'Comunicaciones',
 'Utilities':'Servicios públicos','Real Estate':'Inmobiliario'
};
const INDUSTRY_ES={
 'Consumer Electronics':'Electrónica de consumo','Semiconductors':'Semiconductores',
 'Software - Infrastructure':'Software de infraestructura','Software - Application':'Software de aplicaciones',
 'Banks - Regional':'Bancos regionales','Banks - Diversified':'Bancos diversificados',
 'Oil & Gas Integrated':'Petróleo y gas integrado','Oil & Gas E&P':'Exploración y producción de petróleo y gas',
 'Utilities - Regulated Electric':'Distribución eléctrica regulada','Building Materials':'Materiales de construcción',
 'Internet Content & Information':'Servicios y contenido de Internet','Auto Manufacturers':'Fabricantes de automóviles',
 'Communication Equipment':'Equipamiento de comunicaciones','Capital Markets':'Mercados de capitales'
};

function translateSector(v){return SECTOR_ES[v]||v||''}
function translateIndustry(v){return INDUSTRY_ES[v]||v||''}
function normalizeExchange(v){
 const x=String(v||'').trim().toUpperCase();
 if(x==='NASD')return'NASDAQ';
 if(x==='AMEX')return'NYSE American';
 return x;
}
function parseFinvizProfile(html,symbol){
 const doc=new DOMParser().parseFromString(html,'text/html');
 const anchors=[...doc.querySelectorAll('a')];
 const byHref=(needle)=>{
   const a=anchors.find(x=>String(x.getAttribute('href')||'').toLowerCase().includes(needle));
   return a?normCell(a.textContent):'';
 };
 let name='';
 const h2=[...doc.querySelectorAll('h2')].find(x=>normCell(x.textContent)&&normCell(x.textContent).toUpperCase()!==symbol.toUpperCase());
 if(h2)name=normCell(h2.textContent);
 if(!name){
   const title=normCell(doc.title);
   const m=title.match(/^[^-]+-\s*(.*?)\s+Stock Price/i);
   if(m)name=m[1].trim();
 }
 return{
   name,
   sector:translateSector(byHref('sec_')),
   industry:translateIndustry(byHref('ind_')),
   country:byHref('geo_')==='USA'?'Estados Unidos':byHref('geo_'),
   exchange:normalizeExchange(byHref('exch_'))
 };
}
function profileChip(label,value,extra=''){
 if(!value)return'';
 return `<span class="profile-chip ${extra}"><span>${label}</span><b>${value}</b></span>`;
}
function updateAnalysisPortfolioButton(){
 const add=$('analysisAddPortfolioBtn'),watch=$('analysisAddWatchBtn'),reduce=$('analysisReducePortfolioBtn'),close=$('analysisClosePortfolioBtn');if(!add)return;if(!state.symbol||!state.type){[add,watch,reduce,close].filter(Boolean).forEach(b=>b.disabled=true);return}const key=state.currentKey||'medium',ref=portfolioItemRef(state.symbol,state.type,key),inPortfolio=!!ref.item?.inPortfolio,inWatch=scanResultInWatchlist(state.symbol,state.type,key);watch.disabled=inWatch;watch.textContent=inWatch?'En Watchlist':'+ Watchlist';add.disabled=false;add.textContent=inPortfolio?'+ Aumentar':'+ Cartera';reduce.disabled=!inPortfolio;close.disabled=!inPortfolio;if($('analysisPortfolioHint'))$('analysisPortfolioHint').textContent=inPortfolio?'Posición abierta: podés aumentar, reducir o cerrar con control de tenencia.':inWatch?'Activo en seguimiento. Podés abrir una posición cuando quieras.':'Podés seguirlo en Watchlist o registrarlo como posición real.';
}

function renderAssetProfile(p={}){
 state.assetProfile={...p};
 setTimeout(()=>loadRelativeStrengthForCurrent().catch(()=>{}),30);
 const name=p.name||'';
 $('assetCompanyName').textContent=name||'Información societaria no disponible';
 const chips=[];
 chips.push(profileChip('Sector',p.sector,'sector'));
 chips.push(profileChip('Actividad',p.industry));
 chips.push(profileChip('País',p.country));
 chips.push(profileChip('Mercado',p.market||p.exchange,'market'));
 chips.push(profileChip('Moneda',p.currency));
 chips.push(profileChip('Panel',p.panel));
 chips.push(profileChip('Tipo',p.instrumentType));
 chips.push(profileChip('Subyacente',p.underlying,'underlying'));
 chips.push(profileChip('ADR',p.adrTicker,'underlying'));
 $('assetProfile').innerHTML=chips.filter(Boolean).join('')||'<span class="profile-loading">Sin metadata adicional disponible.</span>';
}
function resetAssetProfile(){
 state.assetProfile=null;
 $('assetCompanyName').textContent='—';
 $('assetProfile').innerHTML='<span class="profile-loading">Cargando información del activo…</span>';
}

async function fetchBondInfo(symbol){
 const r=await fetch(`/api/byma/bond-info?symbol=${encodeURIComponent(symbol)}`);
 if(!r.ok){let t='';try{t=await r.text()}catch{};throw new Error(t||('BYMA ficha '+r.status))}
 return await r.json();
}

async function loadAssetProfile(type,actual){
 try{
   if(['argbond','on'].includes(type)){
     const j=await fetchBondInfo(actual);
     const b=j?.data?.[0]||{};
     renderAssetProfile({
       name:b.denominacion||actual,
       sector:type==='on'?'Renta fija corporativa':'Renta fija soberana / Tesoro',
       industry:b.tipoObligacion||b.tipoEspecie||'',
       country:'Argentina',
       market:'BYMA',
       currency:b.moneda||'',
       panel:b.ley?`Ley ${b.ley}`:'',
       instrumentType:type==='on'?'Obligación Negociable':'Bono / Letra',
       underlying:b.emisor||''
     });
     return;
   }
   if(type==='crypto'){
     const pair=actual.toUpperCase();
     const quote=pair.endsWith('USDT')?'USDT':pair.endsWith('USDC')?'USDC':'';
     const base=quote?pair.slice(0,-quote.length):pair;
     renderAssetProfile({
       name:`${CRYPTO_NAMES[base]||base} / ${quote||'Crypto'}`,
       sector:'Criptoactivos',
       industry:'Activo digital',
       country:'Global',
       market:'Binance Spot',
       currency:quote||'—',
       instrumentType:'Par crypto'
     });
     return;
   }

   if(type==='stock'||type==='cedear'){
     const underlying=actual.replace(/\.BA$/,'');
     const finvizHtml=await fetchFinvizPublic(underlying);
     const fp=parseFinvizProfile(finvizHtml,underlying);
     renderAssetProfile({
       ...fp,
       market:type==='cedear'?'BYMA · CEDEAR':(fp.exchange||'Mercado USA'),
       currency:type==='cedear'?'ARS':'USD',
       instrumentType:type==='cedear'?'CEDEAR':'Acción / ADR',
       underlying:type==='cedear'?underlying:'',
       country:fp.country||'Estados Unidos'
     });
     return;
   }

   if(type==='argstock'){
     const ticker=actual.replace(/\.BA$/,'').toUpperCase();
     const local=ARG_COMPANY_PROFILES[ticker]||{};
     let remote={};
     if(local.adr){
       try{
         remote=parseFinvizProfile(await fetchFinvizPublic(local.adr),local.adr);
       }catch{}
     }
     renderAssetProfile({
       name:local.name||remote.name||ticker,
       sector:local.sector||remote.sector||'',
       industry:local.industry||remote.industry||'',
       country:'Argentina',
       market:'BYMA',
       currency:'ARS',
       panel:local.panel||'',
       instrumentType:'Acción argentina',
       adrTicker:local.adr||''
     });
   }
 }catch(e){
   console.warn('Perfil del activo no disponible',e);
   const fallback=type==='cedear'
     ? {name:actual.replace(/\.BA$/,''),market:'BYMA · CEDEAR',currency:'ARS',instrumentType:'CEDEAR',underlying:actual.replace(/\.BA$/,'')}
     : type==='argstock'
       ? {name:actual.replace(/\.BA$/,''),country:'Argentina',market:'BYMA',currency:'ARS',instrumentType:'Acción argentina'}
       : {name:actual,market:'Mercado USA',currency:'USD',instrumentType:'Acción / ADR'};
   renderAssetProfile(fallback);
 }
}

async function fetchAlphaFundamentals(symbol){
 const r=await fetch(`/api/alphavantage/fundamentals?symbol=${encodeURIComponent(symbol)}`);
 if(!r.ok){
   let t='';try{t=await r.text()}catch{}
   const e=new Error(t||('Alpha Vantage '+r.status));e.status=r.status;throw e;
 }
 return await r.json();
}

function avNum(v){
 if(v===null||v===undefined||v===''||v==='None'||v==='null'||v==='-')return NaN;
 const n=Number(v);return Number.isFinite(n)?n:NaN;
}
function avMoney(v,c='USD'){return moneyShort(avNum(v)).replace('US$',c==='USD'?'US$':c)}
function quarterGrowth(reports,field){
 if(!Array.isArray(reports)||reports.length<2)return NaN;
 const latest=reports[0],lv=avNum(latest?.[field]);
 if(!Number.isFinite(lv))return NaN;
 const ld=new Date(latest.fiscalDateEnding+'T00:00:00Z');
 let prior=null,best=1e12;
 for(let i=1;i<reports.length;i++){
   const d=new Date(reports[i].fiscalDateEnding+'T00:00:00Z');
   const days=Math.abs((ld-d)/86400000-365);
   if(days<best){best=days;prior=reports[i]}
 }
 const pv=avNum(prior?.[field]);
 return Number.isFinite(pv)&&pv!==0?((lv/pv)-1)*100:NaN;
}
function friendlyAlphaMessage(msg){
 const s=String(msg||'');
 if(/1 request per second/i.test(s))return 'límite temporal del plan gratuito (1 consulta por segundo)';
 if(/25 requests per day/i.test(s))return 'cuota diaria gratuita alcanzada (25 consultas)';
 if(/premium/i.test(s))return 'dato no incluido en el plan gratuito';
 if(/not configured|no configurado/i.test(s))return 'API no configurada';
 return 'fuente temporalmente no disponible';
}
function parseAlphaBundle(j){
 const inc=j?.income||{},bal=j?.balance||{},cf=j?.cashflow||{},earn=j?.earnings||{};
 const iq=inc?.quarterlyReports?.[0]||{},bq=bal?.quarterlyReports?.[0]||{},cq=cf?.quarterlyReports?.[0]||{},eq=earn?.quarterlyEarnings?.[0]||{};
 const currency=iq.reportedCurrency||bq.reportedCurrency||'USD';
 const debtParts=[avNum(bq.shortTermDebt),avNum(bq.longTermDebt)].filter(Number.isFinite);
 let debt=avNum(bq.shortLongTermDebtTotal);
 if(!Number.isFinite(debt)&&debtParts.length)debt=debtParts.reduce((s,v)=>s+v,0);
 const cash=Number.isFinite(avNum(bq.cashAndShortTermInvestments))?avNum(bq.cashAndShortTermInvestments):avNum(bq.cashAndCashEquivalentsAtCarryingValue);
 const assets=avNum(bq.totalAssets),ca=avNum(bq.totalCurrentAssets),liab=avNum(bq.totalLiabilities),cl=avNum(bq.totalCurrentLiabilities),equity=avNum(bq.totalShareholderEquity);
 const ocf=avNum(cq.operatingCashflow),capex=avNum(cq.capitalExpenditures);
 const fcf=Number.isFinite(ocf)&&Number.isFinite(capex)?ocf-Math.abs(capex):NaN;
 const cleanErrors=(Array.isArray(j?.errors)?j.errors:[]).map(friendlyAlphaMessage);
 return{
   source:'Alpha Vantage',
   errors:[...new Set(cleanErrors)],
   cached:!!j?.cached,cacheAgeHours:j?.cacheAgeHours,currency,
   fiscalPeriod:iq.fiscalDateEnding||bq.fiscalDateEnding||'',
   revenueQ:avNum(iq.totalRevenue),
   grossProfitQ:avNum(iq.grossProfit),
   operatingIncomeQ:avNum(iq.operatingIncome),
   netIncomeQ:avNum(iq.netIncome),
   ebitdaQ:avNum(iq.ebitda),
   revenueGrowth:quarterGrowth(inc?.quarterlyReports,'totalRevenue'),
   earningsGrowth:quarterGrowth(inc?.quarterlyReports,'netIncome'),
   reportedEPS:avNum(eq.reportedEPS),estimatedEPS:avNum(eq.estimatedEPS),surprisePct:avNum(eq.surprisePercentage),reportedDate:eq.reportedDate||'',
   assets,currentAssets:ca,liabilities:liab,currentLiabilities:cl,equity,cash,inventory:avNum(bq.inventory),debt,
   netDebt:Number.isFinite(debt)&&Number.isFinite(cash)?debt-cash:NaN,
   currentRatio:Number.isFinite(ca)&&Number.isFinite(cl)&&cl!==0?ca/cl:NaN,
   debtEquity:Number.isFinite(debt)&&Number.isFinite(equity)&&equity!==0?debt/equity:NaN,
   ocf,capex,fcf,dividendPayout:avNum(cq.dividendPayout),investCF:avNum(cq.cashflowFromInvestment),financeCF:avNum(cq.cashflowFromFinancing)
 };
}
function renderAlpha(av){
 const set=(id,v)=>{const el=$(id);if(el)el.textContent=v};
 const c=av.currency||'USD';
 set('avFiscalPeriod',av.fiscalPeriod||'—');set('avCurrency',c);
 set('avRevenueQ',avMoney(av.revenueQ,c));set('avRevenueGrowth',pctOrDash(av.revenueGrowth));
 set('avGrossProfitQ',avMoney(av.grossProfitQ,c));set('avOperatingIncomeQ',avMoney(av.operatingIncomeQ,c));
 set('avNetIncomeQ',avMoney(av.netIncomeQ,c));set('avEarningsGrowth',pctOrDash(av.earningsGrowth));set('avEbitdaQ',avMoney(av.ebitdaQ,c));
 set('avReportedEPS',numOrDash(av.reportedEPS,3));set('avEstimatedEPS',numOrDash(av.estimatedEPS,3));set('avSurprise',pctOrDash(av.surprisePct));set('avReportedDate',av.reportedDate||'—');
 set('avAssets',avMoney(av.assets,c));set('avCurrentAssets',avMoney(av.currentAssets,c));set('avLiabilities',avMoney(av.liabilities,c));set('avCurrentLiabilities',avMoney(av.currentLiabilities,c));
 set('avEquity',avMoney(av.equity,c));set('avCash',avMoney(av.cash,c));set('avInventory',avMoney(av.inventory,c));set('avDebt',avMoney(av.debt,c));set('avNetDebt',avMoney(av.netDebt,c));
 set('avCurrentRatio',numOrDash(av.currentRatio));set('avDebtEquity',numOrDash(av.debtEquity));
 set('avOCF',avMoney(av.ocf,c));set('avCapex',avMoney(av.capex,c));set('avFCF',avMoney(av.fcf,c));set('avDividendPayout',avMoney(av.dividendPayout,c));set('avInvestCF',avMoney(av.investCF,c));set('avFinanceCF',avMoney(av.financeCF,c));
 const cacheTxt=av.cached?`caché local${Number.isFinite(av.cacheAgeHours)?' · '+av.cacheAgeHours.toFixed(1)+' h':''}`:'actualizado ahora';
 const err=av.errors?.length?` · datos parciales: ${av.errors.join('; ')}`:'';
 $('alphaStatus').innerHTML=`Alpha Vantage: <span class="${av.errors?.length?'alpha-warn':'alpha-ok'}">${cacheTxt}${err}</span>`;
 compactFundamentals();
}

async function fetchFinvizPublic(symbol){
 const r=await fetch(`/api/finviz?symbol=${encodeURIComponent(symbol)}`);
 if(!r.ok){let t='';try{t=await r.text()}catch{};throw new Error(t||('Finviz '+r.status))}
 return await r.text();
}
async function fetchYahooFundamentals(symbol){
 const r=await fetch(`/api/yahoo/fundamentals?symbol=${encodeURIComponent(symbol)}`);
 if(!r.ok){let t='';try{t=await r.text()}catch{};throw new Error(t||('Yahoo fundamentals '+r.status))}
 return await r.json();
}

function cleanFinvizText(html){
 const doc=new DOMParser().parseFromString(html,'text/html');
 const raw=(doc.body?.innerText||doc.body?.textContent||html);
 return raw.replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
}
function normCell(s){return String(s??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim()}
function finvizCellMap(html){
 const doc=new DOMParser().parseFromString(html,'text/html');
 const cells=[...doc.querySelectorAll('td')].map(td=>normCell(td.textContent));
 const labels=new Set([
  'Market Cap','Enterprise Value','Income','Sales','Book/sh','Cash/sh','Dividend Est.','Dividend TTM',
  'Dividend Ex-Date','Dividend Gr. 3/5Y','Payout','P/E','Forward P/E','PEG','P/S','P/B','P/C','P/FCF',
  'EV/EBITDA','EV/Sales','Quick Ratio','Current Ratio','Debt/Eq','LT Debt/Eq','EPS (ttm)','EPS next Y',
  'EPS next Q','EPS this Y','EPS next 5Y','EPS past 3/5Y','Sales past 3/5Y','EPS Y/Y TTM','Sales Y/Y TTM',
  'EPS Q/Q','Sales Q/Q','Earnings','EPS/Sales Surpr.','Insider Own','Inst Own','ROA','ROE','ROIC',
  'Gross Margin','Oper. Margin','Profit Margin','Shs Outstand','Shs Float','52W High','52W Low',
  'ATR (14)','RSI (14)','Beta','Rel Volume','Avg Volume','Volume','Recom','Target Price','Price'
 ]);
 const map={};
 for(let i=0;i<cells.length-1;i++){
   const label=cells[i];
   if(!labels.has(label))continue;
   let value='';
   for(let j=i+1;j<Math.min(cells.length,i+4);j++){
     if(cells[j] && !labels.has(cells[j])){value=cells[j];break}
   }
   if(!value)continue;
   (map[label]??=[]).push(value);
 }
 return map;
}
function reEsc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function fvMatch(text,label,valuePattern,flags='i'){
 const re=new RegExp(reEsc(label)+'\\s+'+valuePattern,flags);
 return text.match(re)||null;
}
function mapValue(map,label,index=0){
 const a=map?.[label];
 return Array.isArray(a)&&a.length>a[index]?a[index]:null;
}
function firstFinite(...vals){
 for(const v of vals)if(Number.isFinite(v))return v;
 return NaN;
}
function parsePlainNumber(s){
 if(s==null||s===''||s==='-'||s==='N/A')return NaN;
 const n=Number(String(s).replace(/,/g,'').replace(/%/g,'').trim());
 return Number.isFinite(n)?n:NaN;
}
function suffixNumber(s){
 if(s==null||s===''||s==='-'||s==='N/A')return NaN;
 const m=String(s).trim().replace(/,/g,'').match(/^(-?\d+(?:\.\d+)?)([KMBT])?$/i);
 if(!m)return NaN;
 const mult={K:1e3,M:1e6,B:1e9,T:1e12}[String(m[2]||'').toUpperCase()]||1;
 return +m[1]*mult;
}
function pctFrom(s){
 if(s==null)return NaN;
 const m=String(s).match(/(-?\d+(?:\.\d+)?)%/);
 return m?+m[1]:NaN;
}
function numberFrom(s){
 if(s==null)return NaN;
 const m=String(s).replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);
 return m?+m[0]:NaN;
}
function pairPercents(s){
 if(!s)return [NaN,NaN];
 const a=[...String(s).matchAll(/(-?\d+(?:\.\d+)?)%/g)].map(m=>+m[1]);
 return [a[0]??NaN,a[1]??NaN];
}
function dividendPair(s){
 if(!s)return {amount:NaN,yield:NaN};
 const m=String(s).match(/(-?\d+(?:\.\d+)?)\s*\((-?\d+(?:\.\d+)?)%\)/);
 return m?{amount:+m[1],yield:+m[2]}:{amount:numberFrom(s),yield:pctFrom(s)};
}
function highLowValue(s){
 if(!s)return NaN;
 return numberFrom(s);
}
function parseFinvizPublic(html,symbol){
 const map=finvizCellMap(html),t=cleanFinvizText(html);
 const fallback=(label,pat='(-?\\d+(?:\\.\\d+)?(?:[KMBT])?)')=>{
   const m=fvMatch(t,label,pat);return m?m[1]:null;
 };
 const val=(label,index=0)=>mapValue(map,label,index);
 const raw=(label,index=0,pat)=>val(label,index)??fallback(label,pat);
 const divTTM=dividendPair(val('Dividend TTM')??'');
 const divEst=dividendPair(val('Dividend Est.')??'');
 const epsPast=pairPercents(val('EPS past 3/5Y'));
 const salesPast=pairPercents(val('Sales past 3/5Y'));
 const divGrowth=pairPercents(val('Dividend Gr. 3/5Y'));
 const epsNextYs=map['EPS next Y']||[];
 const epsNextYGrowth=epsNextYs.map(x=>pctFrom(x)).find(Number.isFinite);
 const epsNextYAbs=epsNextYs.map(x=>parsePlainNumber(x)).find(Number.isFinite);
 return{
  symbol,
  marketCap:suffixNumber(raw('Market Cap')),
  enterpriseValue:suffixNumber(raw('Enterprise Value')),
  income:suffixNumber(raw('Income')),
  sales:suffixNumber(raw('Sales')),
  bookSh:parsePlainNumber(raw('Book/sh')),
  cashSh:parsePlainNumber(raw('Cash/sh')),
  pe:parsePlainNumber(raw('P/E')),
  forwardPE:parsePlainNumber(raw('Forward P/E')),
  peg:parsePlainNumber(raw('PEG')),
  ps:parsePlainNumber(raw('P/S')),
  pb:parsePlainNumber(raw('P/B')),
  pfcf:parsePlainNumber(raw('P/FCF')),
  evEbitda:parsePlainNumber(raw('EV/EBITDA')),
  quickRatio:parsePlainNumber(raw('Quick Ratio')),
  currentRatio:parsePlainNumber(raw('Current Ratio')),
  debtEq:parsePlainNumber(raw('Debt/Eq')),
  ltDebtEq:parsePlainNumber(raw('LT Debt/Eq')),
  epsTtm:parsePlainNumber(raw('EPS (ttm)')),
  epsNextYAbsolute:epsNextYAbs,
  epsThisY:pctFrom(raw('EPS this Y',0,'(-?\\d+(?:\\.\\d+)?)%')),
  epsNextY:epsNextYGrowth,
  epsNext5Y:pctFrom(raw('EPS next 5Y',0,'(-?\\d+(?:\\.\\d+)?)%')),
  epsYY:pctFrom(raw('EPS Y/Y TTM',0,'(-?\\d+(?:\\.\\d+)?)%')),
  salesYY:pctFrom(raw('Sales Y/Y TTM',0,'(-?\\d+(?:\\.\\d+)?)%')),
  epsQQ:pctFrom(raw('EPS Q/Q',0,'(-?\\d+(?:\\.\\d+)?)%')),
  salesQQ:pctFrom(raw('Sales Q/Q',0,'(-?\\d+(?:\\.\\d+)?)%')),
  epsPast3:epsPast[0],epsPast5:epsPast[1],
  salesPast3:salesPast[0],salesPast5:salesPast[1],
  roa:pctFrom(raw('ROA',0,'(-?\\d+(?:\\.\\d+)?)%')),
  roe:pctFrom(raw('ROE',0,'(-?\\d+(?:\\.\\d+)?)%')),
  roic:pctFrom(raw('ROIC',0,'(-?\\d+(?:\\.\\d+)?)%')),
  grossMargin:pctFrom(raw('Gross Margin',0,'(-?\\d+(?:\\.\\d+)?)%')),
  operMargin:pctFrom(raw('Oper. Margin',0,'(-?\\d+(?:\\.\\d+)?)%')),
  profitMargin:pctFrom(raw('Profit Margin',0,'(-?\\d+(?:\\.\\d+)?)%')),
  insiderOwn:pctFrom(raw('Insider Own',0,'(-?\\d+(?:\\.\\d+)?)%')),
  instOwn:pctFrom(raw('Inst Own',0,'(-?\\d+(?:\\.\\d+)?)%')),
  sharesOutstanding:suffixNumber(raw('Shs Outstand')),
  high52:highLowValue(raw('52W High')),
  low52:highLowValue(raw('52W Low')),
  beta:parsePlainNumber(raw('Beta')),
  atr:parsePlainNumber(raw('ATR (14)')),
  rsi:parsePlainNumber(raw('RSI (14)')),
  relVolume:parsePlainNumber(raw('Rel Volume')),
  avgVolume:suffixNumber(raw('Avg Volume')),
  targetPrice:parsePlainNumber(raw('Target Price')),
  recom:parsePlainNumber(raw('Recom')),
  price:parsePlainNumber(raw('Price')),
  dividendTTM:divTTM.amount,dividendYield:divTTM.yield,
  dividendEst:divEst.amount,dividendEstYield:divEst.yield,
  exDate:val('Dividend Ex-Date')||'',
  divGrowth3:divGrowth[0],divGrowth5:divGrowth[1],
  payout:pctFrom(raw('Payout',0,'(-?\\d+(?:\\.\\d+)?)%')),
  earnings:val('Earnings')||''
 };
}

function yahooPriceFallback(j){
 const res=j?.chart?.result?.[0];const q=res?.indicators?.quote?.[0]||{};
 const c=[...(q.close||[])].reverse().find(Number.isFinite);
 return Number.isFinite(c)?c:NaN;
}
function moneyShort(v){
 if(!Number.isFinite(v))return'—';
 const a=Math.abs(v),sign=v<0?'-':'';
 if(a>=1e12)return `${sign}US$ ${(a/1e12).toFixed(2)} T`;
 if(a>=1e9)return `${sign}US$ ${(a/1e9).toFixed(2)} B`;
 if(a>=1e6)return `${sign}US$ ${(a/1e6).toFixed(2)} M`;
 return `${sign}US$ ${a.toLocaleString('es-AR',{maximumFractionDigits:2})}`;
}
function numOrDash(v,d=2){return Number.isFinite(v)?v.toFixed(d):'—'}
function pctOrDash(v){return Number.isFinite(v)?`${v>=0?'+':''}${v.toFixed(2)}%`:'—'}

function fundamentalCoverage(f){
 const keys=[
  'marketCap','pe','forwardPE','peg','ps','pb','pfcf','evEbitda',
  'epsTtm','epsThisY','epsNext5Y','epsYY','salesYY','roe','roic',
  'grossMargin','operMargin','profitMargin','currentRatio','debtEq',
  'dividendYield','price','high52','low52','beta','targetPrice'
 ];
 const present=keys.filter(k=>Number.isFinite(f?.[k]));
 return{count:present.length,total:keys.length,pct:Math.round(present.length/keys.length*100),present};
}
function finvizReading(f){
 const coverage=fundamentalCoverage(f);
 let pts=0,max=0,pos=[],warn=[];
 const add=(cond,w,good,bad)=>{
   max+=w;
   if(cond){pts+=w;pos.push(good)}else warn.push(bad);
 };
 if(Number.isFinite(f.salesYY))add(f.salesYY>0,15,`ventas TTM crecen ${f.salesYY.toFixed(1)}%`,`ventas TTM caen ${Math.abs(f.salesYY).toFixed(1)}%`);
 if(Number.isFinite(f.epsYY))add(f.epsYY>0,15,`BPA TTM crece ${f.epsYY.toFixed(1)}%`,`BPA TTM cae ${Math.abs(f.epsYY).toFixed(1)}%`);
 if(Number.isFinite(f.roe))add(f.roe>=15,15,`ROE elevado (${f.roe.toFixed(1)}%)`,`ROE moderado/bajo (${f.roe.toFixed(1)}%)`);
 if(Number.isFinite(f.roic))add(f.roic>=12,15,`ROIC sólido (${f.roic.toFixed(1)}%)`,`ROIC moderado/bajo (${f.roic.toFixed(1)}%)`);
 if(Number.isFinite(f.profitMargin))add(f.profitMargin>0,10,`margen neto positivo (${f.profitMargin.toFixed(1)}%)`,'margen neto negativo');
 if(Number.isFinite(f.debtEq))add(f.debtEq<=1,10,`endeudamiento contenido (D/P ${f.debtEq.toFixed(2)})`,`D/P elevado (${f.debtEq.toFixed(2)})`);
 if(Number.isFinite(f.currentRatio))add(f.currentRatio>=1.0,10,`liquidez corriente ${f.currentRatio.toFixed(2)}x`,`liquidez corriente baja (${f.currentRatio.toFixed(2)}x)`);
 if(Number.isFinite(f.epsNext5Y))add(f.epsNext5Y>0,10,`crecimiento BPA 5Y estimado positivo (${f.epsNext5Y.toFixed(1)}%)`,'crecimiento BPA 5Y no positivo');

 if(coverage.count<6 || max<30){
   return{
     label:'DATOS PARCIALES',cls:'amber',score:NaN,coverage,
     text:`Se recuperaron ${coverage.count} de ${coverage.total} métricas de referencia. No hay cobertura suficiente para asignar una calificación fundamental confiable.`
   };
 }

 const score=Math.round(pts/max*100);
 let label,cls;
 if(coverage.count<12){
   label='LECTURA PRELIMINAR';
   cls='amber';
 }else if(score>=75){
   label='SÓLIDA';cls='green';
 }else if(score>=52){
   label='MIXTA / POSITIVA';cls='green';
 }else if(score>=35){
   label='MIXTA';cls='amber';
 }else{
   label='DÉBIL';cls='red';
 }

 let text=`Score descriptivo ${score}/100 con cobertura ${coverage.count}/${coverage.total}. `;
 if(pos.length)text+='Fortalezas: '+pos.join('; ')+'. ';
 if(warn.length)text+='Alertas: '+warn.join('; ')+'. ';
 text+='La valuación debe compararse con sector, crecimiento e historia de múltiplos; no determina por sí sola una compra.';
 return{label,cls,score,coverage,text};
}
function resetFundamentals(type){
 const ids=['fvPE','fvFwdPE','fvDivYield','fvMarketCap','fvEV','fvSales','fvIncome','fvEPS','fvPEG','fvPS','fvPB','fvPFCF','fvEVEBITDA','fvTarget','fvRecom',
 'fvEPSThisY','fvEPSNextY','fvEPSNext5Y','fvEPSYY','fvSalesYY','fvEPSQQ','fvSalesQQ','fvEPSPast','fvSalesPast','fvEarnings',
 'fvROA','fvROE','fvROIC','fvGrossMargin','fvOperMargin','fvProfitMargin','fvCurrent','fvQuick','fvDebtEq','fvLTDebtEq','fvCashSh','fvBookSh',
 'fvDivTTM','fvDivYield2','fvDivEst','fvDivEstYield','fvExDate','fvDivGrowth','fvPayout','fvPrice','fv52High','fv52Low','fvBeta','fvATR','fvRSI','fvRelVol','fvAvgVol','fvInsiderOwn','fvInstOwn',
 'avFiscalPeriod','avCurrency','avRevenueQ','avRevenueGrowth','avGrossProfitQ','avOperatingIncomeQ','avNetIncomeQ','avEarningsGrowth','avEbitdaQ','avReportedEPS','avEstimatedEPS','avSurprise','avReportedDate',
 'avAssets','avCurrentAssets','avLiabilities','avCurrentLiabilities','avEquity','avCash','avInventory','avDebt','avNetDebt','avCurrentRatio','avDebtEquity','avShares',
 'avOCF','avCapex','avFCF','avDividendPayout','avInvestCF','avFinanceCF'];
 ids.forEach(id=>{if($(id))$(id).textContent='—'});
 $('fundRead').textContent='—';$('fundRead').className='amber';
 ['sumSalesGrowth','sumROE','sumPE','sumDebtEq','sumDividend'].forEach(id=>{if($(id))$(id).textContent='—'});
 if($('fundPositive'))$('fundPositive').textContent='Esperando datos.';
 if($('fundWarning'))$('fundWarning').textContent='Esperando datos.';
 if($('fundCoverage'))$('fundCoverage').textContent='Cobertura: —';
 $('fundSource').textContent='—';$('fundSource').className='source';
 $('fundPeriod').textContent='—';
 $('fundWhy').innerHTML='<strong>Lectura:</strong> esperando datos fundamentales.';
 $('fundContext').textContent=type==='crypto'?'No aplica a un par crypto.':'Cargando fundamentales…';
 $('alphaStatus').textContent=type==='crypto'?'Alpha Vantage: no aplica':'Alpha Vantage: verificando configuración local…';
}


function setFundamentalSummary(f){
 const set=(id,val,cls='')=>{const el=$(id);if(el){el.textContent=val;if(cls)el.className=cls}};
 set('sumSalesGrowth',pctOrDash(f.salesYY));
 set('sumROE',pctOrDash(f.roe));
 set('sumPE',numOrDash(f.pe));
 set('sumDebtEq',numOrDash(f.debtEq));
 set('sumDividend',Number.isFinite(f.dividendYield)?f.dividendYield.toFixed(2)+'%':'—');

 const positives=[],warnings=[];
 if(Number.isFinite(f.salesYY)){if(f.salesYY>8)positives.push(`Ventas +${f.salesYY.toFixed(1)}% interanual`);else if(f.salesYY<0)warnings.push(`Ventas -${Math.abs(f.salesYY).toFixed(1)}% interanual`)}
 if(Number.isFinite(f.epsYY)){if(f.epsYY>10)positives.push(`BPA +${f.epsYY.toFixed(1)}% interanual`);else if(f.epsYY<0)warnings.push(`BPA -${Math.abs(f.epsYY).toFixed(1)}% interanual`)}
 if(Number.isFinite(f.roe)){if(f.roe>=20)positives.push(`ROE ${f.roe.toFixed(1)}%`);else if(f.roe<10)warnings.push(`ROE bajo: ${f.roe.toFixed(1)}%`)}
 if(Number.isFinite(f.roic)){if(f.roic>=15)positives.push(`ROIC ${f.roic.toFixed(1)}%`);else if(f.roic<8)warnings.push(`ROIC bajo: ${f.roic.toFixed(1)}%`)}
 if(Number.isFinite(f.profitMargin)&&f.profitMargin>20)positives.push(`Margen neto ${f.profitMargin.toFixed(1)}%`);
 if(Number.isFinite(f.debtEq)&&f.debtEq>1.5)warnings.push(`Deuda/Patrimonio ${f.debtEq.toFixed(2)}x`);
 if(Number.isFinite(f.pe)&&f.pe>45)warnings.push(`PER exigente: ${f.pe.toFixed(1)}x`);
 if(Number.isFinite(f.pe)&&f.pe>0&&f.pe<18)positives.push(`PER moderado: ${f.pe.toFixed(1)}x`);

 const cov=fundamentalCoverage(f);
 set('fundPositive',
   positives.length?positives.slice(0,2).join(' · '):
   cov.count<6?'Cobertura insuficiente para identificar fortalezas con confianza.':
   'No aparece una fortaleza dominante en las métricas disponibles.'
 );
 set('fundWarning',
   warnings.length?warnings.slice(0,2).join(' · '):
   cov.count<6?'Faltan métricas para evaluar correctamente riesgos fundamentales.':
   'No aparece una advertencia dominante en las métricas disponibles.'
 );
}

function renderFinviz(f,context,partialReason=''){
 const r=finvizReading(f);
 $('fundRead').textContent=r.label+(Number.isFinite(r.score)?` · ${r.score}/100`:'');
 $('fundRead').className=r.cls;
 if($('fundCoverage'))$('fundCoverage').textContent=`Cobertura: ${r.coverage?.count??0}/${r.coverage?.total??26} métricas`;
 $('fundSource').textContent='Finviz público'+(partialReason?' · parcial':'');$('fundSource').className='source '+(partialReason?'partial':'ok');
 $('fundPeriod').textContent='Snapshot actual';
 $('fundContext').textContent=context;
 const set=(id,val)=>{const el=$(id);if(el)el.textContent=val};
 set('fvPE',numOrDash(f.pe));set('fvFwdPE',numOrDash(f.forwardPE));
 set('fvMarketCap',moneyShort(f.marketCap));set('fvEV',moneyShort(f.enterpriseValue));set('fvSales',moneyShort(f.sales));set('fvIncome',moneyShort(f.income));
 set('fvEPS',numOrDash(f.epsTtm));set('fvPEG',numOrDash(f.peg));set('fvPS',numOrDash(f.ps));set('fvPB',numOrDash(f.pb));set('fvPFCF',numOrDash(f.pfcf));
 set('fvEVEBITDA',numOrDash(f.evEbitda));set('fvTarget',Number.isFinite(f.targetPrice)?'US$ '+f.targetPrice.toFixed(2):'—');set('fvRecom',numOrDash(f.recom));
 set('fvEPSThisY',pctOrDash(f.epsThisY));set('fvEPSNextY',pctOrDash(f.epsNextY));set('fvEPSNext5Y',pctOrDash(f.epsNext5Y));
 set('fvEPSYY',pctOrDash(f.epsYY));set('fvSalesYY',pctOrDash(f.salesYY));set('fvEPSQQ',pctOrDash(f.epsQQ));set('fvSalesQQ',pctOrDash(f.salesQQ));
 set('fvEPSPast',Number.isFinite(f.epsPast3)?`${f.epsPast3.toFixed(1)}% / ${f.epsPast5.toFixed(1)}%`:'—');
 set('fvSalesPast',Number.isFinite(f.salesPast3)?`${f.salesPast3.toFixed(1)}% / ${f.salesPast5.toFixed(1)}%`:'—');set('fvEarnings',f.earnings||'—');
 set('fvROA',pctOrDash(f.roa));set('fvROE',pctOrDash(f.roe));set('fvROIC',pctOrDash(f.roic));set('fvGrossMargin',pctOrDash(f.grossMargin));
 set('fvOperMargin',pctOrDash(f.operMargin));set('fvProfitMargin',pctOrDash(f.profitMargin));set('fvCurrent',numOrDash(f.currentRatio));
 set('fvQuick',numOrDash(f.quickRatio));set('fvDebtEq',numOrDash(f.debtEq));set('fvLTDebtEq',numOrDash(f.ltDebtEq));
 set('fvCashSh',Number.isFinite(f.cashSh)?'US$ '+f.cashSh.toFixed(2):'—');set('fvBookSh',Number.isFinite(f.bookSh)?'US$ '+f.bookSh.toFixed(2):'—');
 set('fvDivTTM',Number.isFinite(f.dividendTTM)?'US$ '+f.dividendTTM.toFixed(4):'—');set('fvDivYield2',Number.isFinite(f.dividendYield)?f.dividendYield.toFixed(2)+'%':'—');
 set('fvDivEst',Number.isFinite(f.dividendEst)?'US$ '+f.dividendEst.toFixed(4):'—');set('fvDivEstYield',Number.isFinite(f.dividendEstYield)?f.dividendEstYield.toFixed(2)+'%':'—');
 set('fvExDate',f.exDate||'—');set('fvDivGrowth',Number.isFinite(f.divGrowth3)?`${f.divGrowth3.toFixed(1)}% / ${f.divGrowth5.toFixed(1)}%`:'—');set('fvPayout',pctOrDash(f.payout));
 set('fvPrice',Number.isFinite(f.price)?'US$ '+f.price.toFixed(2):'—');set('fv52High',Number.isFinite(f.high52)?'US$ '+f.high52.toFixed(2):'—');set('fv52Low',Number.isFinite(f.low52)?'US$ '+f.low52.toFixed(2):'—');
 set('fvBeta',numOrDash(f.beta));set('fvATR',numOrDash(f.atr));set('fvRSI',numOrDash(f.rsi));set('fvRelVol',numOrDash(f.relVolume));
 set('fvAvgVol',Number.isFinite(f.avgVolume)?(f.avgVolume/1e6).toFixed(2)+' M':'—');set('fvInsiderOwn',pctOrDash(f.insiderOwn));set('fvInstOwn',pctOrDash(f.instOwn));
 if(Number.isFinite(f.sharesOutstanding))$('avShares').textContent=f.sharesOutstanding>=1e9?(f.sharesOutstanding/1e9).toFixed(2)+' B':(f.sharesOutstanding/1e6).toFixed(2)+' M';
 setFundamentalSummary(f);
 $('fundWhy').innerHTML=`<strong>Lectura:</strong> ${r.text}${partialReason?` <span class="fund-error">${partialReason}</span>`:''}`;
 compactFundamentals();
}

function compactFundamentals(){
 document.querySelectorAll('#fundamentalsCard .fund-metric,#fundamentalsCard .fund-kpi').forEach(card=>{
   const b=card.querySelector('b');
   card.classList.toggle('is-empty',!b||b.textContent.trim()==='—');
 });
 document.querySelectorAll('#fundamentalsCard .fund-grid').forEach(grid=>{
   const has=[...grid.querySelectorAll('.fund-metric')].some(x=>!x.classList.contains('is-empty'));
   grid.classList.toggle('is-empty',!has);
   const det=grid.closest('details');
   if(det)det.style.display=has?'':'none';
 });
}

async function loadFundamentals(type,actual){
 resetFundamentals(type);
 if(type==='crypto'){
   $('fundSource').textContent='NO APLICA';$('fundPeriod').textContent='CRYPTO';
   $('fundWhy').innerHTML='<strong>Lectura:</strong> balances y dividendos corporativos no aplican a crypto.';
   return;
 }
 if(['argbond','on'].includes(type)){
   $('fundSource').textContent='RENTA FIJA';$('fundSource').className='source warn';
   $('fundPeriod').textContent='Ficha BYMA';
   $('fundContext').textContent='Para bonos, letras y ON la lectura relevante es precio, vencimiento, moneda, liquidez, cupón/amortización y riesgo del emisor; no se aplican ratios de acciones.';
   $('alphaStatus').textContent='Alpha Vantage: no aplica a renta fija local.';
   $('fundWhy').innerHTML='<strong>Lectura:</strong> Radar usa la ficha técnica de BYMA para identificar el instrumento. La TIR no se calcula todavía para evitar estimaciones incorrectas sin reconstruir el cashflow completo.';
   compactFundamentals();
   return;
 }
 if(type==='argstock'){
   $('fundSource').textContent='ARGENTINA';$('fundSource').className='source warn';
   $('fundPeriod').textContent='—';
   $('fundContext').textContent='Para acciones argentinas puras se mantiene Open BYMADATA; Alpha Vantage/Finviz se usan sobre todo para empresas listadas en EE.UU. y subyacentes de CEDEAR.';
   $('alphaStatus').textContent='Alpha Vantage: no aplicado a esta especie argentina.';
   $('fundWhy').innerHTML='<strong>Lectura:</strong> el módulo fundamental internacional no se fuerza sobre una acción local argentina.';
   return;
 }
 const underlying=actual.replace(/\.BA$/,'');
 const results=await Promise.allSettled([
   fetchAlphaFundamentals(underlying),
   fetchFinvizPublic(underlying),
   fetchYahooFundamentals(underlying)
 ]);

 const alphaOk=results[0].status==='fulfilled';
 const finvizOk=results[1].status==='fulfilled';
 const yahooOk=results[2].status==='fulfilled';

 if(!alphaOk&&!finvizOk&&!yahooOk){
   $('fundSource').textContent='NO DISPONIBLE';$('fundSource').className='source warn';
   $('fundPeriod').textContent='—';
   $('fundContext').textContent='No respondió ninguna fuente fundamental.';
   $('alphaStatus').textContent='Alpha Vantage: '+String(results[0].reason?.message||results[0].reason);
   $('fundWhy').innerHTML='<strong>Motivo:</strong> fallaron Alpha Vantage, Finviz y Yahoo. No se inventan datos.';
   return;
 }

 let f={symbol:underlying};
 if(finvizOk){
   f=parseFinvizPublic(results[1].value,underlying);
 }else{
   f={symbol:underlying};
 }
 if(yahooOk&&!Number.isFinite(f.price))f.price=yahooPriceFallback(results[2].value);

 const ctx=type==='cedear'
   ? `${underlying} · fundamentales del subyacente estadounidense; el gráfico técnico corresponde al CEDEAR de BYMA.`
   : `${underlying} · fundamentales corporativos de Alpha Vantage + Finviz.`;

 try{
   renderFinviz(f,ctx,
     !finvizOk?'Finviz no respondió. ':
     !yahooOk?'Yahoo no respondió; Alpha/Finviz continúan. ':''
   );
 }catch(e){
   console.error('Error al renderizar Finviz',e);
   $('fundSource').textContent=finvizOk?'Finviz · error de presentación':'Datos parciales';
   $('fundSource').className='source partial';
   $('fundWhy').innerHTML=`<strong>Lectura:</strong> hubo un error de presentación de datos Finviz: ${String(e.message||e)}.`;
 }

 if(alphaOk){
   try{
     const av=parseAlphaBundle(results[0].value);
     renderAlpha(av);
     $('fundSource').textContent='Alpha Vantage + '+(finvizOk?'Finviz':'Yahoo');
     $('fundSource').className='source '+(av.errors?.length?'partial':'ok');
     $('fundPeriod').textContent=av.fiscalPeriod?`Balance ${av.fiscalPeriod}`:'Último disponible';
   }catch(e){
     $('alphaStatus').innerHTML=`Alpha Vantage: <span class="alpha-warn">datos recibidos pero no pudieron presentarse (${String(e.message||e)})</span>`;
   }

   compactFundamentals();
 }else{
   const msg=String(results[0].reason?.message||results[0].reason||'no configurado');
   $('alphaStatus').innerHTML=`Alpha Vantage: <span class="alpha-warn">${friendlyAlphaMessage(msg)}</span>`;
   $('fundSource').textContent=finvizOk?'Finviz · Alpha Vantage pendiente':'Yahoo · datos parciales';
   $('fundSource').className='source partial';
 }
 compactFundamentals();
}

;
