import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root=process.cwd();
const apiSource=await fs.readFile(path.join(root,'api','[...path].js'),'utf8');
const apiModule=await import('data:text/javascript;base64,'+Buffer.from(apiSource).toString('base64'));
const apiHandler=apiModule.default;

const mime=new Map([
  ['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],
  ['.json','application/json; charset=utf-8'],['.svg','image/svg+xml'],['.png','image/png'],['.jpg','image/jpeg'],
  ['.jpeg','image/jpeg'],['.ico','image/x-icon']
]);

function safeFile(urlPath){
  let p=decodeURIComponent(urlPath.split('?')[0]||'/');
  if(p==='/')p='/index.html';
  const full=path.resolve(root,'.'+p);
  if(!full.startsWith(root+path.sep))return null;
  return full;
}

const server=http.createServer(async(req,res)=>{
  try{
    if((req.url||'').startsWith('/api/')||(req.url||'')==='/health'){
      return await apiHandler(req,res);
    }
    const file=safeFile(req.url||'/');
    if(!file){res.statusCode=400;return res.end('Bad path');}
    const data=await fs.readFile(file);
    res.statusCode=200;
    res.setHeader('content-type',mime.get(path.extname(file).toLowerCase())||'application/octet-stream');
    res.setHeader('cache-control','no-store');
    res.end(data);
  }catch(e){
    res.statusCode=e?.code==='ENOENT'?404:500;
    res.setHeader('content-type','text/plain; charset=utf-8');
    res.end(String(e?.stack||e));
  }
});
const port=Number(process.env.PORT||4173);
server.listen(port,'127.0.0.1',()=>console.log(`Radar QA server http://127.0.0.1:${port}`));
