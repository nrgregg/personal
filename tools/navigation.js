let postIndex=0;
let commentScript;
const mountedComments=new WeakSet();
function loadComments(){
  const article=root.querySelector('[data-article]:not([hidden])');
  const box=article?.querySelector('.commentbox');
  if(!box||mountedComments.has(box))return;
  const status=article.querySelector('[data-comment-status]');
  if(location.protocol==='file:'){
    status.textContent='Comments are available on the published website.';
    return;
  }
  status.textContent='Loading comments…';
  if(!commentScript)commentScript=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://unpkg.com/commentbox.io@0.9.16/dist/commentBox.min.js';
    script.onload=resolve;
    script.onerror=()=>{script.remove();commentScript=null;reject(new Error('Comments unavailable'));};
    document.head.append(script);
  });
  commentScript.then(()=>{
    if(article.hidden||root.querySelector('[data-view="blog"]').hidden||mountedComments.has(box))return;
    window.commentBox(commentBoxProject,{
      className:'commentbox-'+article.dataset.article,
      textColor:'#1e1423',
      subtextColor:'#485f5e',
      createBoxUrl(boxId,pageLocation){
        const url=new URL(pageLocation.href);
        url.search='';
        url.hash='blog/'+article.dataset.article+'/comments';
        return url.href;
      },
      onCommentCount(){status.textContent='';}
    });
    mountedComments.add(box);
  }).catch(()=>{status.textContent='Comments could not load. Select Comments in the sidebar to try again.';});
}
function renderPost(){
  root.querySelectorAll('[data-article]').forEach(el=>{
    el.hidden=el.dataset.article!==postSlugs[postIndex];
    el.querySelector('[data-step="1"]').disabled=postIndex>=postSlugs.length-1;
    el.querySelector('[data-step="-1"]').disabled=postIndex<=0;
  });
}
function show(page){
  if(!['home','blog','projects','reading','archive'].includes(page))page='home';
  renderPost();
  root.querySelectorAll('[data-view]').forEach(el=>el.hidden=el.dataset.view!==page);
  if(page==='blog')loadComments();
  root.querySelectorAll('nav button').forEach(el=>{if(el.dataset.page===(page==='archive'?'blog':page))el.setAttribute('aria-current','page');else el.removeAttribute('aria-current')});
  swim();
}
function route(){
  const [page,post,section]=location.hash.slice(1).split('/');
  postIndex=Math.max(0,postSlugs.indexOf(post));
  show(page||'home');
  if(page==='blog'&&section==='comments')root.querySelector('[data-article]:not([hidden]) .post-comments')?.scrollIntoView({block:'start'});
}
root.addEventListener('click',event=>{
  const footnote=event.target.closest('a[data-footnote]');
  if(footnote){
    event.preventDefault();
    const target=document.getElementById(footnote.getAttribute('href').slice(1));
    if(target){target.setAttribute('tabindex','-1');target.focus({preventScroll:true});target.scrollIntoView({behavior:'smooth',block:'center'});}
    return;
  }
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.page){location.hash=button.dataset.page+(button.dataset.page==='blog'&&postSlugs.length?'/'+(button.dataset.post||postSlugs[0]):'');route();window.scrollTo({top:0,behavior:'instant'});}
  if(button.dataset.step){const next=postIndex+Number(button.dataset.step);if(next>=0&&next<postSlugs.length){location.hash='blog/'+postSlugs[next];route();window.scrollTo({top:0,behavior:'instant'});}}
  if(button.dataset.section){
    root.querySelector('[data-article]:not([hidden]) #'+button.dataset.section)?.scrollIntoView({behavior:'smooth',block:'start'});
    if(button.dataset.section.startsWith('comments-'))loadComments();
  }
});
window.addEventListener('hashchange',route);
