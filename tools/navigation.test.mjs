import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('comments load once per visited post and links retain the correct post route',async()=>{
  const articles=['newer','older'].map(slug=>({
    dataset:{article:slug},hidden:true,box:{},status:{textContent:''},scrolls:0,
    querySelector(selector){
      if(selector==='.commentbox')return this.box;
      if(selector==='[data-comment-status]')return this.status;
      return {};
    },
    scrollIntoView(){this.scrolls++;}
  }));
  const views=['home','blog','archive'].map(view=>({dataset:{view},hidden:true}));
  const scripts=[],calls=[];
  const root={
    querySelectorAll(selector){
      if(selector==='[data-article]')return articles;
      if(selector==='[data-view]')return views;
      return [];
    },
    querySelector(selector){
      if(selector==='[data-view="blog"]')return views[1];
      return articles.find(a=>!a.hidden);
    },
    addEventListener(){}
  };
  const location={hash:'#home',protocol:'https:'};
  const context=vm.createContext({root,postSlugs:['newer','older'],commentBoxProject:'5643378645532672-proj',URL,location,swim(){},
    document:{createElement(){return {};},head:{append(script){scripts.push(script);}}},
    window:{addEventListener(){},commentBox(project,options){calls.push({project,options});}}
  });
  vm.runInContext(fs.readFileSync(new URL('./navigation.js',import.meta.url),'utf8'),context);
  vm.runInContext('route()',context);
  assert.equal(scripts.length,0,'home does not load the third-party widget');
  location.hash='#blog/newer';vm.runInContext('route(); route()',context);
  assert.equal(scripts.length,1);
  scripts[0].onload();await Promise.resolve();
  assert.equal(calls.length,1,'repeated routing cannot duplicate the widget');
  assert.equal(calls[0].project,'5643378645532672-proj');
  location.hash='#blog/older/comments';vm.runInContext('route()',context);await Promise.resolve();
  assert.equal(calls.length,2);
  assert.equal(articles[1].scrolls,1,'a comment permalink scrolls to the comment section');
  for(const [index,slug] of ['newer','older'].entries()){
    assert.equal(calls[index].options.className,'commentbox-'+slug);
    assert.equal(calls[index].options.createBoxUrl('commentbox-'+slug,{href:'https://example.com/?tlc=123#blog/older'}),
      'https://example.com/#blog/'+slug+'/comments');
  }
  location.hash='#blog/newer';vm.runInContext('route()',context);await Promise.resolve();
  assert.equal(calls.length,2,'returning to a post preserves its existing widget');
});

test('opening index.html locally does not create a separate CommentBox thread',()=>{
  const status={textContent:''},box={};
  const article={dataset:{article:'post'},hidden:false,querySelector(selector){return selector==='.commentbox'?box:status;}};
  const scripts=[];
  const root={querySelector(selector){if(selector==='[data-view="blog"]')return {hidden:false};return article;},querySelectorAll(){return [];},addEventListener(){}};
  const context=vm.createContext({root,postSlugs:['post'],commentBoxProject:'project-id',URL,location:{hash:'#blog/post',protocol:'file:'},swim(){},document:{createElement(){return {};},head:{append(script){scripts.push(script);}}},window:{addEventListener(){}}});
  vm.runInContext(fs.readFileSync(new URL('./navigation.js',import.meta.url),'utf8'),context);
  vm.runInContext('loadComments()',context);
  assert.equal(scripts.length,0);
  assert.equal(status.textContent,'Comments are available on the published website.');
});
