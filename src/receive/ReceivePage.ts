export const renderReceivePage = (base: string, once: boolean, maxBytes: number): string => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Send files · tunli</title><style>
:root{font-family:system-ui,-apple-system,sans-serif;color-scheme:light dark}
body{box-sizing:border-box;max-width:680px;min-height:100vh;margin:0 auto;padding:6vh 32px}
h1{font-size:2rem}p{line-height:1.5;color:#666}
.picker{display:flex;align-items:center;flex-wrap:wrap;gap:12px}.picker span{color:#666}
#drop-frame{position:fixed;inset:12px;z-index:0;box-sizing:border-box;border:2px dashed rgba(83,124,255,.55);border-radius:18px;pointer-events:none;transition:border-color .15s,background .15s}
body.dragging #drop-frame{border:3px dashed #537cff;background:rgba(83,124,255,.09)}
#drop-overlay{display:none;position:fixed;inset:0;z-index:10;align-items:center;justify-content:center;flex-direction:column;gap:12px;background:rgba(83,124,255,.12);font-size:1.5rem;font-weight:700;pointer-events:none}
#drop-overlay .icon{display:grid;place-items:center;width:92px;height:92px;border-radius:50%;background:#537cff;color:white;font-size:3.5rem;line-height:1}
body.dragging #drop-overlay{display:flex}
button{font:inherit;padding:7px 12px;cursor:pointer}input{display:none}ul{list-style:none;padding:0}
li{border:1px solid #8885;border-radius:10px;padding:14px;margin:12px 0}.top{display:flex;justify-content:space-between;gap:12px;word-break:break-word}
.actions{display:flex;gap:8px;margin-top:10px}progress{width:100%;height:12px;margin-top:8px}.small,.eta{font-size:.9rem}.eta{min-height:1.3em;color:#666}#status{min-height:1.5em}
@media(max-width:600px){body{padding:6vh 26px}#drop-frame{inset:6px;border-radius:12px}}
</style></head><body><div id="drop-frame" aria-hidden="true"></div><div id="drop-overlay" aria-hidden="true"><span class="icon">↑</span><span>Drop to upload</span></div><h1>Send files</h1><p>Send files to this tunli receiver. Files are transferred in 4 MB chunks and can resume after an interrupted connection. ${once ? 'This link accepts one file.' : 'Choose files again after reloading this page to resume them.'} Maximum file size: ${Math.floor(maxBytes / 1024 / 1024)} MB.</p>
<div class="picker"><button id="drop" type="button">Choose files</button><span>or drop files anywhere on this page</span></div><input id="files" type="file" ${once ? '' : 'multiple'}><ul id="list"></ul><p id="status" aria-live="polite"></p>
<script>
'use strict';
const base=${JSON.stringify(base)},once=${once},maxBytes=${maxBytes};
const drop=document.getElementById('drop'),input=document.getElementById('files'),list=document.getElementById('list'),status=document.getElementById('status');
const jobs=[];let running=0;
const storageKey=file=>'tunli-receive:'+base+':'+file.name+':'+file.size+':'+file.lastModified;
const savedId=file=>{try{return localStorage.getItem(storageKey(file))}catch{return null}};
const remember=(file,id)=>{try{localStorage.setItem(storageKey(file),id)}catch{}};
const forget=file=>{try{localStorage.removeItem(storageKey(file))}catch{}};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function json(response){let data={};try{data=await response.json()}catch{}if(!response.ok)throw new Error(data.message||'Request failed ('+response.status+')');return data}
async function sha256(blob){const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()));return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')}
function formatTime(seconds){
  const total=seconds>=60?Math.max(60,Math.round(seconds/10)*10):Math.max(1,Math.ceil(seconds));
  const hours=Math.floor(total/3600),minutes=Math.floor(total%3600/60),remainder=total%60;
  if(hours)return hours+'h '+minutes+'m';
  if(minutes)return minutes+'m'+(remainder?' '+remainder+'s':'');
  return total+'s';
}
function estimate(job,transferred){
  if(job.state!=='uploading')return '';
  if(transferred>=job.file.size)return 'Finishing upload…';
  const now=performance.now();
  if(transferred<job.lastBytes){job.samples=[];job.lastProgressAt=now}
  if(transferred>job.lastBytes)job.lastProgressAt=now;
  job.lastBytes=transferred;
  if(!job.samples.length||now-job.samples[job.samples.length-1].time>=900)job.samples.push({time:now,bytes:transferred});
  while(job.samples.length>2&&job.samples[0].time<now-15000)job.samples.shift();
  if(now-job.lastProgressAt>6000)return 'Waiting for transfer…';
  const first=job.samples[0],last=job.samples[job.samples.length-1];
  const elapsed=(last.time-first.time)/1000,bytes=last.bytes-first.bytes;
  if(elapsed<2||bytes<64*1024)return 'Calculating time remaining…';
  const seconds=(job.file.size-transferred)/(bytes/elapsed);
  return '≈ '+formatTime(seconds)+' remaining';
}
function render(job){
  const transferred=Math.min(job.file.size,job.offset+job.inFlight);
  const progress=job.file.size?Math.floor(transferred/job.file.size*100):100;
  job.bar.value=Math.min(100,progress);
  job.info.textContent=job.state+' · '+Math.min(100,progress)+'% · '+(job.file.size/1024/1024).toFixed(1)+' MB'+(job.error?' · '+job.error:'');
  job.eta.textContent=estimate(job,transferred);
  job.toggle.textContent=job.state==='uploading'?'Pause':job.state==='paused'?'Resume':'Retry';
  job.toggle.hidden=job.state==='done'||job.state==='cancelled';
  job.cancel.hidden=job.state==='done'||job.state==='cancelled';
}
function pump(){
  while(running<(once?1:2)){
    const job=jobs.find(item=>item.state==='queued');if(!job)return;
    job.state='uploading';job.samples=[];job.lastBytes=job.offset;job.lastProgressAt=performance.now();running++;render(job);
    run(job).finally(()=>{running--;pump()});
  }
}
async function session(job){
  const id=job.id||savedId(job.file);
  if(id){
    const response=await fetch(base+'uploads/'+id,{cache:'no-store'});
    if(response.status!==404){const data=await json(response);
      if(data.name===job.file.name&&data.size===job.file.size){
        job.id=id;job.offset=data.offset;job.chunkSize=data.chunkSize;
        if(data.savedName){job.state='done';forget(job.file);status.textContent='Received '+data.savedName;
          if(once){input.disabled=true;drop.disabled=true}}
        return
      }
    }
    job.id=null;forget(job.file);
  }
  const data=await json(await fetch(base+'uploads',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:job.file.name,size:job.file.size})}));
  job.id=data.id;job.offset=data.offset;job.chunkSize=data.chunkSize;remember(job.file,job.id);
}
function sendChunk(job,chunk,offset,digest){return new Promise((resolve,reject)=>{
  const xhr=new XMLHttpRequest();job.xhr=xhr;
  xhr.open('PUT',base+'uploads/'+job.id);xhr.setRequestHeader('Content-Type','application/octet-stream');
  xhr.setRequestHeader('X-Upload-Offset',String(offset));xhr.setRequestHeader('X-Chunk-SHA256',digest);
  xhr.upload.onprogress=e=>{if(e.lengthComputable){job.inFlight=e.loaded;render(job)}};
  xhr.onload=()=>{job.xhr=null;let data={};try{data=JSON.parse(xhr.responseText)}catch{}
    if(xhr.status>=200&&xhr.status<300)resolve(data);else reject(new Error(data.message||'Chunk failed ('+xhr.status+')'))};
  xhr.onerror=()=>{job.xhr=null;reject(new Error('Connection lost'))};
  xhr.onabort=()=>{job.xhr=null;reject(new Error('Upload paused'))};
  xhr.send(chunk);
})}
async function run(job){
  try{
    await session(job);
    job.samples=[];job.lastBytes=job.offset;job.lastProgressAt=performance.now();render(job);
    if(job.state==='cancelled'){
      if(job.id)await fetch(base+'uploads/'+job.id,{method:'DELETE'}).catch(()=>{});
      return
    }
    if(job.state==='done')return;
    while(job.state==='uploading'&&job.offset<job.file.size){
      const offset=job.offset,chunk=job.file.slice(offset,offset+job.chunkSize),digest=await sha256(chunk);
      let sent=false;
      for(let attempt=0;attempt<4&&job.state==='uploading';attempt++){
        try{const reply=await sendChunk(job,chunk,offset,digest);job.offset=reply.offset;sent=true;break}
        catch(error){
          if(job.state!=='uploading')return;
          job.inFlight=0;
          const remote=await json(await fetch(base+'uploads/'+job.id,{cache:'no-store'}));
          job.offset=remote.offset;job.samples=[];job.lastBytes=job.offset;job.lastProgressAt=performance.now();render(job);
          if(job.offset>offset){sent=true;break}
          if(attempt===3)throw error;
          await wait(500*2**attempt);
        }
      }
      if(!sent)return;
      job.inFlight=0;render(job);
    }
    if(job.state!=='uploading')return;
    let result;
    try{result=await json(await fetch(base+'uploads/'+job.id+'/complete',{method:'POST'}))}
    catch(error){const remote=await json(await fetch(base+'uploads/'+job.id,{cache:'no-store'}));if(!remote.savedName)throw error;result=remote}
    job.offset=job.file.size;job.state='done';job.error='';forget(job.file);
    status.textContent='Received '+result.savedName;
    if(once){input.disabled=true;drop.disabled=true}
  }catch(error){
    if(job.state==='uploading'){job.state='error';job.error=error.message;status.textContent='Upload interrupted. Select Retry to resume.'}
  }finally{job.inFlight=0;render(job)}
}
function addFiles(files){
  for(const file of files){
    if(once&&jobs.length){status.textContent='This link accepts one file';break}
    if(file.size>maxBytes){status.textContent=file.name+' is too large';continue}
    if(jobs.some(job=>job.file.name===file.name&&job.file.size===file.size&&job.file.lastModified===file.lastModified&&job.state!=='done'&&job.state!=='cancelled'))continue;
    const job={file,id:null,offset:0,chunkSize:4*1024*1024,inFlight:0,state:'queued',error:'',xhr:null,samples:[],lastBytes:0,lastProgressAt:0};
    const row=document.createElement('li'),top=document.createElement('div'),name=document.createElement('strong'),info=document.createElement('div'),bar=document.createElement('progress'),eta=document.createElement('div'),actions=document.createElement('div'),toggle=document.createElement('button'),cancel=document.createElement('button');
    top.className='top';actions.className='actions';info.className='small';name.textContent=file.name;bar.max=100;bar.value=0;
    eta.className='eta';toggle.textContent='Pause';cancel.textContent='Cancel';top.append(name,info);actions.append(toggle,cancel);row.append(top,bar,eta,actions);list.append(row);
    job.info=info;job.bar=bar;job.eta=eta;job.toggle=toggle;job.cancel=cancel;
    toggle.onclick=()=>{if(job.state==='uploading'){job.state='paused';job.xhr?.abort()}else if(job.state==='paused'||job.state==='error'){job.state='queued';job.error='';pump()}render(job)};
    cancel.onclick=async()=>{job.state='cancelled';job.xhr?.abort();forget(file);render(job);
      if(job.id){for(let attempt=0;attempt<5;attempt++){const response=await fetch(base+'uploads/'+job.id,{method:'DELETE'}).catch(()=>null);if(response?.ok||response?.status===404)break;await wait(250)}}};
    jobs.push(job);render(job);
  }
  pump();input.value='';
}
drop.onclick=()=>input.click();
const hasFiles=e=>Array.from(e.dataTransfer?.types||[]).includes('Files');
let dragTimer;
const hideDrop=()=>{clearTimeout(dragTimer);document.body.classList.remove('dragging')};
window.addEventListener('dragenter',e=>{if(hasFiles(e)){e.preventDefault();document.body.classList.add('dragging')}});
window.addEventListener('dragover',e=>{if(!hasFiles(e))return;e.preventDefault();e.dataTransfer.dropEffect='copy';
  document.body.classList.add('dragging');clearTimeout(dragTimer);dragTimer=setTimeout(hideDrop,300)});
window.addEventListener('drop',e=>{if(!hasFiles(e))return;e.preventDefault();hideDrop();addFiles(e.dataTransfer.files)});
window.addEventListener('dragleave',e=>{if(e.clientX<=0||e.clientY<=0||e.clientX>=innerWidth||e.clientY>=innerHeight)hideDrop()});
window.addEventListener('blur',hideDrop);
input.onchange=()=>addFiles(input.files);
setInterval(()=>{for(const job of jobs)if(job.state==='uploading')render(job)},1000);
</script></body></html>`
