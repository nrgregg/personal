import test from 'node:test';
import assert from 'node:assert/strict';
import { marked } from './vendor/marked.mjs';
import { renderMarkdown } from './footnotes.mjs';
const render=text=>renderMarkdown(text,new marked.Renderer(),'post-one');

test('footnotes number by reference, render Markdown and provide every return link',()=>{
  const html=render('Second first.[^b] Then first.[^a] Again.[^b]\n\n[^a]: *Alpha*\n[^b]: **Beta**\n\n    Another paragraph.\n');
  assert.ok(html.includes('id="post-one-note-1" tabindex="-1"><p><strong>Beta</strong>'));
  assert.ok(html.includes('<p>Another paragraph.</p>'));
  assert.ok(html.includes('href="#post-one-ref-1-2"'));
  assert.ok(html.includes('<em>Alpha</em>'));
});
test('code stays literal and definitions are isolated between documents',()=>{
  assert.ok(!render('`[^missing]`\n\n```\n[^code]: literal\n```').includes('class="footnotes"'));
  render('Text[^a]\n\n[^a]: Note');
  assert.throws(()=>render('Text[^a]'),/Missing footnote/);
  assert.throws(()=>render('[^a]: One\n\n[^a]: Two'),/Duplicate footnote/);
  assert.ok(!render('[^unused]: Omitted').includes('Omitted'));
});
