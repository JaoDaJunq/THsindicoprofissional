(() => {
  'use strict';
  if (!window.supabase || typeof shell !== 'function') return;

  const client = window.supabase.createClient(
    'https://tckvzlizcqdxzgavjwie.supabase.co',
    'sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3'
  );

  const safe = s => typeof esc === 'function' ? esc(s) : String(s ?? '');
  const fmt = v => v ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v)) : 'Sem data';
  const priorityLabel = { low: 'Baixa', normal: 'Normal', high: 'Alta', urgent: 'Urgente' };
  const visibilityLabel = { residents: 'Moradores', management: 'Gestão', all: 'Todos' };
  const canManage = cid => Boolean(window.CondoAccess?.can('communications.manage', cid));

  function statusOf(a) {
    const now = Date.now();
    const published = new Date(a.published_at).getTime();
    const expires = a.expires_at ? new Date(a.expires_at).getTime() : null;
    if (expires && expires <= now) return { label: 'Encerrado', cls: 'bad' };
    if (published > now) return { label: 'Agendado', cls: 'warn' };
    return { label: 'Publicado', cls: 'good' };
  }

  async function page(cid) {
    const c = condo(cid);
    if (!c) return;
    const manage = canManage(cid);
    const action = manage ? `<button class="btn btn-primary" onclick="openCommunicationModal('${cid}')">+ Novo comunicado</button>` : '';
    $('#app').innerHTML = shell(`${topbar('Comunicados', `${safe(c.name)} • comunicação com moradores e gestão.`, 'Workspace', action)}<article class="panel"><div class="panel-body"><div class="empty">Carregando comunicados...</div></div></article>`, 'condo-announcements', cid);

    const { data: rows, error } = await client.from('announcements').select('*').eq('condominium_id', cid).order('published_at', { ascending: false });
    if (error) return flash(error.message || 'Não foi possível carregar os comunicados.');

    const list = rows || [];
    const now = Date.now();
    const active = list.filter(x => new Date(x.published_at).getTime() <= now && (!x.expires_at || new Date(x.expires_at).getTime() > now)).length;
    const scheduled = list.filter(x => new Date(x.published_at).getTime() > now).length;
    const urgent = list.filter(x => x.priority === 'urgent' && (!x.expires_at || new Date(x.expires_at).getTime() > now)).length;

    const cards = list.length ? list.map(x => {
      const st = statusOf(x);
      const future = new Date(x.published_at).getTime() > now;
      return `<article class="card" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;gap:14px;align-items:flex-start"><div style="min-width:0;flex:1"><div class="eyebrow">${future ? `Agendado para ${fmt(x.published_at)}` : fmt(x.published_at)}</div><h3 style="margin:5px 0">${safe(x.title)}</h3><p>${safe(x.body)}</p><div class="list-sub" style="margin-top:8px">Audiência: ${safe(visibilityLabel[x.visibility] || x.visibility)}${x.expires_at ? ` • Expira ${fmt(x.expires_at)}` : ''}</div></div><div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap;justify-content:flex-end"><span class="badge ${x.priority === 'urgent' ? 'bad' : x.priority === 'high' ? 'warn' : 'good'}">${safe(priorityLabel[x.priority] || x.priority)}</span><span class="badge ${st.cls}">${st.label}</span>${manage && st.label !== 'Encerrado' ? `<button class="btn btn-soft" onclick="endCommunication('${x.id}','${cid}')">Encerrar</button>` : ''}</div></div></article>`;
    }).join('') : '<div class="empty">Nenhum comunicado cadastrado.</div>';

    $('#app').innerHTML = shell(`${topbar('Comunicados', `${safe(c.name)} • comunicação com moradores e gestão.`, 'Workspace', action)}<section class="metrics" style="margin-bottom:18px"><article class="metric"><div class="metric-top"><div><span>Ativos</span><strong>${active}</strong></div><div class="icon blue">📢</div></div></article><article class="metric"><div class="metric-top"><div><span>Agendados</span><strong>${scheduled}</strong></div><div class="icon green">◫</div></div></article><article class="metric"><div class="metric-top"><div><span>Urgentes</span><strong>${urgent}</strong></div><div class="icon orange">!</div></div></article></section><article class="panel"><div class="panel-head"><div><h2>Publicações</h2><div class="muted small">Comunicados podem ser direcionados a moradores, gestão ou todos. A publicação futura fica invisível até o horário agendado.</div></div></div><div class="panel-body">${cards}</div></article>`, 'condo-announcements', cid);
  }

  window.openCommunicationModal = function(cid) {
    if (!canManage(cid)) return flash('Você não tem permissão para publicar comunicados.');
    const local = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16);
    modal(`<div class="eyebrow">Novo comunicado</div><h2 style="margin-bottom:16px">Criar comunicação</h2><form id="communication-form" class="form-grid"><div class="field full"><label>Título</label><input name="title" required></div><div class="field"><label>Audiência</label><select name="visibility"><option value="residents">Moradores</option><option value="management">Gestão</option><option value="all">Todos</option></select></div><div class="field"><label>Prioridade</label><select name="priority"><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option><option value="low">Baixa</option></select></div><div class="field"><label>Publicar em</label><input type="datetime-local" name="publishedAt" value="${local}" required></div><div class="field"><label>Expirar em</label><input type="datetime-local" name="expiresAt"></div><div class="field full"><label>Mensagem</label><textarea name="body" required></textarea></div><div class="field full"><button class="btn btn-primary">Salvar comunicado</button></div></form>`);

    $('#communication-form').onsubmit = async event => {
      event.preventDefault();
      const f = new FormData(event.target);
      const button = event.target.querySelector('button');
      const user = (await client.auth.getSession()).data.session?.user;
      if (!user) return flash('Sessão expirada.');
      const publishedAt = new Date(String(f.get('publishedAt'))).toISOString();
      const expiresRaw = String(f.get('expiresAt') || '');
      const expiresAt = expiresRaw ? new Date(expiresRaw).toISOString() : null;
      if (expiresAt && new Date(expiresAt) <= new Date(publishedAt)) return flash('A expiração precisa ser posterior à publicação.');
      button.disabled = true;
      button.textContent = 'Salvando...';
      const { error } = await client.from('announcements').insert({
        condominium_id: cid,
        title: String(f.get('title') || '').trim(),
        body: String(f.get('body') || '').trim(),
        priority: String(f.get('priority') || 'normal'),
        visibility: String(f.get('visibility') || 'residents'),
        published_at: publishedAt,
        expires_at: expiresAt,
        created_by: user.id
      });
      if (error) {
        button.disabled = false;
        button.textContent = 'Salvar comunicado';
        return flash(error.message || 'Não foi possível salvar o comunicado.');
      }
      closeModal();
      flash(new Date(publishedAt) > new Date() ? 'Comunicado agendado.' : 'Comunicado publicado.');
      page(cid);
    };
  };

  window.endCommunication = async function(id, cid) {
    if (!canManage(cid)) return;
    if (!confirm('Encerrar este comunicado agora?')) return;
    const { error } = await client.from('announcements').update({ expires_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id).eq('condominium_id', cid);
    if (error) return flash(error.message || 'Não foi possível encerrar o comunicado.');
    flash('Comunicado encerrado.');
    page(cid);
  };

  const previousIntegrations = window.integrationsPage;
  if (typeof previousIntegrations === 'function') {
    window.integrationsPage = async function() {
      await previousIntegrations();
      const form = document.querySelector('#push-pref-form');
      if (!form) return;
      const user = (await client.auth.getSession()).data.session?.user;
      if (!user) return;
      const { data: pref } = await client.from('push_preferences').select('*').eq('user_id', user.id).maybeSingle();
      if (!form.querySelector('input[name="announcement"]')) {
        const buttonWrap = form.querySelector('.field.full');
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" name="announcement" ${pref?.announcement !== false ? 'checked' : ''}> Comunicados`;
        form.insertBefore(label, buttonWrap || null);
      }
      form.onsubmit = async event => {
        event.preventDefault();
        const fd = new FormData(form);
        const keys = ['maintenance','task','document_expiry','assembly','gas','announcement','overdue'];
        const payload = { user_id: user.id, enabled: true };
        keys.forEach(k => payload[k] = fd.has(k));
        const { error } = await client.from('push_preferences').upsert(payload, { onConflict: 'user_id' });
        if (error) return flash(error.message || 'Não foi possível salvar as preferências.');
        flash('Preferências salvas.');
      };
    };
  }

  window.adminAnnouncementsPage = page;
  window.openAnnouncementModal = window.openCommunicationModal;
})();
