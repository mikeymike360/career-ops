import {spawn,execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createGateway} from './gateway.mjs';
import {startRelay} from './relay.mjs';
import {localAnthropic} from './ollama.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const state=path.join(root,'local/runtime');fs.mkdirSync(state,{recursive:true});
const site='https://career-desk-mikey360.banda-bandara.chatgpt.site';
const encrypted=fs.readFileSync(path.join(state,'bridge-secret.dpapi'),'utf8').trim();
const settings=JSON.parse(fs.readFileSync(path.join(state,'settings.json'),'utf8').replace(/^\uFEFF/,''));
const secret=execFileSync(settings.powershell,['-NoProfile','-NonInteractive','-Command',"$s=[Console]::In.ReadToEnd().Trim()|ConvertTo-SecureString;[Console]::Out.Write([Net.NetworkCredential]::new('', $s).Password)"],{input:encrypted,encoding:'utf8',windowsHide:true}).trim();
if(secret.length<40)throw Error('Private bridge secret unavailable');
const model=process.env.CAREER_OPS_OLLAMA_MODEL||settings.model||'career-ops-qwen9b:latest';
fs.mkdirSync(path.join(state,'claude-home'),{recursive:true});
const env={...process.env,CAREER_OPS_CLI:'claude',CAREER_OPS_LOCAL_OLLAMA:'1',CAREER_OPS_LOCAL_AI_TIMEOUT_MS:'3600000',CLAUDE_CONFIG_DIR:path.join(state,'claude-home'),ANTHROPIC_BASE_URL:'http://127.0.0.1:11435',ANTHROPIC_AUTH_TOKEN:'ollama',ANTHROPIC_API_KEY:'',ANTHROPIC_MODEL:model,ANTHROPIC_DEFAULT_OPUS_MODEL:model,ANTHROPIC_DEFAULT_SONNET_MODEL:model,ANTHROPIC_DEFAULT_HAIKU_MODEL:model,CLAUDE_CODE_MAX_CONTEXT_TOKENS:'65536',CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC:'1',API_TIMEOUT_MS:'3600000',NEXT_TELEMETRY_DISABLED:'1',PATH:`${path.join(state,'tools/node_modules/@anthropic-ai/claude-code/bin')};${process.env.PATH}`};
const children=[];let shuttingDown=false;let stopRelay=()=>{};
const log=message=>console.log(`${new Date().toISOString()} ${message}`);
function start(command,args,options={}){const child=spawn(command,args,{cwd:root,env,windowsHide:true,stdio:['ignore','pipe','pipe'],...options});children.push(child);child.on('error',e=>log(`Process failed: ${e.message}`));return child;}
try{const existing=await fetch('http://127.0.0.1:3211/__health',{headers:{'x-career-runtime-key':secret},signal:AbortSignal.timeout(2000)});if(existing.ok&&(await existing.json()).runtime==='career-ops-original'){log('Career Ops is already running. Open '+site);process.exit(0);}}catch{}
try{await fetch('http://127.0.0.1:11434/api/tags',{signal:AbortSignal.timeout(5000)});}catch{const o=start(path.join(process.env.LOCALAPPDATA,'Programs/Ollama/ollama.exe'),['serve']);o.stderr.on('data',()=>{});}
const inference=localAnthropic(model);await new Promise((resolve,reject)=>{inference.once('error',reject);inference.listen(11435,'127.0.0.1',resolve);});
const web=start(process.execPath,[path.join(root,'web/server.mjs'),'start','-p','3300']);web.stdout.pipe(process.stdout);web.stderr.pipe(process.stderr);
web.on('exit',code=>{if(!shuttingDown){log(`Original app stopped (${code})`);shutdown();}});
const gateway=createGateway({secret,targetPort:3300,publicOrigin:site,dataRoot:root,model});
await new Promise((resolve,reject)=>{gateway.once('error',reject);gateway.listen(3211,'127.0.0.1',resolve);});
stopRelay=startRelay({site,secret,log});
function shutdown(){if(shuttingDown)return;shuttingDown=true;stopRelay();gateway.close();inference.close();for(const child of children){if(child.exitCode===null)try{execFileSync('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});}catch{}}process.exit();}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
fs.writeFileSync(path.join(state,'launcher.pid'),String(process.pid));log(`Original Career Ops running with local Ollama (${model}). Keep this PC awake.`);
