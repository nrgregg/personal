import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {build,repo,vault} from './content.mjs';

let last='', error='', version=0;
const folders=['Blog Posts','Projects','Further Reading','Home','Images'];
function snapshot(dir){return fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).map(e=>{const file=path.join(dir,e.name);return e.isDirectory()?snapshot(file):[file,fs.statSync(file).mtimeMs,fs.statSync(file).size];});}
function refresh(){
  try{
    const next=JSON.stringify(folders.map(f=>snapshot(path.join(vault,f))));
    if(next===last)return;
    last=next;
    const result=build({output:repo});error='';version++;
    console.log(`Updated local site: ${result.posts} posts, ${result.projects} projects, ${result.readings} readings.`);
  }catch(e){error=e.message;console.error(error);}
}
refresh();
const timer=setInterval(refresh,750);
const types={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.avif':'image/avif'};
const server=http.createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/status'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({version,error}));return;}
  if(url.pathname==='/'||url.pathname==='/index.html'){
    let html=fs.readFileSync(path.join(repo,'index.html'),'utf8');
    html=html.replace('</body>',`<script>(()=>{let version=${version};const box=document.createElement('div');box.style.cssText='position:fixed;bottom:0;left:0;right:0;background:#701b28;color:white;padding:16px;z-index:100;font:16px sans-serif';box.hidden=true;document.body.append(box);setInterval(async()=>{try{const state=await(await fetch('/status')).json();box.hidden=!state.error;box.textContent=state.error?'Note needs attention: '+state.error:'';if(state.version!==version)location.reload();}catch{}},1000)})();</script></body>`);
    res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;
  }
  let relative;try{relative=decodeURIComponent(url.pathname);}catch{res.writeHead(400);res.end();return;}
  const file=path.resolve(repo,'.'+relative);
  if(!file.startsWith(path.join(repo,'assets')+path.sep)||!types[path.extname(file).toLowerCase()]||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
  res.setHeader('Content-Type',types[path.extname(file).toLowerCase()]);fs.createReadStream(file).pipe(res);
});
server.on('error',e=>{console.error(e.message);clearInterval(timer);process.exitCode=1;});
server.listen(4173,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:4173 — Keep this window open while writing. Ctrl+C stops it. Nothing is pushed to GitHub.'));
