import http from 'node:http';
// Ollama thinks by default when Claude omits the optional thinking field.
// Set the local inference option explicitly; prompts, tools and permissions pass unchanged.
export function localAnthropic(model){return http.createServer(async(req,res)=>{
 try{let size=0;const chunks=[];for await(const bytes of req){size+=bytes.length;if(size>20000000){res.writeHead(413);res.end();return;}chunks.push(bytes);}
 let body=Buffer.concat(chunks);if(req.url?.split('?')[0]==='/v1/messages'){const input=JSON.parse(body.toString());input.model=model;input.thinking={type:'disabled'};body=Buffer.from(JSON.stringify(input));}
 const headers={...req.headers,host:'127.0.0.1:11434','content-length':String(body.length)};delete headers['transfer-encoding'];
 const upstream=http.request({hostname:'127.0.0.1',port:11434,path:req.url,method:req.method,headers},r=>{res.writeHead(r.statusCode||502,r.headers);r.pipe(res);res.on('close',()=>r.destroy());});
 upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end('Local Ollama unavailable');});req.on('aborted',()=>upstream.destroy());upstream.end(body);
 }catch{if(!res.headersSent)res.writeHead(400);res.end('Invalid local model request');}
});}
