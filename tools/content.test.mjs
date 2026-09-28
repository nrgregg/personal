import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {repo,parse} from './content.mjs';

test('properties reject malformed notes',()=>{
  assert.equal(parse('','empty'),null);
  assert.throws(()=>parse('body only','note'),/properties/);
  assert.throws(()=>parse('---\ntitle: one\ntitle: two\n---\n','note'),/duplicate/);
});
test('build includes published content, images, dates and navigation; errors preserve output',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'blog-content-'));
  try{
    const target=path.join(root,'personal');fs.mkdirSync(target);
    fs.cpSync(path.join(repo,'tools'),path.join(target,'tools'),{recursive:true});
    fs.cpSync(path.join(repo,'site'),path.join(target,'site'),{recursive:true});
    for(const folder of ['Blog Posts','Projects','Further Reading','Home','Images'])fs.mkdirSync(path.join(root,folder));
    const note=(title,status,date,body,extra='')=>`---\ntitle: ${title}\nstatus: ${status}\ndate: ${date}\n${extra}---\n${body}`;
    const write=(file,text)=>fs.writeFileSync(path.join(root,file),text);
    write('Images/example.png',Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'));
    write('Blog Posts/older.md',note('Older','published','2026-09-01','## Same heading\n\nOld body'));
    write('Blog Posts/newer.md',note('Newer','published','2026-09-27','## Same heading\n\n**Bold** and *italic*.\n\n> Quote\n\n![Description](../Images/example.png)\n\n<script>alert(1)</script>', 'updated: 2026-09-28\nsummary: Summary text\n'));
    write('Blog Posts/draft.md',note('Private draft','draft','2026-09-29','SECRET DRAFT BODY'));
    write('Projects/project.md',note('Project','published','2026-09-03','Project body'));
    write('Further Reading/reading.md',note('Reading','published','2026-09-02','[Source](https://example.com)'));
    const run=()=>spawnSync(process.execPath,[path.join(target,'tools/content.mjs'),'--site'],{encoding:'utf8'});
    assert.equal(run().status,0);
    const html=fs.readFileSync(path.join(target,'index.html'),'utf8');
    for(const content of ['<strong>Bold</strong>','<em>italic</em>','<blockquote>','Edited September 28, 2026','Summary text','Project body','https://example.com','&lt;script&gt;'])assert.ok(html.includes(content),content);
    assert.ok(!html.includes('SECRET DRAFT BODY'));
    assert.ok(html.includes('const postSlugs=["newer","older"]'));
    assert.ok(fs.existsSync(path.join(target,'assets/example.png')));
    const ids=[...html.matchAll(/id="(section-\d+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
    write('Blog Posts/newer.md',note('Newer','published','2026-02-30','broken'));
    assert.notEqual(run().status,0);
    assert.equal(fs.readFileSync(path.join(target,'index.html'),'utf8'),html);
    write('Blog Posts/newer.md',note('Newer','published','2026-09-27','![Missing](../Images/missing.png)'));
    assert.notEqual(run().status,0);
    assert.equal(fs.readFileSync(path.join(target,'index.html'),'utf8'),html);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
