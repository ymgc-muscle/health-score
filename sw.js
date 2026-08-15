// Health Score PWA v0.3.3
const CACHE='health-score-v0.3.3';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon.svg?v=3','./settings-v033.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))));self.clients.claim()});
async function decorate(r){if(!r)return r;const type=r.headers.get('content-type')||'';if(!type.includes('text/html'))return r;let text=await r.text();if(!text.includes('settings-v033.js'))text=text.replace('</body>','<script src="./settings-v033.js?v=033"></script></body>');const h=new Headers(r.headers);h.delete('content-length');return new Response(text,{status:r.status,statusText:r.statusText,headers:h})}
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const isPage=e.request.mode==='navigate'||new URL(e.request.url).pathname.endsWith('/index.html');e.respondWith((async()=>{try{const r=await fetch(e.request);if(!isPage){const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}return decorate(r)}catch{const r=await caches.match(e.request)||await caches.match('./index.html');return isPage?decorate(r):r}})())});
