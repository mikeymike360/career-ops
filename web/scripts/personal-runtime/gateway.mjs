import http from 'node:http';
import { timingSafeEqual, createHash } from 'node:crypto';
import {personalSettings} from './settings.mjs';
const digest=s=>createHash('sha256').update(s||'').digest();
export function authorised(value,secret){return !!secret&&timingSafeEqual(digest(value),digest(secret));}
export function createGateway({secret,targetPort=3000,publicOrigin,dataRoot,model}){
 return http.createServer(async(req,res)=>{
  if(!authorised(req.headers['x-career-runtime-key'],secret)){res.writeHead(403,{'content-type':'text/plain','cache-control':'no-store'});res.end('Private runtime');return;}
  if(dataRoot&&await personalSettings(req,res,dataRoot,model))return;
  if(req.url==='/__health'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({runtime:'career-ops-original',engine:'ollama',harness:'claude',model}));return;}
  if(req.url==='/__stream-test'){res.writeHead(200,{'content-type':'text/plain; charset=utf-8','x-accel-buffering':'no','cache-control':'no-store'});res.write('{"t":"text","text":"first"}\n');setTimeout(()=>{res.end('{"t":"text","text":"second"}\n');},12000);return;}
  const headers={...req.headers,host:`127.0.0.1:${targetPort}`,'accept-encoding':'identity','sec-fetch-site':'same-origin'};
  delete headers['x-career-runtime-key'];delete headers['x-forwarded-host'];delete headers['x-forwarded-proto'];delete headers['forwarded'];
  if(headers.origin)headers.origin=`http://127.0.0.1:${targetPort}`;
  if(headers.referer)headers.referer=`http://127.0.0.1:${targetPort}/`;
  const upstream=http.request({hostname:'127.0.0.1',port:targetPort,path:req.url,method:req.method,headers},response=>{
   const out={...response.headers,'cache-control':'private, no-store'};delete out['transfer-encoding'];
   if(String(out['content-type']).includes('text/event-stream')){out['x-career-content-type']=out['content-type'];out['content-type']='application/octet-stream';delete out['content-length'];}
   if(out.location){try{const u=new URL(out.location,`http://127.0.0.1:${targetPort}`);if(['127.0.0.1','localhost'].includes(u.hostname))out.location=u.pathname+u.search+u.hash;}catch{delete out.location;}}
   res.writeHead(response.statusCode||502,out);response.pipe(res);res.on('close',()=>response.destroy());
  });
  upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502,{'content-type':'text/plain','cache-control':'no-store'});res.end('The original app is starting or offline.');});
  req.pipe(upstream);req.on('aborted',()=>upstream.destroy());
 });
}
