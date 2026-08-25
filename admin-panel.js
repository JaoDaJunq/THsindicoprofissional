(() => {
  const SUPABASE_URL = 'https://tckvzlizcqdxzgavjwie.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3';
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const app = document.getElementById('admin-app');

  const esc = (s) => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const fmt = (v) => v ? new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v)) : 'Nunca';

  function status(message,type='ok') {
    const el=document.getElementById('admin-status');
    if(!el)return;
    el.className=`sys-admin-status show ${type}`;
    el.textContent=message;
  }

  function loginView(message='') {
    app.innerHTML=`<section class="sys-admin-login"><div class="sys-admin-login-card"><div class="sys-admin-brand"><div class="brand-mark">SG</div><div><strong style="color:#171c27">Admin do Sistema</strong><span>Gestão Condominial</span></div></div><div class="eyebrow">ACESSO RESTRITO</div><h1>Painel administrativo</h1><p class="muted" style="font-size:10px;line-height:1.55;margin:8px 0 20px">Esta área é exclusiva para contas autorizadas como superadministrador.</p><form id="admin-login-form" class="form-grid"><div class="field full"><label>E-mail</label><input name="email" type="email" required autocomplete="username"></div><div class="field full"><label>Senha</label><input name="password" type="password" required autocomplete="current-password"></div><div class="field full"><button class="btn btn-primary btn-lg" style="width:100%">Entrar no Admin</button></div></form><div id="admin-status" class="sys-admin-status ${message?'show error':''}">${esc(message)}</div><p style="margin:18px 0 0;text-align:center;font-size:8px;color:#929aaa">A autorização é validada no servidor. Conhecer o endereço desta página não concede acesso.</p></div></section>`;

    document.getElementById('admin-login-form').onsubmit=async e=>{
      e.preventDefault();
      const f=new FormData(e.target),btn=e.target.querySelector('button');
      btn.disabled=true;btn.textContent='Validando...';
      const {error}=await sb.auth.signInWithPassword({email:String(f.get('email')).trim(),password:String(f.get('password'))});
      if(error){btn.disabled=false;btn.textContent='Entrar no Admin';return status('E-mail ou senha inválidos.','error')}
      await boot();
    };
  }

  async function invoke(action,payload={}) {
    const {data:{session}}=await sb.auth.getSession();
    if(!session)throw new Error('Sessão expirada.');
    const {data,error}=await sb.functions.invoke('system-admin',{body:{action,...payload}});
    if(error)throw error;
    if(data?.error){const err=new Error(data.error);err.code=data.error;throw err}
    return data;
  }

  async function boot() {
    const {data:{session}}=await sb.auth.getSession();
    if(!session)return loginView();
    try {
      const who=await invoke('whoami');
      await dashboard(who.user);
    } catch(err) {
      if(String(err.message||'').includes('forbidden')||err.code==='forbidden'){
        await sb.auth.signOut();
        return loginView('Esta conta não possui permissão de superadministrador.');
      }
      loginView('Não foi possível validar o acesso administrativo.');
    }
  }

  async function dashboard(user) {
    app.innerHTML=`<div class="sys-admin-shell"><aside class="sys-admin-side"><div class="sys-admin-brand"><div class="brand-mark">SG</div><div><strong>Admin do Sistema</strong><span>Controle de acessos</span></div></div><div class="sys-admin-nav-label">Administração</div><div class="sys-admin-nav-item">◈ Contas de gestão</div><div class="sys-admin-foot"><small>Superadministrador</small><strong>${esc(user.email||'')}</strong><button id="admin-logout" class="cloud-logout" style="width:100%">Sair</button></div></aside><main class="sys-admin-main"><header class="topbar"><div><div class="eyebrow">GESTÃO CONDOMINIAL</div><h1>Painel principal de ADM</h1><div class="muted small" style="margin-top:5px">Crie e gerencie acessos de síndicos sem usar o painel do Supabase.</div></div><div class="top-actions"><button class="btn btn-primary" id="new-manager">+ Novo síndico</button></div></header><div id="admin-content"><div class="empty">Carregando contas...</div></div></main></div>`;
    document.getElementById('admin-logout').onclick=async()=>{await sb.auth.signOut();loginView()};
    document.getElementById('new-manager').onclick=()=>openManagerForm(user);
    await loadManagers(user);
  }

  async function loadManagers(user) {
    const box=document.getElementById('admin-content');
    try {
      const result=await invoke('list_managers');
      const managers=result.managers||[];
      const superadmins=managers.filter(x=>x.system_role==='superadmin').length;
      const syndics=managers.filter(x=>x.system_role==='manager').length;
      const rows=managers.length?managers.map(m=>`<tr><td><strong>${esc(m.full_name||'Sem nome')}</strong><div class="muted" style="font-size:8px;margin-top:3px">${esc(m.email||'')}</div></td><td><span class="badge ${m.system_role==='superadmin'?'attention':'good'}">${m.system_role==='superadmin'?'Superadmin':'Síndico'}</span></td><td>${fmt(m.created_at)}</td><td>${fmt(m.last_sign_in_at)}</td><td>${m.system_role==='superadmin'?'<span class="muted">Protegido</span>':`<button class="btn" data-remove-manager="${m.id}" data-email="${esc(m.email||'')}">Remover acesso</button>`}</td></tr>`).join(''):`<tr><td colspan="5" class="empty">Nenhuma conta de gestão cadastrada.</td></tr>`;
      box.innerHTML=`<section class="sys-admin-grid"><article class="sys-admin-stat"><span>Superadministradores</span><strong>${superadmins}</strong></article><article class="sys-admin-stat"><span>Síndicos autorizados</span><strong>${syndics}</strong></article><article class="sys-admin-stat"><span>Total de acessos de gestão</span><strong>${managers.length}</strong></article></section><section class="sys-admin-panel"><div class="sys-admin-panel-head"><div><h2>Contas de gestão</h2><div class="muted small" style="margin-top:4px">Somente usuários abaixo podem criar e administrar condomínios.</div></div></div><div class="sys-admin-panel-body"><div style="overflow:auto"><table class="sys-admin-table"><thead><tr><th>Usuário</th><th>Nível</th><th>Criado em</th><th>Último acesso</th><th>Ação</th></tr></thead><tbody>${rows}</tbody></table></div><div id="admin-status" class="sys-admin-status"></div></div></section>`;
      box.querySelectorAll('[data-remove-manager]').forEach(btn=>btn.onclick=()=>removeManager(btn.dataset.removeManager,btn.dataset.email,user));
    } catch(err) {
      box.innerHTML=`<section class="sys-admin-panel"><div class="sys-admin-panel-body"><div class="empty">Não foi possível carregar as contas administrativas.</div></div></section>`;
    }
  }

  function openManagerForm(user) {
    const overlay=document.createElement('div');
    overlay.className='modal';
    overlay.id='admin-manager-modal';
    overlay.innerHTML=`<div class="modal-backdrop"></div><section class="modal-card" style="width:min(560px,96vw)"><button class="modal-close" id="close-admin-modal">×</button><div class="eyebrow">NOVO ACESSO</div><h2 style="font-size:18px;margin-bottom:7px">Cadastrar síndico</h2><p class="muted" style="font-size:9px;line-height:1.55;margin:0 0 18px">O síndico receberá um convite por e-mail para definir o acesso. A conta já será autorizada como gestor pelo backend.</p><form id="manager-form" class="form-grid"><div class="field full"><label>Nome completo</label><input name="name" required></div><div class="field full"><label>E-mail</label><input name="email" type="email" required></div><div class="field full"><button class="btn btn-primary btn-lg">Enviar convite e criar acesso</button></div></form><div id="modal-admin-status" class="sys-admin-status"></div></section>`;
    document.body.appendChild(overlay);
    const close=()=>overlay.remove();
    overlay.querySelector('.modal-backdrop').onclick=close;
    document.getElementById('close-admin-modal').onclick=close;
    document.getElementById('manager-form').onsubmit=async e=>{
      e.preventDefault();const f=new FormData(e.target),btn=e.target.querySelector('button'),statusEl=document.getElementById('modal-admin-status');
      btn.disabled=true;btn.textContent='Criando acesso...';
      try{
        await invoke('invite_manager',{email:String(f.get('email')).trim(),full_name:String(f.get('name')).trim(),redirect_to:location.origin+location.pathname.replace(/admin\.html$/,'')});
        statusEl.className='sys-admin-status show ok';statusEl.textContent='Convite enviado e acesso de síndico criado.';
        setTimeout(async()=>{close();await loadManagers(user)},900);
      }catch(err){btn.disabled=false;btn.textContent='Enviar convite e criar acesso';statusEl.className='sys-admin-status show error';statusEl.textContent='Não foi possível criar o acesso: '+String(err.message||err)}
    };
  }

  async function removeManager(id,email,user) {
    if(!confirm(`Remover o acesso de gestão de ${email}? A conta continuará existindo, mas deixará de poder criar condomínios como síndico.`))return;
    try{await invoke('remove_manager_access',{user_id:id});await loadManagers(user);status('Acesso de gestão removido.','ok')}catch(err){status('Não foi possível remover o acesso: '+String(err.message||err),'error')}
  }

  sb.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT')loginView()});
  boot();
})();