import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..'),state=path.join(root,'local/runtime');
const pid=Number(fs.readFileSync(path.join(state,'launcher.pid'),'utf8'));if(!Number.isSafeInteger(pid)||pid<1)throw Error('Invalid runtime process');
const settings=JSON.parse(fs.readFileSync(path.join(state,'settings.json'),'utf8').replace(/^\uFEFF/,''));
const output=execFileSync(settings.powershell,['-NoProfile','-NonInteractive','-Command',`Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" | Select-Object Name,CommandLine | ConvertTo-Json -Compress`],{encoding:'utf8',windowsHide:true});
if(!output.trim()){console.log('Career Ops is already stopped.');process.exit();}
const actual=JSON.parse(output),expected=path.join(root,'web/scripts/personal-runtime/launch.mjs').toLowerCase().replaceAll('/','\\');
if(actual.Name?.toLowerCase()!=='node.exe'||!actual.CommandLine?.toLowerCase().replaceAll('/','\\').includes(expected))throw Error('The saved process is not this Career Ops runtime; nothing was stopped.');
execFileSync('taskkill.exe',['/PID',String(pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});console.log('Career Ops stopped. Your files are preserved.');
