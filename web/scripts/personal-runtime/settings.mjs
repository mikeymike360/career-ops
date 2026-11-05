import fs from 'node:fs';
import path from 'node:path';
import * as yaml from '../../node_modules/js-yaml/dist/js-yaml.mjs';
import {atomicWriteWithBackup} from '../../src/lib/core/safe-write.ts';
import {patchProfileText} from '../../src/lib/profile-yaml-edit.mjs';
const statuses=['citizen','pr','pass-holder','foreign'];
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function personalSettings(req,res,root,model){
 const url=new URL(req.url,'http://localhost');if(url.pathname!=='/personal-settings')return false;
 const file=path.join(root,'config/profile.yml');
 const send=(status,body)=>{res.writeHead(status,{'content-type':'text/html; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'"});res.end(body);};
 try{
  const source=fs.readFileSync(file,'utf8'),profile=yaml.load(source);
  if(!profile||typeof profile!=='object'||Array.isArray(profile)){send(409,'Your profile is malformed. It has been preserved.');return true;}
  if(req.method==='POST'){
   let text='';for await(const bytes of req){text+=bytes;if(text.length>16000){send(413,'Settings are too large.');return true;}}
   const fields=new URLSearchParams(text),status=fields.get('status'),pass=(fields.get('pass')||'').trim();if(!statuses.includes(status)||pass.length>100){send(400,'Choose a valid applicant status.');return true;}
   const sg={...(profile.sg||{}),work_status:status,pass_type:pass};
   const local=status==='citizen'||status==='pr';
   const labels={citizen:'Singapore citizen; no work pass required for Singapore employment',pr:'Singapore Permanent Resident; no work pass required for Singapore employment','pass-holder':`Existing Singapore work pass (${pass||'type not specified'}); employer and pass conditions must be checked`,foreign:'Foreign applicant; employer-sponsored work pass required for Singapore employment'};
   const location={...(profile.location||{}),visa_status:labels[status],authorized_in:local?['Singapore']:[],needs_sponsorship:!local};
   const proposed={sg,location};const merged={...profile,sg,location};
   atomicWriteWithBackup(file,patchProfileText(source,proposed,merged)||yaml.dump(merged,{lineWidth:100,noRefs:true}));
   res.writeHead(303,{location:'/personal-settings?saved=1','cache-control':'no-store'});res.end();return true;
  }
  if(req.method!=='GET'){send(405,'Method not allowed');return true;}
  const current=profile.sg?.work_status||'foreign';
  send(200,`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Personal settings · Career Ops</title><style>body{font:16px system-ui;background:#101815;color:#eef4ec;max-width:650px;margin:8vh auto;padding:24px}label{display:block;margin:24px 0 8px}select,input,button{font:inherit;padding:12px;border-radius:8px;box-sizing:border-box;width:100%}button{margin-top:24px;background:#d6f7aa;color:#142314;border:0;font-weight:700}a{color:#d6f7aa}p{line-height:1.6;color:#bccdc2}.saved{color:#d6f7aa}</style></head><body><a href="/">← Original Career Ops</a><h1>Your Singapore eligibility</h1>${url.searchParams.has('saved')?'<p class="saved">Saved to your original Career Ops profile.</p>':''}<p>Choose your applicant status. The original Singapore evaluation and application modes read this setting from config/profile.yml.</p><form method="post"><label for="status">Applicant status</label><select id="status" name="status">${[['citizen','Singapore citizen'],['pr','Singapore permanent resident'],['pass-holder','Existing work pass holder'],['foreign','Foreign applicant — work pass required']].map(([value,label])=>`<option value="${value}" ${current===value?'selected':''}>${label}</option>`).join('')}</select><label for="pass">Current pass type, if applicable</label><input id="pass" name="pass" maxlength="100" value="${escape(profile.sg?.pass_type)}" placeholder="e.g. Employment Pass or S Pass"><button>Save eligibility</button></form><p>AI engine: Claude Code connected to local Ollama (${escape(model||'local Ollama')}). Your PC must stay on. Large local AI tasks can be slow on this CPU.</p><p><a href="/config">Original app configuration</a> · <a href="/__runtime">Runtime and lock</a></p><p>The private Cloudflare relay temporarily buffers requests and responses until delivery, with stale buffers cleaned while the PC is connected. AI inference runs on this PC.</p></body></html>`);
 }catch{send(409,'The original profile could not be read or saved. Existing files have been preserved.');}
 return true;
}
