let postIndex=0;
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
  root.querySelectorAll('nav button').forEach(el=>{if(el.dataset.page===(page==='archive'?'blog':page))el.setAttribute('aria-current','page');else el.removeAttribute('aria-current')});
  swim();
}
function route(){
  const [page,post]=location.hash.slice(1).split('/');
  postIndex=Math.max(0,postSlugs.indexOf(post));
  show(page||'home');
}
root.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.page){location.hash=button.dataset.page+(button.dataset.page==='blog'&&postSlugs.length?'/'+(button.dataset.post||postSlugs[0]):'');route();window.scrollTo({top:0,behavior:'instant'});}
  if(button.dataset.step){const next=postIndex+Number(button.dataset.step);if(next>=0&&next<postSlugs.length){location.hash='blog/'+postSlugs[next];route();window.scrollTo({top:0,behavior:'instant'});}}
  if(button.dataset.section)root.querySelector('[data-article]:not([hidden]) #'+button.dataset.section)?.scrollIntoView({behavior:'smooth',block:'start'});
});
window.addEventListener('hashchange',route);
