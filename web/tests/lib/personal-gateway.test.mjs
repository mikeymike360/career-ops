import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createGateway} from '../../scripts/personal-runtime/gateway.mjs';
test('gateway rejects anonymous access and rewrites authenticated requests to loopback',async()=>{
 let received;
 const app=http.createServer((req,res)=>{received=req.headers;res.writeHead(200,{'content-type':'text/event-stream'});res.end('data: original\n\n');});
 app.listen(0,'127.0.0.1');await once(app,'listening');
 const gateway=createGateway({secret:'test-private-secret',targetPort:app.address().port});gateway.listen(0,'127.0.0.1');await once(gateway,'listening');
 try{const url=`http://127.0.0.1:${gateway.address().port}/api/run`;
 assert.equal((await fetch(url)).status,403);assert.equal(received,undefined);
 const r=await fetch(url,{headers:{'x-career-runtime-key':'test-private-secret',origin:'https://personal.example','x-forwarded-host':'external.example'}});
 assert.equal(r.status,200);assert.equal(r.headers.get('x-career-content-type'),'text/event-stream');assert.equal(await r.text(),'data: original\n\n');assert.equal(received['x-career-runtime-key'],undefined);assert.equal(received['x-forwarded-host'],undefined);assert.equal(received.origin,`http://127.0.0.1:${app.address().port}`);
 }finally{gateway.closeAllConnections();gateway.close();app.closeAllConnections();app.close();}
});
