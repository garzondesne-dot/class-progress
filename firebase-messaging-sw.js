// GitHub Pages service worker for notification display and future Firebase Cloud Messaging.
// FCM delivery requires a Firebase project, web app configuration, VAPID key,
// a registered push subscription, and a trusted server-side scheduler.
self.addEventListener('push', event => {
  let data={};
  try { data=event.data ? event.data.json() : {}; } catch(e) { data={body:event.data?.text()||''}; }
  const n=data.notification||data;
  const title=n.title||'수업진도 알림';
  const options={body:n.body||'수업 종료 시각입니다. 진도를 확인하세요.',data:{url:(data.data&&data.data.url)||'./'}};
  event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=event.notification.data?.url||'./';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{
    const existing=windows.find(w=>w.url.includes('/class-progress/'));
    if(existing){await existing.focus();return;}
    return clients.openWindow(target);
  }));
});


// Cache only app assets. Progress, memos and Comci responses stay outside this cache.
const SHELL='class-progress-shell-identity-v1';
const ASSETS=['https://cdn.tailwindcss.com','https://unpkg.com/lucide@latest','https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(SHELL);
 await cache.add(new Request('./index.html',{cache:'reload'}));
 await Promise.allSettled(ASSETS.map(async url=>{const r=await fetch(url,{mode:'no-cors'});await cache.put(url,r);}));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith('class-progress-shell-')&&key!==SHELL)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET')return;
 if(event.request.mode==='navigate'&&url.origin===self.location.origin){
  event.respondWith((async()=>{const cache=await caches.open(SHELL);try{
   const r=await fetch(event.request,{signal:AbortSignal.timeout(5000)});
   if(r.ok)await cache.put('./index.html',r.clone());return r;
  }catch(e){return await cache.match('./index.html')||Response.error();}})());
 }else if(ASSETS.includes(url.href))event.respondWith((async()=>{
  const cache=await caches.open(SHELL);const hit=await cache.match(event.request);if(hit)return hit;
  const r=await fetch(event.request);if(r.ok||r.type==='opaque')await cache.put(event.request,r.clone());return r;
 })());
});

