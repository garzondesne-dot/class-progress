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
