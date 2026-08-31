(() => {
  const SUPABASE_URL = 'https://tckvzlizcqdxzgavjwie.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3';
  if (!window.supabase) return;
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  let authUser = null;
  let memberships = [];
  let mode = 'syndic';
  const oldRoute = typeof route === 'function' ? route : null;
  if (oldRoute) window.removeEventListener('hashchange', oldRoute);

  const style = document.createElement('style');
  style.textContent = `
    .auth-body{background:linear-gradient(145deg,#f4f7fb,#edf2ff)}.auth-page{min-height:100vh;display:grid;place-items:center;padding:24px}.auth-card{width:min(460px,100%);background:#fff;border:1px solid var(--line);border-radius:24px;padding:32px;box-shadow:0 25px 70px rgba(33,50,85,.12)}.auth-brand{display:flex;align-items:center;gap:12px;margin-bottom:26px}.auth-brand strong{display:block}.auth-brand span{display:block;color:var(--muted);font-size:10px;margin-top:2px}.auth-card h1{margin:6px 0 8px}.auth-form{display:flex;flex-direction:column;gap:12px;margin-top:20px}.auth-divider{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.08em;margin:20px 0}.auth-divider:before,.auth-divider:after{content:"";height:1px;background:var(--line);flex:1}.auth-secondary{width:100%}.auth-message{background:var(--primarySoft);border:1px solid #d7e0ff;color:#3658c8;padding:10px 12px;border-radius:11px;font-size:10px;margin:14px 0}.auth-footnote{font-size:9px!important;color:var(--muted);margin:14px 0 0!important}.auth-back{border:0;background:transparent;color:var(--primary);font-weight:800;padding:0;margin-bottom:18px}.cloud-logout{width:100%;margin-top:10px;border:1px solid #30405d;background:transparent;color:#b7c1d6;border-radius:10px;padding:8px;font-size:10px}.resident-app{min-height:100vh;display:grid;grid-template-columns:240px 1fr}.resident-sidebar{position:fixed;inset:0 auto 0 0;width:240px;background:var(--dark);color:#fff;padding:20px 16px;display:flex;flex-direction:column}.resident-sidebar .sidebar-footer{margin-top:auto}.resident-nav{display:flex;flex-direction:column;gap:6px}.resident-nav a{padding:11px 12px;border-radius:11px;color:#b7c1d6;font-size:11px}.resident-nav a.active{background:#1d2940;color:#fff}.resident-main{grid-column:2;padding:28px}.resident-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px}.resident-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.resident-card{background:#fff;border:1px solid var(--line);border-radius:17px;padding:18px;display:flex;gap:13px;box-shadow:var(--shadow)}.resident-card>span{font-size:22px}.resident-card strong{font-size:13px}.resident-card p{font-size:10px;color:var(--muted);line-height:1.5;margin:5px 0 0}.resident-highlight{grid-column:1/-1;background:linear-gradient(135deg,#111827,#1d2940);color:#fff}.resident-highlight p{color:#b7c1d6}.resident-note{margin-top:15px;border:1px solid #d9e3ff;background:#f5f8ff;border-radius:14px;padding:13px;font-size:10px;color:var(--muted);line-height:1.55}.cloud-onboarding{min-height:100vh;background:linear-gradient(145deg,#f4f7fb,#eef2ff);display:grid;place-items:center;padding:24px}.cloud-onboarding-card{width:min(760px,100%);background:#fff;border:1px solid var(--line);border-radius:24px;padding:32px;box-shadow:0 24px 70px rgba(33,50,85,.10)}
    @media(max-width:820px){.resident-app{display:block}.resident-sidebar{position:static;width:auto}.resident-main{padding:16px}.resident-grid{grid-template-columns:1fr}.resident-highlight{grid-column:auto}}
  `;
  document.head.appendChild(style);

  const first = n => (n || '').trim().split(/\s+/)[0] || 'Usuário';
  const initials2 = n => (n || 'U').trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()||'').join('');
  const errText = e => e?.message || 'Não foi possível concluir a operação.';
  const baseUrl = () => `${location.origin}${location.pathname}`;

  function authScreen(message='') {
    document.body.classList.add('auth-body');
    $('#app').innerHTML = `<div class="auth-page"><section class="auth-card"><div class="auth-brand"><div class="brand-mark">SG</div><div><strong>Gestão Condominial</strong><span>Portal de acesso</span></div></div><div class="eyebrow">Acesso seguro</div><h1>Entre na sua conta</h1><p class="muted">O sistema identifica automaticamente se o acesso é de síndico ou morador.</p>${message?`<div class="auth-message">${esc(message)}</div>`:''}<form id="cloud-login" class="auth-form"><div class="field"><label>E-mail</label><input name="email" type="email" required autocomplete="email"></div><div class="field"><label>Senha</label><input name="password" type="password" required minlength="6" autocomplete="current-password"></div><button class="btn btn-primary btn-lg" type="submit">Entrar</button></form><div class="auth-divider"><span>primeiro acesso como síndico?</span></div><button class="btn auth-secondary" id="cloud-signup-open">Criar conta de síndico</button><p class="auth-footnote">O cadastro de moradores será feito pelo síndico em uma próxima etapa.</p></section></div>`;
    $('#cloud-login').onsubmit = async e => {
      e.preventDefault(); const f = new FormData(e.target); const b=e.target.querySelector('button'); b.disabled=true;b.textContent='Entrando...';
      const {error}=await sb.auth.signInWithPassword({email:String(f.get('email')).trim(),password:String(f.get('password'))});
      if(error) return authScreen(errText(error));
      await bootstrap();
    };
    $('#cloud-signup-open').onclick = signupScreen;
  }

  function signupScreen(message='') {
    $('#app').innerHTML = `<div class="auth-page"><section class="auth-card"><button class="auth-back" id="cloud-login-back">← Voltar</button><div class="eyebrow">Conta administrativa</div><h1>Criar conta de síndico</h1><p class="muted">Depois do login você cadastra os condomínios que administra.</p>${message?`<div class="auth-message">${esc(message)}</div>`:''}<form id="cloud-signup" class="auth-form"><div class="field"><label>Nome completo</label><input name="name" required></div><div class="field"><label>E-mail</label><input name="email" type="email" required></div><div class="field"><label>Senha</label><input name="password" type="password" required minlength="6"></div><button class="btn btn-primary btn-lg" type="submit">Criar conta</button></form><p class="auth-footnote">Se a confirmação de e-mail estiver ativa, confirme o endereço recebido antes de entrar.</p></section></div>`;
    $('#cloud-login-back').onclick=()=>authScreen();
    $('#cloud-signup').onsubmit=async e=>{
      e.preventDefault(); const f=new FormData(e.target); const b=e.target.querySelector('button');b.disabled=true;b.textContent='Criando...';
      const name=String(f.get('name')).trim();
      const {data:r,error}=await sb.auth.signUp({email:String(f.get('email')).trim(),password:String(f.get('password')),options:{data:{full_name:name},emailRedirectTo:baseUrl()}});
      if(error)return signupScreen(errText(error));
      if(!r.session)return authScreen('Conta criada. Confirme seu e-mail e depois faça login.');
      await bootstrap();
    };
  }

  async function syncCloud() {
    const [{data:profile},{data:memberRows},{data:condos,error}] = await Promise.all([
      sb.from('profiles').select('id,full_name').eq('id',authUser.id).maybeSingle(),
      sb.from('condominium_members').select('condominium_id,role,unit_id,is_active').eq('user_id',authUser.id).eq('is_active',true),
      sb.from('condominiums').select('id,name,cnpj,address_line,city,state,phone,email,units_count,created_by,created_at').order('created_at',{ascending:true})
    ]);
    if(error) console.warn(error);
    memberships=memberRows||[];
    const ids=new Set(memberships.map(x=>x.condominium_id));
    const visible=(condos||[]).filter(c=>ids.has(c.id)||c.created_by===authUser.id);
    const name=profile?.full_name||authUser.user_metadata?.full_name||authUser.email?.split('@')[0]||'Usuário';
    data.user={name,initials:initials2(name)};
    data.condos=visible.map(c=>({id:c.id,name:c.name,address:[c.address_line,c.city,c.state].filter(Boolean).join(' • '),cnpj:c.cnpj||'',phone:c.phone||'',email:c.email||'',units:Number(c.units_count)||0,residents:0,status:'good',balance:0}));
    const allowed=new Set(data.condos.map(c=>c.id));
    data.maintenances=data.maintenances.filter(x=>allowed.has(x.condoId));
    data.tasks=data.tasks.filter(x=>allowed.has(x.condoId));
    data.calls=data.calls.filter(x=>allowed.has(x.condoId));
    data.documents=data.documents.filter(x=>allowed.has(x.condoId));
    data.timeline=data.timeline.filter(x=>allowed.has(x.condoId));
    data.folders=data.folders.filter(x=>allowed.has(x.condoId));
    data.files=data.files.filter(x=>allowed.has(x.condoId));
    mode=memberships.some(x=>x.role==='syndic')||visible.some(c=>(condos||[]).find(r=>r.id===c.id)?.created_by===authUser.id)||memberships.length===0?'syndic':'resident';
    data.onboardingComplete=data.condos.length>0;
    save(data);
  }

  async function createCloudCondo(values) {
    const {data:c,error}=await sb.from('condominiums').insert({name:values.name,address_line:values.address||null,cnpj:values.cnpj||null,phone:values.phone||null,email:values.email||null,units_count:Number(values.units)||0,created_by:authUser.id}).select().single();
    if(error) throw error;
    const {error:me}=await sb.from('condominium_members').insert({condominium_id:c.id,user_id:authUser.id,role:'syndic',created_by:authUser.id});
    if(me) throw me;
    const local={id:c.id,name:c.name,address:c.address_line||'',cnpj:c.cnpj||'',phone:c.phone||'',email:c.email||'',units:Number(c.units_count)||0,residents:Number(values.residents)||0,status:'good',balance:0};
    data.condos.push(local); data.folders.push({id:uid('folder'),condoId:c.id,parentId:null,name:'Documentos Gerais',createdAt:iso(new Date())}); data.onboardingComplete=true; save(data); return local;
  }

  function cloudOnboarding() {
    document.body.classList.remove('auth-body');
    $('#app').innerHTML=`<div class="cloud-onboarding"><section class="cloud-onboarding-card"><div class="eyebrow">Primeiro acesso</div><h1>Cadastre seu primeiro condomínio</h1><p class="muted">Depois disso o sistema sugere rotinas de manutenção e tarefas. Você continuará podendo criar tudo manualmente dentro do painel.</p><form id="cloud-condo" class="form-grid" style="margin-top:22px"><div class="field full"><label>Nome do condomínio</label><input name="name" required></div><div class="field full"><label>Endereço</label><input name="address" required></div><div class="field"><label>CNPJ</label><input name="cnpj"></div><div class="field"><label>Telefone</label><input name="phone"></div><div class="field"><label>Unidades</label><input name="units" type="number" min="0" value="0"></div><div class="field"><label>Moradores aproximados</label><input name="residents" type="number" min="0" value="0"></div><div class="field full"><label>E-mail administrativo</label><input name="email" type="email"></div><div class="field full"><button class="btn btn-primary btn-lg" type="submit">Criar condomínio →</button></div></form></section></div>`;
    $('#cloud-condo').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),b=e.target.querySelector('button');b.disabled=true;b.textContent='Criando...';try{const c=await createCloudCondo({name:f.get('name').trim(),address:f.get('address').trim(),cnpj:f.get('cnpj').trim(),phone:f.get('phone').trim(),units:f.get('units'),residents:f.get('residents'),email:f.get('email').trim()});window.openRecommendationModal(c.id)}catch(err){b.disabled=false;b.textContent='Criar condomínio →';flash(errText(err))}};
  }

  function residentScreen(){
    const c=data.condos[0];
    $('#app').innerHTML=`<div class="resident-app"><aside class="resident-sidebar"><div class="brand"><div class="brand-mark">SG</div><div><strong>Portal do Morador</strong><span>${esc(c?.name||'Condomínio')}</span></div></div><nav class="resident-nav"><a class="active">⌂ Início</a><a>📢 Comunicados</a><a>🎫 Meus chamados</a><a>📅 Calendário</a><a>📄 Documentos</a></nav><div class="sidebar-footer"><small>Morador</small><strong>${esc(data.user.name)}</strong><button class="cloud-logout" onclick="cloudLogout()">Sair</button></div></aside><main class="resident-main"><header class="resident-top"><div><div class="eyebrow">Meu condomínio</div><h1>Buenas, ${esc(first(data.user.name))} 👋</h1><p class="muted">${c?`${esc(c.name)} • ${esc(c.address)}`:'Seu usuário ainda não foi vinculado a um condomínio.'}</p></div><div class="avatar">${esc(data.user.initials)}</div></header>${c?`<section class="resident-grid"><article class="resident-card resident-highlight"><span>🏠</span><div><strong>${esc(c.name)}</strong><p>${c.units} unidades cadastradas</p></div></article><article class="resident-card"><span>📢</span><div><strong>Comunicados</strong><p>Avisos liberados pelo síndico.</p></div></article><article class="resident-card"><span>🎫</span><div><strong>Meus chamados</strong><p>Solicitações vinculadas à sua unidade.</p></div></article><article class="resident-card"><span>📅</span><div><strong>Calendário</strong><p>Eventos públicos do condomínio.</p></div></article></section><div class="resident-note">Dados administrativos e a base privada do condomínio não aparecem neste acesso.</div>`:''}</main></div>`;
  }

  window.cloudLogout=async()=>{await sb.auth.signOut();authUser=null;memberships=[];authScreen()};

  window.openCondoModal = function(){
    modal(`<div class="eyebrow">Novo condomínio</div><h2 style="margin-bottom:16px">Adicionar condomínio</h2><form id="cloud-modal-condo" class="form-grid"><div class="field full"><label>Nome</label><input name="name" required></div><div class="field full"><label>Endereço</label><input name="address" required></div><div class="field"><label>CNPJ</label><input name="cnpj"></div><div class="field"><label>Telefone</label><input name="phone"></div><div class="field"><label>Unidades</label><input name="units" type="number" min="0" value="0"></div><div class="field"><label>Moradores</label><input name="residents" type="number" min="0" value="0"></div><div class="field full"><label>E-mail administrativo</label><input name="email" type="email"></div><div class="field full"><button class="btn btn-primary" type="submit">Criar condomínio</button></div></form>`);
    $('#cloud-modal-condo').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),b=e.target.querySelector('button');b.disabled=true;b.textContent='Criando...';try{const c=await createCloudCondo({name:f.get('name').trim(),address:f.get('address').trim(),cnpj:f.get('cnpj').trim(),phone:f.get('phone').trim(),units:f.get('units'),residents:f.get('residents'),email:f.get('email').trim()});closeModal();window.openRecommendationModal(c.id)}catch(err){b.disabled=false;b.textContent='Criar condomínio';flash(errText(err))}};
  };

  route = function(){
    if(!authUser) return authScreen();
    if(mode==='resident') return residentScreen();
    if(!data.condos.length) return cloudOnboarding();
    document.body.classList.remove('auth-body','onboarding-body');
    const p=(location.hash||'#/').replace(/^#\//,'').split('/').filter(Boolean);
    if(!p.length)return dashboard(); if(p[0]==='condominios')return condosPage(); if(p[0]==='calendario')return calendarPage(); if(p[0]==='manutencoes')return maintenancesPage(); if(p[0]==='tarefas')return tasksPage(); if(p[0]==='chamados')return callsPage();
    if(p[0]==='condominio'){const id=p[1],sub=p[2];if(!sub)return condoOverview(id);if(sub==='calendario')return calendarPage(id);if(sub==='manutencoes')return maintenancesPage(id);if(sub==='tarefas')return tasksPage(id);if(sub==='chamados')return callsPage(id);if(sub==='documentos')return docsPage(id);if(sub==='historico')return historyPage(id);if(sub==='arquivos')return filesPage(id,p[3]||null)} dashboard();
  };
  window.addEventListener('hashchange', route);

  async function bootstrap(){
    const {data:{session}}=await sb.auth.getSession(); authUser=session?.user||null; if(!authUser)return authScreen(); await syncCloud(); route();
  }
  sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){authUser=null;authScreen()}else if(session?.user&&!authUser){setTimeout(bootstrap,0)}});
  bootstrap();
})();
