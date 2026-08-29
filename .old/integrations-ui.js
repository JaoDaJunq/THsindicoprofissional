(() => {
  'use strict';
  if (!window.supabase || typeof shell !== 'function') return;

  const sb = window.supabase.createClient(
    'https://tckvzlizcqdxzgavjwie.supabase.co',
    'sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3'
  );
  const VAPID_PUBLIC_KEY='BCqndZhJbk2Qyb-6_sHaWaep26S3L61Esbb75-4EOAoP0sH7fLFvExTltpLwTI_yOw-GLYQPVYoa_dFwRg5PbV0';
  const FEED_BASE='https://tckvzlizcqdxzgavjwie.supabase.co/functions/v1/calendar-feed?token=';

  const safe=s=>typeof esc==='function'?esc(s):String(s??'');
  const fmt=v=>v?new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v)):'-';

  const oldShell=shell;
  shell=function(content,active='dashboard',cid=null){
    let html=oldShell(content,active,cid);
    const extra=`<a href="#/integracoes" class="${active==='integrations'?'active':''}"><span>⇄</span>Integrações</a><a href="#/notificacoes" class="${active==='notifications'?'active':''}"><span>🔔</span>Notificações</a>`;
    if(!html.includes('href="#/integracoes"')) html=html.replace('</nav>',extra+'</nav>');
    return html;
  };

  if(typeof topbar==='function'){
    const oldTopbar=topbar;
    topbar=function(title,sub,eye='Painel do Síndico',actions=''){
      return oldTopbar(title,sub,eye,actions).replace("location.hash='#/manutencoes'","location.hash='#/notificacoes'");
    };
  }

  function base64ToUint8Array(base64String){
    const padding='='.repeat((4-base64String.length%4)%4);
    const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
    const raw=atob(base64);
    return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
  }

  async function sessionUser(){return (await sb.auth.getSession()).data.session?.user||null}
  async function currentSubscription(){
    if(!('serviceWorker' in navigator)||!('PushManager' in window))return null;
    try{return await (await navigator.serviceWorker.ready).pushManager.getSubscription()}catch(_){return null}
  }

  async function ensurePreference(userId){
    let {data:p}=await sb.from('push_preferences').select('*').eq('user_id',userId).maybeSingle();
    if(!p){
      const {data:newP,error}=await sb.from('push_preferences').insert({user_id:userId}).select().single();
      if(error)throw error;p=newP;
    }
    return p;
  }

  async function getFeeds(){
    const [{data:feeds,error:fe},{data:condos,error:ce}]=await Promise.all([
      sb.from('calendar_feed_tokens').select('*').order('created_at'),
      sb.from('condominiums').select('id,name').order('name')
    ]);
    if(fe)throw fe;if(ce)throw ce;
    const map=new Map((condos||[]).map(c=>[c.id,c]));
    return (feeds||[]).map(f=>({...f,name:map.get(f.condominium_id)?.name||'Condomínio'})).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  }

  async function pushStatus(){
    const user=await sessionUser();
    const supported='Notification' in window&&'serviceWorker' in navigator&&'PushManager' in window;
    const sub=supported?await currentSubscription():null;
    const pref=user?await ensurePreference(user.id):null;
    return {user,supported,sub,pref,permission:supported?Notification.permission:'unsupported'};
  }

  window.integrationsPage=async function(){
    const user=await sessionUser();if(!user)return;
    $('#app').innerHTML=shell(`${topbar('Integrações','Calendários externos e alertas do PWA.','Sistema')}<article class="panel"><div class="panel-body"><div class="empty">Carregando integrações...</div></div></article>`,'integrations');
    try{
      const [feeds,push]=await Promise.all([getFeeds(),pushStatus()]);
      const feedCards=feeds.map(f=>{
        const url=FEED_BASE+f.token;
        return `<article class="card integration-card"><div><div class="eyebrow">Calendário independente</div><h3>${safe(f.name)}</h3><p class="muted small">Use este link no Google Agenda em <b>Outras agendas → + → A partir do URL</b>. Alterações feitas no sistema atualizam este feed automaticamente.</p><div class="integration-url"><code>${safe(url)}</code></div></div><div class="integration-actions"><button class="btn btn-primary" onclick="copyCalendarFeed('${safe(url)}')">Copiar link</button><button class="btn btn-soft" onclick="rotateCalendarFeed('${f.condominium_id}')">Gerar novo link</button></div></article>`;
      }).join('');
      const p=push.pref||{};
      const pushBadge=!push.supported?'<span class="badge bad">Não suportado neste navegador</span>':push.sub&&push.permission==='granted'?'<span class="badge good">Ativo neste aparelho</span>':push.permission==='denied'?'<span class="badge bad">Bloqueado pelo navegador</span>':'<span class="badge warn">Ainda não ativado</span>';
      const pushButton=push.supported&&!(push.sub&&push.permission==='granted')?'<button class="btn btn-primary" onclick="enableWebPush()">🔔 Ativar notificações neste aparelho</button>':push.sub?'<button class="btn btn-soft" onclick="disableWebPush()">Desativar neste aparelho</button>':'';
      $('#app').innerHTML=shell(`${topbar('Integrações','Calendários externos e alertas do PWA.','Sistema')}<div class="integration-grid"><article class="panel"><div class="panel-head"><div><h2>Calendários por condomínio</h2><div class="muted small">Cada condomínio vira uma agenda separada no Google, Apple Calendar ou Outlook.</div></div></div><div class="panel-body integration-list">${feedCards||'<div class="empty">Nenhum calendário configurado.</div>'}</div></article><article class="panel"><div class="panel-head"><div><h2>Notificações Push</h2><div class="muted small">Os alertas saem direto do sistema e não dependem da atualização do Google Agenda.</div></div>${pushBadge}</div><div class="panel-body"><div class="database-explainer" style="margin-top:0"><div class="database-icon">📲</div><div><strong>Este aparelho</strong><p>Para receber alertas com o app fechado, instale o PWA e permita notificações. No iPhone, o site precisa estar adicionado à Tela de Início.</p></div></div><div style="margin-bottom:16px">${pushButton}</div><form id="push-pref-form" class="push-pref-grid"><label><input type="checkbox" name="maintenance" ${p.maintenance!==false?'checked':''}> Manutenções</label><label><input type="checkbox" name="task" ${p.task!==false?'checked':''}> Tarefas</label><label><input type="checkbox" name="document_expiry" ${p.document_expiry!==false?'checked':''}> Documentos</label><label><input type="checkbox" name="assembly" ${p.assembly!==false?'checked':''}> Assembleias</label><label><input type="checkbox" name="gas" ${p.gas!==false?'checked':''}> Gás</label><label><input type="checkbox" name="overdue" ${p.overdue!==false?'checked':''}> Avisar quando atrasar</label><div class="field full"><button class="btn" type="submit">Salvar preferências</button></div></form></div></article></div>`,'integrations');
      const form=$('#push-pref-form');if(form)form.onsubmit=savePushPrefs;
    }catch(err){flash(err.message||String(err))}
  };

  async function savePushPrefs(e){
    e.preventDefault();const user=await sessionUser();if(!user)return;
    const f=new FormData(e.target);const keys=['maintenance','task','document_expiry','assembly','gas','overdue'];
    const payload={user_id:user.id,enabled:true};keys.forEach(k=>payload[k]=f.has(k));
    const {error}=await sb.from('push_preferences').upsert(payload,{onConflict:'user_id'});if(error)return flash(error.message);flash('Preferências salvas.');
  }

  window.copyCalendarFeed=async function(url){
    try{await navigator.clipboard.writeText(url);flash('Link privado do calendário copiado.')}catch(_){prompt('Copie o link do calendário:',url)}
  };

  window.rotateCalendarFeed=async function(cid){
    if(!confirm('Gerar um novo link? O link antigo deixará de funcionar e precisará ser substituído no Google Agenda.'))return;
    const {error}=await sb.from('calendar_feed_tokens').update({token:crypto.randomUUID(),rotated_at:new Date().toISOString()}).eq('condominium_id',cid);
    if(error)return flash(error.message);flash('Novo link gerado. O anterior foi revogado.');integrationsPage();
  };

  window.enableWebPush=async function(){
    const user=await sessionUser();if(!user)return;
    if(!('Notification' in window)||!('serviceWorker' in navigator)||!('PushManager' in window))return flash('Este navegador não suporta Push Web.');
    const permission=await Notification.requestPermission();
    if(permission!=='granted')return flash('Permissão de notificações não concedida.');
    try{
      const reg=await navigator.serviceWorker.ready;
      let sub=await reg.pushManager.getSubscription();
      if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:base64ToUint8Array(VAPID_PUBLIC_KEY)});
      const json=sub.toJSON();
      const {error}=await sb.from('push_subscriptions').upsert({user_id:user.id,endpoint:json.endpoint,p256dh:json.keys?.p256dh,auth_secret:json.keys?.auth,expiration_time:json.expirationTime||null,user_agent:navigator.userAgent},{onConflict:'endpoint'});
      if(error)throw error;
      await ensurePreference(user.id);
      await reg.showNotification('Gestão Condominial',{body:'Notificações ativadas neste aparelho ✅',icon:'./favicon.svg',badge:'./favicon.svg',tag:'push-enabled'});
      flash('Push ativado neste aparelho.');integrationsPage();
    }catch(err){console.error(err);flash(err.message||'Não foi possível ativar as notificações.')}
  };

  window.disableWebPush=async function(){
    const sub=await currentSubscription();if(!sub)return integrationsPage();
    const endpoint=sub.endpoint;
    try{await sub.unsubscribe();await sb.from('push_subscriptions').delete().eq('endpoint',endpoint);flash('Push desativado neste aparelho.');integrationsPage()}catch(err){flash(err.message||String(err))}
  };

  window.notificationsPage=async function(){
    const user=await sessionUser();if(!user)return;
    $('#app').innerHTML=shell(`${topbar('Notificações','Histórico de alertas gerados pelo sistema.','Sistema',`<button class="btn" onclick="markAllNotificationsRead()">Marcar todas como lidas</button>`)}<article class="panel"><div class="panel-body"><div class="empty">Carregando notificações...</div></div></article>`,'notifications');
    const {data:rows,error}=await sb.from('notifications').select('id,title,message,channel,status,read_at,created_at,condominium_id,event_id').order('created_at',{ascending:false}).limit(200);
    if(error)return flash(error.message);
    const list=(rows||[]).length?(rows||[]).map(n=>`<article class="notification-card ${n.read_at?'':'unread'}"><div class="notification-dot"></div><div style="min-width:0;flex:1"><div class="eyebrow">${fmt(n.created_at)} • ${safe(n.channel==='push'?'Push':n.channel)}</div><strong>${safe(n.title)}</strong><p>${safe(n.message||'')}</p></div>${n.read_at?'':`<button class="btn btn-soft" onclick="markNotificationRead('${n.id}')">Lida</button>`}</article>`).join(''):'<div class="empty">Nenhum alerta gerado ainda.</div>';
    $('#app').innerHTML=shell(`${topbar('Notificações','Histórico de alertas gerados pelo sistema.','Sistema',`<button class="btn" onclick="markAllNotificationsRead()">Marcar todas como lidas</button>`)}<article class="panel"><div class="panel-head"><div><h2>Central de alertas</h2><div class="muted small">Até 200 notificações mais recentes.</div></div></div><div class="panel-body notification-list">${list}</div></article>`,'notifications');
  };

  window.markNotificationRead=async id=>{await sb.from('notifications').update({read_at:new Date().toISOString()}).eq('id',id);notificationsPage()};
  window.markAllNotificationsRead=async()=>{const user=await sessionUser();if(!user)return;await sb.from('notifications').update({read_at:new Date().toISOString()}).eq('user_id',user.id).is('read_at',null);notificationsPage()};

  const style=document.createElement('style');
  style.textContent=`
  .integration-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(300px,.75fr);gap:15px;align-items:start}.integration-list{display:grid;gap:10px}.integration-card{padding:14px;display:flex;justify-content:space-between;gap:14px;align-items:center}.integration-card h3{margin:3px 0 6px}.integration-card p{max-width:650px;line-height:1.5}.integration-url{margin-top:9px;background:#f6f7f9;border:1px solid var(--line);border-radius:9px;padding:8px;max-width:680px;overflow:auto}.integration-url code{font-size:9px;white-space:nowrap}.integration-actions{display:flex;gap:7px;flex:0 0 auto}.push-pref-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.push-pref-grid label{display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:10px;padding:10px;font-size:10px;font-weight:700;background:#fff}.push-pref-grid input{accent-color:var(--primary)}.notification-list{display:grid;gap:9px}.notification-card{display:flex;align-items:flex-start;gap:10px;padding:12px;border:1px solid var(--line);border-radius:12px;background:#fff}.notification-card.unread{border-color:#d9e0ff;background:#fafbff}.notification-card .notification-dot{width:8px;height:8px;border-radius:50%;background:#b8bfcc;margin-top:5px;flex:0 0 8px}.notification-card.unread .notification-dot{background:var(--primary)}.notification-card strong{font-size:11px}.notification-card p{font-size:9px;color:var(--muted);margin:5px 0 0;line-height:1.5}
  @media(max-width:900px){.integration-grid{grid-template-columns:1fr}.integration-card{align-items:stretch;flex-direction:column}.integration-actions{width:100%;flex-wrap:wrap}.integration-actions .btn{flex:1 1 150px}.integration-url{max-width:100%}}
  @media(max-width:560px){.push-pref-grid{grid-template-columns:1fr}.notification-card{flex-wrap:wrap}.notification-card .btn{width:100%}}
  `;
  document.head.appendChild(style);
})();