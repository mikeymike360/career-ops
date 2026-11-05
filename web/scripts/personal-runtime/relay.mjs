// An outbound HTTPS transport only. Every application route still runs in the original app.
export function startRelay({site,secret,port=3211,log=console.log}){
 let stopped=false;const active=new Set();
 async function call(path,options={}){const response=await fetch(site+'/__runtime/'+path,{...options,headers:{authorization:'Bearer '+secret,...options.headers},signal:options.signal||AbortSignal.timeout(30000)});if(!response.ok)throw Error(`Relay HTTP ${response.status}`);return response;}
 async function execute(job){
  const abort=new AbortController();let headed=false;
  try{
   const headers=new Headers(JSON.parse(job.headers));headers.set('x-career-runtime-key',secret);
   let body;if(!['GET','HEAD'].includes(job.method)){const stored=await call('body/'+job.id);body=await stored.arrayBuffer();}
   const response=await fetch(`http://127.0.0.1:${port}${job.path}`,{method:job.method,headers,body,redirect:'manual',signal:abort.signal});
   const out=new Headers(response.headers);const original=out.get('x-career-content-type');if(original){out.set('content-type',original);out.delete('x-career-content-type');}
   for(const key of ['content-length','content-encoding','transfer-encoding','connection'])out.delete(key);
   const streaming=/text\/event-stream|application\/(?:x-ndjson|ndjson|jsonl)/.test(out.get('content-type')||'')||response.headers.get('x-accel-buffering')==='no';let index=0;
   const head=()=>call('head/'+job.id,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({status:response.status,headers:[...out]})});
   if(streaming){await head();headed=true;if(response.body){const reader=response.body.getReader();let pending=reader.read(),buffer=[],size=0,last=0;const flush=async()=>{if(size){const all=Buffer.concat(buffer,size);buffer=[];size=0;await call(`chunk/${job.id}/${index++}`,{method:'PUT',body:all});last=Date.now();}};while(true){const item=await Promise.race([pending,new Promise(resolve=>setTimeout(()=>resolve(null),1000))]);if(item){if(item.done)break;buffer.push(Buffer.from(item.value));size+=item.value.length;pending=reader.read();}if(size&&(Date.now()-last>=10000||size>=262144))await flush();}await flush();}}
   else{if(response.body){const bytes=await response.arrayBuffer();if(bytes.byteLength)await call(`chunk/${job.id}/${index++}`,{method:'PUT',body:bytes});}await head();headed=true;}
   await call('done/'+job.id,{method:'POST'});
  }catch(error){abort.abort();if(!headed)try{await call('chunk/'+job.id+'/0',{method:'PUT',body:'The original PC app could not complete this request.'});await call('head/'+job.id,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({status:502,headers:[['content-type','text/plain']]})});await call('done/'+job.id,{method:'POST'});}catch{}log(`Request ended: ${error.message}`);}
 }
 const timer=setInterval(async()=>{if(stopped||active.size>=12)return;try{const response=await call('poll',{method:'POST'});const {jobs}=await response.json();for(const job of jobs){const task=execute(job);active.add(task);task.finally(()=>active.delete(task));}}catch(error){log(`Website connection retry: ${error.message}`);}},1000);
 const cleanup=setInterval(()=>{void call('cleanup',{method:'POST'}).catch(()=>{});},60000);
 return()=>{stopped=true;clearInterval(timer);clearInterval(cleanup);};
}
