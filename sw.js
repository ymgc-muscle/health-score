// Health Score PWA v0.6.14 — unified protein input flow + icon layer fix
const CACHE='health-score-v0.6.14-icon5';
const ASSETS=['./','./index.html','./styles.css?v=050','./enhancements-v060.css?v=060','./graph-v061.css?v=061','./graph-v071.css?v=071','./home-v062.css?v=062','./ui-v063.css?v=063','./ui-v064.css?v=064','./ui-v065.css?v=065','./ui-v067.css?v=067','./ui-v074.css?v=074','./app.js?v=050','./enhancements-v060.js?v=060','./weekly-v060-fix.js?v=060b','./graph-v061.js?v=061','./home-v062.js?v=062','./ui-v063.js?v=063','./ui-v064.js?v=065','./ui-v067.js?v=067','./ui-v070.js?v=070','./graph-v071.js?v=071','./graph-v072.js?v=072','./graph-v073.js?v=073','./ui-v074.js?v=074','./manifest.webmanifest','./icon.svg?v=5'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith((async()=>{
    try{
      const response=await fetch(event.request);
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      return response;
    }catch{
      return (await caches.match(event.request)) || (event.request.mode==='navigate'?await caches.match('./index.html'):Response.error());
    }
  })());
});
