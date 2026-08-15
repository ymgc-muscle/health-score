// Health Score PWA v0.5.0
const CACHE='health-score-v0.5.0';
const ASSETS=['./','./index.html','./styles.css?v=050','./app.js?v=050','./manifest.webmanifest','./icon.svg?v=3'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
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
