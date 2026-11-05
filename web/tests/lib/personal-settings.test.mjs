import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {once} from 'node:events';
import * as yaml from '../../node_modules/js-yaml/dist/js-yaml.mjs';
import {createGateway} from '../../scripts/personal-runtime/gateway.mjs';
test('eligibility edits use original profile, keep other settings and preserve malformed files',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'career-eligibility-'));fs.mkdirSync(path.join(root,'config'));const file=path.join(root,'config/profile.yml');fs.writeFileSync(file,'candidate:\n  full_name: Real Candidate\nlanguage:\n  modes_dir: modes/sg\ncompensation:\n  currency: SGD\nsg:\n  work_status: pr\n');
 const server=createGateway({secret:'private-test-key',dataRoot:root});server.listen(0,'127.0.0.1');await once(server,'listening');const url=`http://127.0.0.1:${server.address().port}/personal-settings`,headers={'x-career-runtime-key':'private-test-key','content-type':'application/x-www-form-urlencoded'};
 try{let r=await fetch(url,{method:'POST',headers,body:'status=foreign&pass=',redirect:'manual'});assert.equal(r.status,303);let p=yaml.load(fs.readFileSync(file,'utf8'));assert.equal(p.sg.work_status,'foreign');assert.equal(p.location.needs_sponsorship,true);assert.equal(p.candidate.full_name,'Real Candidate');assert.equal(p.language.modes_dir,'modes/sg');assert.equal(p.compensation.currency,'SGD');assert.ok(fs.readdirSync(path.dirname(file)).some(f=>f.includes('.bak-')));
 r=await fetch(url,{method:'POST',headers,body:'status=citizen',redirect:'manual'});assert.equal(r.status,303);p=yaml.load(fs.readFileSync(file,'utf8'));assert.deepEqual(p.location.authorized_in,['Singapore']);assert.equal(p.location.needs_sponsorship,false);
 fs.writeFileSync(file,'sg: [malformed');r=await fetch(url,{method:'POST',headers,body:'status=pr',redirect:'manual'});assert.equal(r.status,409);assert.equal(fs.readFileSync(file,'utf8'),'sg: [malformed');
 }finally{server.closeAllConnections();server.close();fs.rmSync(root,{recursive:true,force:true});}
});
