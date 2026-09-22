import core from './[...path].js';

export default async function handler(req,res){
  const u=new URL(req.url,'https://radar.local');
  const ns=u.searchParams.get('ns');
  const path=u.searchParams.get('path');
  const route=u.searchParams.get('route');

  let target='/api/health';
  if(route==='health-root') target='/health';
  else if(route) target='/api/'+route;
  else if(ns) target='/api/'+ns+(path?'/'+path:'');

  u.searchParams.delete('ns');
  u.searchParams.delete('path');
  u.searchParams.delete('route');
  const qs=u.searchParams.toString();
  req.url=target+(qs?'?'+qs:'');

  return core(req,res);
}
