import { Marked } from './vendor/marked.mjs';

// A fresh parser per document keeps definitions and numbering isolated.
export function renderMarkdown(source, renderer, prefix) {
  const definitions = new Map(), references = new Map();
  const parser = new Marked({renderer,gfm:true});
  parser.use({extensions:[{
    name:'footnoteDefinition', level:'block',
    start(src){return src.match(/^ {0,3}\[\^[^\]\s]+\]:/m)?.index;},
    tokenizer(src){
      const match=src.match(/^ {0,3}\[\^([^\]\s]+)\]:[ \t]*([^\n]*)(?:\n|$)/);
      if(!match)return;
      let raw=match[0],body=match[2];
      let rest=src.slice(raw.length);
      while(rest){
        const continuation=rest.match(/^(?:\n)*(?: {4}|\t)[^\n]*(?:\n|$)/);
        if(!continuation)break;
        raw+=continuation[0];body+='\n'+continuation[0].replace(/^(?: {4}|\t)/gm,'');rest=rest.slice(continuation[0].length);
      }
      if(definitions.has(match[1]))throw Error(`Duplicate footnote definition: ${match[1]}`);
      definitions.set(match[1],body);
      return {type:'footnoteDefinition',raw};
    },
    renderer(){return '';}
  },{
    name:'footnoteReference',level:'inline',
    start(src){return src.indexOf('[^');},
    tokenizer(src){const match=src.match(/^\[\^([^\]\s]+)\]/);if(match)return {type:'footnoteReference',raw:match[0],label:match[1]};},
    renderer(token){
      if(!definitions.has(token.label))throw Error(`Missing footnote definition: ${token.label}`);
      if(!references.has(token.label))references.set(token.label,{number:references.size+1,count:0});
      const ref=references.get(token.label);ref.count++;
      return `<sup id="${prefix}-ref-${ref.number}-${ref.count}"><a class="text-link" data-footnote href="#${prefix}-note-${ref.number}" aria-label="Footnote ${ref.number}">${ref.number}</a></sup>`;
    }
  }]});
  const html=parser.parse(source);
  if(!references.size)return html;
  const bodies=new Map();
  for(const [label] of references)bodies.set(label,parser.parse(definitions.get(label)));
  const notes=[...references].map(([label,ref])=>{
    const back=Array.from({length:ref.count},(_,i)=>`<a class="text-link" data-footnote href="#${prefix}-ref-${ref.number}-${i+1}" aria-label="Return to reference ${ref.number}${ref.count>1?`, occurrence ${i+1}`:''}">↩${ref.count>1?i+1:''}</a>`).join(' ');
    return `<li id="${prefix}-note-${ref.number}" tabindex="-1">${bodies.get(label)} ${back}</li>`;
  }).join('');
  return `${html}<section class="footnotes" aria-label="Footnotes"><h2>Footnotes</h2><ol>${notes}</ol></section>`;
}
