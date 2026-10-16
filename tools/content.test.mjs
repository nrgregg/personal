import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {repo,parse,excerpt} from './content.mjs';

test('automatic excerpts use readable post text and end in three dots',()=>{
  assert.equal(excerpt('**Hello** [world](https://example.com)!\n\n![Photo](Images/photo.jpg)'),'Hello world!...');
  assert.equal(excerpt('A'.repeat(120)),'A'.repeat(100)+'...');
  assert.equal(excerpt('Text[^note]\n\n[^note]: Hidden footnote'),'Text...');
  assert.equal(excerpt('Fish &amp; water'),'Fish & water...');
  assert.equal(excerpt(''),'');
});

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
    write('Projects/project.md',note('Project','published','2026-09-03','Project body\n\n[Comic](projects/shapeshifters_short_graphic.html)\n\n[Unsafe](javascript:alert)'));
    write('Further Reading/reading.md',note('Reading','published','2026-09-02','[Source](https://example.com)'));
    write('Projects/thumbnail.md',note('Thumbnail project','published','2026-09-04','Thumbnail description\n\n[Read](https://example.com/comic)','thumbnail: example.png\nthumbnail_alt: Cover illustration\n'));
    write('Home/About.md','---\ntitle: Test person\nphoto: Images/example.png\nphoto_alt: Test portrait\n---\nBiography text');
    write('Home/Tagline.md','---\ntitle: Tagline\n---\nShort descriptor');
    write('Home/Affiliations.md','---\ntitle: Affiliations\n---\n[Affiliation](https://example.com/team)');
    write('Home/Links.md','---\ntitle: Contacts\n---\n[Email](mailto:test@example.com)');
    write('Home/Site.md','---\ntitle: Test site\ncommentbox_project: test-project\n---\n');
    const run=()=>spawnSync(process.execPath,[path.join(target,'tools/content.mjs')],{encoding:'utf8'});
    assert.equal(run().status,0);
    const html=fs.readFileSync(path.join(target,'index.html'),'utf8');
    assert.match(html, /class="project-thumbnail">\s*<img src="assets\/example.png" alt="Cover illustration"/);
    assert.match(html, /class="project-description">\s*<p>Thumbnail description<\/p>/);
    assert.equal((html.match(/class="project-content"/g)||[]).length,1);
    assert.ok(!html.includes('{{thumbnail}}'));
    for(const content of ['<strong>Bold</strong>','<em>italic</em>','<blockquote>','Edited September 28, 2026','Summary text','Project body','https://example.com','&lt;script&gt;'])assert.ok(html.includes(content),content);
    assert.ok(!html.includes('SECRET DRAFT BODY'));
    assert.ok(html.includes('href="projects/shapeshifters_short_graphic.html"'));
    assert.ok(!html.includes('href="javascript:'));
    assert.ok(html.includes('const postSlugs=["newer","older"]'));
    for(const slug of ['newer','older']){
      assert.ok(html.includes(`id="comments-${slug}"`));
      assert.ok(html.includes(`class="commentbox commentbox-${slug}" id="commentbox-${slug}"`));
      assert.ok(html.includes(`data-section="comments-${slug}">Comments</button>`));
      assert.ok(html.includes(`aria-labelledby="comments-heading-${slug}"`));
    }
    assert.equal((html.match(/class="post-comments"/g)||[]).length,2);
    assert.ok(html.includes('const commentBoxProject="test-project"'));
    assert.ok(fs.existsSync(path.join(target,'assets/example.png')));
    const about=html.match(/<article class="panel bio"[\s\S]*?<\/article>/)[0];
    assert.ok(about.includes('>ABOUT</span>'));
    assert.ok(about.includes('alt="Test portrait"'));
    assert.ok(!about.includes('mailto:test@example.com'));
    assert.match(html,/<article class="panel links-panel">[\s\S]*?mailto:test@example.com[\s\S]*?<\/article>/);
    const order=['about-photo','about-tagline','about-affiliations','about-bio'].map(name=>about.indexOf(`class="${name}"`));
    assert.ok(order.every((position,index)=>position>=0 && (!index || position>order[index-1])));
    for(const text of ['Short descriptor','Affiliation','Biography text'])assert.ok(about.includes(text));
    const ids=[...html.matchAll(/id="(section-\d+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
    write('Projects/thumbnail.md',note('Thumbnail project','published','2026-09-04','Thumbnail description','thumbnail: missing.png\n'));
    assert.notEqual(run().status,0);
    assert.equal(fs.readFileSync(path.join(target,'index.html'),'utf8'),html);
    write('Projects/thumbnail.md',note('Thumbnail project','published','2026-09-04','Thumbnail description\n\n[Read](https://example.com/comic)','thumbnail: Images/example.png\nthumbnail_alt: Cover illustration\n'));
    assert.equal(run().status,0);
    assert.equal(fs.readFileSync(path.join(target,'index.html'),'utf8'),html);
    write('Blog Posts/newer.md',note('Newer','published','2026-02-30','broken'));
    assert.notEqual(run().status,0);
    assert.equal(fs.readFileSync(path.join(target,'index.html'),'utf8'),html);
    write('Blog Posts/newer.md',note('Newer','published','2026-09-27','![Missing](../Images/missing.png)'));
    assert.notEqual(run().status,0);
    assert.equal(fs.readFileSync(path.join(target,'index.html'),'utf8'),html);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
