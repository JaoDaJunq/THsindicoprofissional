const CACHE_NAME='gestao-condominial-shell-v2';
const APP_SHELL=[
  './',
  './index.html',
  './styles.css',
  './ui-refresh.css',
  './mobile-fixes.css',
  './favicon.svg',
  './manifest.webmanifest'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;

  event.respondWith(
    fetch(req).then(response=>{
      if(response && response.ok){
        const copy=response.clone();
        caches.open(CACHE_NAME).then(cache=>cache.put(req,copy)).catch(()=>{});
      }
      return response;
    }).catch(()=>caches.match(req).then(cached=>cached||caches.match('./index.html')))
  );
});

self.addEventListener('push',event=>{
  let data={title:'Gestão Condominial',body:'Você tem um novo alerta.',url:'#/notificacoes',tag:'gestao-condominial'};
  try{if(event.data)data={...data,...event.data.json()}}catch(_){try{data.body=event.data?.text()||data.body}catch(_){}}
  event.waitUntil(self.registration.showNotification(data.title||'Gestão Condominial',{
    body:data.body||'',
    icon:'./favicon.svg',
    badge:'./favicon.svg',
    tag:data.tag||'gestao-condominial',
    data:{url:data.url||'#/notificacoes'},
    renotify:true
  }));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=event.notification?.data?.url||'#/notificacoes';
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      if('focus' in client){
        try{await client.focus();client.postMessage({type:'OPEN_ROUTE',url:target});return}catch(_){}
      }
    }
    const base=new URL('./',self.registration.scope).href;
    return self.clients.openWindow(base+target);
  })());
});