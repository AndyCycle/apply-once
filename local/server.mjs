import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {join} from 'node:path';
import {emptyProfile,validateProfile} from '../extension/schema.js';
import {BrowserSession,suggestions} from './browser.mjs';

export async function startApp(context,dataDir){
  await mkdir(dataDir,{recursive:true});
  const profileFile=join(dataDir,'profile.json'),token=randomBytes(32).toString('hex');
  let profile;
  try{profile=validateProfile(JSON.parse(await readFile(profileFile,'utf8')));}catch(e){if(e.code!=='ENOENT')throw e;profile=emptyProfile();}
  let origin,session,busy=false;
  const assets=new Map([['/app.js',new URL('app.js',import.meta.url)],['/schema.js',new URL('../extension/schema.js',import.meta.url)],['/style.css',new URL('style.css',import.meta.url)]]);
  const server=http.createServer(async(req,res)=>{
    const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
    if(req.headers.host!==new URL(origin).host)return json(403,{error:'无效来源'});
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'");
    const path=new URL(req.url,origin).pathname;
    try{
      if(req.method==='GET'&&path==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end((await readFile(new URL('index.html',import.meta.url),'utf8')).replace('APP_TOKEN',token));}
      if(req.method==='GET'&&assets.has(path)){res.setHeader('Content-Type',path.endsWith('.css')?'text/css':'text/javascript');return res.end(await readFile(assets.get(path)));}
      if(req.method!=='POST'||!path.startsWith('/api/'))return json(404,{error:'未找到'});
      if(req.headers.origin!==origin||req.headers['x-apply-once-token']!==token)return json(403,{error:'无效来源'});
      if(busy)return json(409,{error:'正在执行上一项操作'});
      const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>2_000_000)return json(413,{error:'资料文件应小于 2MB'});chunks.push(chunk);}
      const input=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');
      if(busy)return json(409,{error:'正在执行上一项操作'});busy=true;
      try{
        if(path==='/api/state')return json(200,{profile,tabs:await session.tabs()});
        if(path==='/api/profile'){profile=validateProfile(input);await writeFile(profileFile,JSON.stringify(profile,null,2));return json(200,{profile});}
        if(path==='/api/open')return json(200,{tabs:await session.open(input.url)});
        if(path==='/api/scan'){const result=await session.scan(input.id,input.region===true);if(!result.cancelled)result.suggestions=suggestions(result.snapshot,profile);return json(200,result);}
        if(path==='/api/fill')return json(200,{results:await session.fill({...input,profile})});
        if(path==='/api/undo')return json(200,await session.undo());
        return json(404,{error:'未找到'});
      }finally{busy=false;}
    }catch(e){json(400,{error:e.message});}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  origin=`http://127.0.0.1:${server.address().port}`;session=new BrowserSession(context,origin);
  return {origin,server,session,close:()=>new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()))};
}
