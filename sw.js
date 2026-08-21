// Health Score PWA v0.6.23 — icon refresh
const CACHE='health-score-v0.6.23-icon6';
const ASSETS=['./','./index.html','./styles.css?v=050','./enhancements-v060.css?v=060','./graph-v061.css?v=061','./graph-v071.css?v=071','./home-v062.css?v=062','./ui-v063.css?v=063','./ui-v064.css?v=064','./ui-v065.css?v=065','./ui-v067.css?v=067','./ui-v074.css?v=074','./ui-v082.css?v=082','./notifications-v078.css?v=081','./app.js?v=050','./enhancements-v060.js?v=060','./weekly-v060-fix.js?v=060b','./graph-v061.js?v=061','./home-v062.js?v=062','./ui-v063.js?v=063','./ui-v064.js?v=065','./ui-v067.js?v=067','./ui-v070.js?v=070','./graph-v071.js?v=071','./graph-v072.js?v=072','./graph-v073.js?v=073','./ui-v074.js?v=081','./ui-v082.js?v=083','./graph-v075.js?v=081','./notifications-v079.js?v=081','./notification-route-v081.js?v=081','./manifest.webmanifest','./icon.svg?v=6'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

self.addEventListener('push',event=>{
  let payload={};
  try{payload=event.data?.json()||{}}catch{
    try{payload={body:event.data?.text()||''}}catch{payload={}}
  }
  const title=payload.notification?.title||payload.data?.title||payload.title||'Health Score';
  const body=payload.notification?.body||payload.data?.body||payload.body||'';
  const route=payload.data?.route||payload.route||'next';
  const url=payload.data?.url||payload.url||`./?notify=${encodeURIComponent(route)}`;
  const options={
    body,
    icon:'./icon.svg?v=6',
    tag:payload.data?.tag||payload.tag||'health-score',
    renotify:true,
    data:{url,route}
  };
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const route=event.notification.data?.route||'next';
  const target=new URL(event.notification.data?.url||`./?notify=${encodeURIComponent(route)}`,self.registration.scope).href;
  event.waitUntil((async()=>{
    const windows=await clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      if(client.url.startsWith(self.registration.scope)){
        await client.focus();
        client.postMessage({type:'HEALTH_SCORE_NOTIFICATION_CLICK',route});
        return;
      }
    }
    await clients.openWindow(target);
  })());
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith((async()=>{
    try{
      const response=await fetch(event.request,{cache:'no-store'});
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      return response;
    }catch{
      return (await caches.match(event.request)) || (event.request.mode==='navigate'?await caches.match('./index.html'):Response.error());
    }
  })());
});
