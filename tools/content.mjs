import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from './vendor/marked.mjs';

export const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const vault = path.dirname(repo);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug = value => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const date = value => value ? new Date(value+'T12:00:00Z').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}) : '';

export function parse(text, filename) {
  const normalized = text.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
  if (!normalized.trim()) return null;
  const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/);
  if (!match) throw Error(`${filename}: add the properties section from a template.`);
  const meta = {};
  for (const line of match[1].split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const field = line.match(/^([a-z_]+):\s*(.*?)\s*$/);
    if (!field) throw Error(`${filename}: properties must be one key: value per line.`);
    let [, key, value] = field;
    if (key in meta) throw Error(`${filename}: duplicate property ${key}.`);
    if (value.startsWith('"')) { try {value=JSON.parse(value);} catch {throw Error(`${filename}: use valid double quotes for ${key}.`);} }
    else if (value.startsWith("'")) {if (!value.endsWith("'")) throw Error(`${filename}: unclosed quote.`); value=value.slice(1,-1).replace(/''/g,"'");}
    if (typeof value !== 'string') throw Error(`${filename}: ${key} must be text.`);
    meta[key] = value;
  }
  return {meta, body:match[2], filename};
}

function read(relative) {
  const file = path.join(vault,relative);
  return fs.existsSync(file) ? parse(fs.readFileSync(file,'utf8'),relative) : null;
}
function collection(folder, preview) {
  const walk = dir => fs.readdirSync(dir,{withFileTypes:true}).flatMap(e => e.isDirectory()?walk(path.join(dir,e.name)):e.name.endsWith('.md')?[path.join(dir,e.name)]:[]);
  const notes = walk(path.join(vault,folder)).map(file=>read(path.relative(vault,file))).filter(Boolean);
  const seen = new Set();
  return notes.filter(note=> {
    const m=note.meta;
    if (!['draft','published'].includes(m.status)) throw Error(`${note.filename}: status must be draft or published.`);
    if (!preview && m.status==='draft') return false;
    if (!m.title) throw Error(`${note.filename}: title is required.`);
    for (const key of ['date','updated']) {
      if (key==='updated' && !m[key]) continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(m[key]||'') || !Number.isFinite(Date.parse(m[key])) || new Date(m[key]).toISOString().slice(0,10)!==m[key]) throw Error(`${note.filename}: ${key} needs a real YYYY-MM-DD date.`);
    }
    if(m.updated && m.updated<m.date) throw Error(`${note.filename}: updated cannot precede date.`);
    m.slug=m.slug||slug(m.title);
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(m.slug)||seen.has(m.slug)) throw Error(`${note.filename}: slug must be unique and use lowercase letters, numbers and hyphens.`);
    seen.add(m.slug);
    return true;
  }).sort((a,b)=>b.meta.date.localeCompare(a.meta.date)||a.meta.slug.localeCompare(b.meta.slug));
}
function safeUrl(href) {
  return /^(https?:|mailto:|#)/i.test(href) ? href : '';
}

export function build({preview=false, output=path.join(repo,'.preview')}={}) {
  const assets = new Map();
  const renderer = new marked.Renderer();
  renderer.html = ({text}) => escape(text);
  renderer.link = function({href,tokens}) {const url=safeUrl(href);return url?`<a class="text-link" href="${escape(url)}">${this.parser.parseInline(tokens)}</a>`:this.parser.parseInline(tokens);};
  renderer.image = ({href,text}) => {
    if (/^https?:\/\//i.test(href)) return `<img src="${escape(href)}" alt="${escape(text)}" loading="lazy">`;
    const relative=decodeURIComponent(href).replaceAll('\\','/').replace(/^\.\.\//,'');
    if(!relative.startsWith('Images/')) throw Error(`Local images must use Images/filename: ${href}`);
    const file=path.resolve(vault,relative);
    const root=path.join(vault,'Images')+path.sep;
    if(!file.startsWith(root)||!fs.existsSync(file)||!fs.statSync(file).isFile()||! /\.(png|jpe?g|gif|webp|avif)$/i.test(file)) throw Error(`Missing or unsupported image: ${href}`);
    const target='assets/'+path.relative(path.join(vault,'Images'),file).replaceAll('\\','/');
    assets.set(target,file);
    return `<img src="${target.split('/').map(encodeURIComponent).join('/')}" alt="${escape(text)}" loading="lazy">`;
  };
  let index=0;
  function markdown(body, toc=[]) {
    renderer.heading=function({depth,tokens}) { const id=`section-${++index}`; const text=this.parser.parseInline(tokens); toc.push({id,text,depth}); return `<h${depth} id="${id}">${text}</h${depth}>`; };
    const transformed=body.replace(/!\[\[(Images\/[^\]|]+)(?:\|([^\]]+))?\]\]/g,(_,file,alt)=>`![${alt||path.basename(file)}](<${file}>)`);
    return marked.parse(transformed,{renderer,gfm:true});
  }
  const posts=collection('Blog Posts',preview), projects=collection('Projects',preview), readings=collection('Further Reading',preview);
  const about=read('Home/About.md'), settings=read('Home/Site.md'), highlighted=read('Home/Highlighted Post.md');
  const s=settings?.meta||{};
  const badge=m=>m.status==='draft'?'<strong class="small">DRAFT · LOCAL PREVIEW</strong>':'';
  const postLink=(post,label='Read post →')=>`<button class="text-link" data-page="blog" data-post="${escape(post.meta.slug)}">${escape(label)}</button>`;
  const featured=highlighted?.meta.post?posts.find(p=>p.meta.slug===highlighted.meta.post):posts[0];
  if(highlighted?.meta.post&&!featured) throw Error('Home/Highlighted Post.md: post must name an included post slug (or leave it blank).');
  const card=(label,post,body)=>`<article class="panel"><span class="small">${label}</span>${post?`${badge(post.meta)}<h2>${escape(post.meta.title)}</h2>${body?markdown(body):`<p>${escape(post.meta.summary)}</p>`}${postLink(post)}`:'<p>No posts published yet.</p>'}</article>`;
  const home=`<section data-view="home"><div class="home-layout"><article class="panel bio"><span class="small">ABOUT</span><h1>${escape(about?.meta.title||'Nellie Gregg')}</h1>${markdown(about?.body||'About information is coming soon.')}</article>${card('HIGHLIGHTED POST',featured,highlighted?.body)}${card('MOST RECENT',posts[0])}</div></section>`;
  const articles=posts.map(post=>{const m=post.meta,toc=[];const body=markdown(post.body,toc);return `<div class="article-layout" data-article="${escape(m.slug)}" hidden><article class="panel article"><span class="small">RESEARCH BLOG</span>${badge(m)}<h1>${escape(m.title)}</h1>${m.subtitle?`<p class="post-subtitle">${escape(m.subtitle)}</p>`:''}<div class="small">${escape(m.author||'Nellie Gregg')} · Posted ${date(m.date)}${m.updated?' · Edited '+date(m.updated):''}</div>${m.crosspost_url?`<p>Also published at <a class="text-link" href="${escape(safeUrl(m.crosspost_url))}">${escape(m.crosspost_name||m.crosspost_url)}</a></p>`:''}<div class="line"></div><div class="article-body">${body}</div></article><aside><span class="small">ON THIS PAGE</span>${toc.map(h=>`<button class="text-link" data-section="${h.id}">${h.text}</button>`).join('')}<div class="line"></div><div class="post-navigation"><button class="post-arrow" data-step="1" aria-label="Older blog post">←</button><button class="text-link" data-page="archive">Archive</button><button class="post-arrow" data-step="-1" aria-label="Newer blog post">→</button></div></aside></div>`;}).join('');
  const panels=(view,notes,label)=>`<section data-view="${view}" hidden><div class="stack">${notes.length?notes.map(({meta:m,body})=>`<article class="panel"><span class="small">${label} · ${date(m.date)}${m.updated?' · Edited '+date(m.updated):''}</span>${badge(m)}<h2>${escape(m.title)}</h2>${m.authors?`<div class="small">${escape(m.authors)}</div>`:''}${markdown(body)}</article>`).join(''):`<article class="panel"><h1>${label}</h1><p>Nothing published yet.</p></article>`}</div></section>`;
  const main=home+`<section data-view="blog" hidden>${articles||'<article class="panel article"><h1>Research Blog</h1><p>No posts published yet.</p></article>'}</section>`+panels('projects',projects,'PROJECTS')+panels('reading',readings,'FURTHER READING · ADDED')+`<section data-view="archive" hidden><article class="panel"><h1>Archive</h1>${posts.map(p=>`<p><span class="small">${date(p.meta.date)}</span> ${postLink(p,p.meta.title)}</p>`).join('')||'<p>No posts published yet.</p>'}</article></section>`;
  let html=fs.readFileSync(path.join(repo,'site/template.html'),'utf8');
  html=html.replace(/<main>[\s\S]*?<\/main>/,()=>`<main>${preview?'<p class="preview-notice">LOCAL PREVIEW · Includes drafts · Nothing here publishes automatically</p>':''}${main}</main>`);
  html=html.replace(/let postIndex=2;[\s\S]*?const headerSlot=/,()=>`const postSlugs=${JSON.stringify(posts.map(p=>p.meta.slug))};\n${fs.readFileSync(path.join(repo,'tools/navigation.js'),'utf8')}\nconst headerSlot=`);
  html=html.replace("show('home');",'route();');
  html=html.replace('[insert site title]',()=>escape(s.title||'Nellie Gregg')).replace('[insert footer text]',()=>escape(s.footer||''));
  html=html.replace(/<title>.*?<\/title>/,()=>`<title>${escape(s.title||'Nellie Gregg')}</title>`).replace('Personal research website mock-up','Personal research website');
  html=html.replace('</style>',`[hidden]{display:none!important}#nellie-preview .post-subtitle{font-size:1.25rem;line-height:1.5;color:#485f5e;margin:0 0 24px}#nellie-preview .article-body img,#nellie-preview .panel img{max-width:100%;height:auto}#nellie-preview blockquote{border-left:3px solid #6e8988;margin-left:0;padding-left:20px}#nellie-preview pre{overflow:auto;padding:16px;background:#e7ded9}#nellie-preview .panel{overflow-wrap:anywhere}#nellie-preview .article-body p{margin:24px 0}#nellie-preview .article-body :is(h1,h2,h3,h4,h5,h6){scroll-margin-top:110px}#nellie-preview .preview-notice{color:#f7ece7;text-align:center}#nellie-preview table{display:block;overflow:auto;border-collapse:collapse}#nellie-preview :is(td,th){border:1px solid #6e8988;padding:8px}</style>`);
  fs.mkdirSync(output,{recursive:true});
  for(const [target,source] of assets){fs.mkdirSync(path.dirname(path.join(output,target)),{recursive:true});fs.copyFileSync(source,path.join(output,target));}
  fs.writeFileSync(path.join(output,'index.html'),html);
  return {posts:posts.length,projects:projects.length,readings:readings.length,output};
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {console.log(build({preview:process.argv.includes('--drafts'),output:process.argv.includes('--site')?repo:path.join(repo,'.preview')}));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
