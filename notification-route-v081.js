'use strict';

const NOTIFICATION_ROUTE_VERSION='0.6.21';

function nr81SetToday(){
  if(typeof today!=='function')return;
  const d=today();
  const date=$('date');
  if(date&&date.value!==d){
    date.value=d;
    if(typeof fillDetail==='function')fillDetail(d);
  }
}

function nr81FirstMissing(){
  if(typeof ent!=='function'||typeof today!=='function'||typeof preferredOrder!=='function')return null;
  const e=ent(today());
  if(e?.completed)return null;
  const missing=preferredOrder(e);
  return missing?.[0]||null;
}

function nr81Open(route='next'){
  const clean=String(route||'next').toLowerCase();
  if(clean==='home'){
    if(typeof goto==='function')goto('home');
    return;
  }

  nr81SetToday();
  let field=clean;
  if(clean==='next'||clean==='night')field=nr81FirstMissing();
  if(clean==='morning')field='weight';
  if(clean==='evening')field='buying';

  if(!field){
    if(typeof goto==='function')goto('home');
    return;
  }

  if(typeof goto==='function')goto('input');
  setTimeout(()=>{
    nr81SetToday();
    if(typeof scrollToField==='function')scrollToField(field);
    const input=field==='weight'?$('weight'):field==='steps'?$('steps'):field==='protein'?$('proteinActual'):null;
    input?.focus?.({preventScroll:true});
  },140);
}

function nr81RouteFromUrl(){
  const url=new URL(location.href);
  const route=url.searchParams.get('notify');
  if(!route)return;
  url.searchParams.delete('notify');
  history.replaceState(history.state,'',`${url.pathname}${url.search}${url.hash}`);
  setTimeout(()=>nr81Open(route),180);
}

if('serviceWorker'in navigator){
  navigator.serviceWorker.addEventListener('message',event=>{
    if(event.data?.type==='HEALTH_SCORE_NOTIFICATION_CLICK')nr81Open(event.data.route||'next');
  });
}

function nr81Init(){
  nr81RouteFromUrl();
  if($('version'))$('version').textContent=`Health Score v${NOTIFICATION_ROUTE_VERSION}`;
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',nr81Init);
else nr81Init();
