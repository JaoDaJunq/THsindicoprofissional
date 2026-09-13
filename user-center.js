(() => {
  'use strict';

  const SUPABASE_URL = 'https://tckvzlizcqdxzgavjwie.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3';
  if (!window.supabase) return;
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  const roleLabels = { syndic: 'Síndico', staff: 'Equipe', council: 'Conselho', resident: 'Morador' };
  const initials = value => String(value || 'U').trim().split(/\s+/).slice(0,2).map(part => part[0]?.toUpperCase() || '').join('') || 'U';
  const escHtml = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[ch]));
  const notify = message => typeof window.flash === 'function' ? window.flash(message) : window.alert(message);

  async function getContext() {
    const { data: sessionData } = await sb.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return null;

    const [{ data: profile }, { data: memberships }, { data: condos }, { data: prefs }] = await Promise.all([
      sb.from('profiles').select('id,full_name,phone,avatar_url').eq('id', user.id).maybeSingle(),
      sb.from('condominium_members').select('condominium_id,role,is_active').eq('user_id', user.id).eq('is_active', true),
      sb.from('condominiums').select('id,name').order('name'),
      sb.from('push_preferences').select('enabled,maintenance,task,document_expiry,assembly,gas,overdue,announcement').eq('user_id', user.id).maybeSingle()
    ]);

    const memberRows = memberships || [];
    const condoMap = new Map((condos || []).map(item => [item.id, item.name]));
    return { user, profile: profile || {}, memberships: memberRows, condoMap, prefs };
  }

  function avatarMarkup(ctx, size='large') {
    const name = ctx.profile.full_name || ctx.user.user_metadata?.full_name || ctx.user.email || 'Usuário';
    const url = ctx.profile.avatar_url || ctx.user.user_metadata?.avatar_url || '';
    return url
      ? `<img class="uc-avatar uc-avatar--${size}" src="${escHtml(url)}" alt="Foto de ${escHtml(name)}">`
      : `<div class="uc-avatar uc-avatar--${size} uc-avatar--fallback" aria-label="Avatar de ${escHtml(name)}">${escHtml(initials(name))}</div>`;
  }

  function membershipsMarkup(ctx) {
    if (!ctx.memberships.length) return '<div class="uc-empty">Nenhum vínculo ativo encontrado.</div>';
    return ctx.memberships.map(item => `
      <article class="uc-membership">
        <div>
          <strong>${escHtml(ctx.condoMap.get(item.condominium_id) || 'Condomínio')}</strong>
          <span>${escHtml(roleLabels[item.role] || item.role)}</span>
        </div>
        <a class="btn btn-sm" href="#/condominio/${encodeURIComponent(item.condominium_id)}">Abrir</a>
      </article>
    `).join('');
  }

  function prefChecked(value, fallback=true) {
    return (value ?? fallback) ? 'checked' : '';
  }

  function renderPage(ctx) {
    const name = ctx.profile.full_name || ctx.user.user_metadata?.full_name || ctx.user.email?.split('@')[0] || 'Usuário';
    const provider = ctx.user.app_metadata?.provider === 'google' ? 'Google' : 'E-mail e senha';
    const prefs = ctx.prefs || {};

    const page = `
      <div class="uc-page">
        <section class="uc-hero panel">
          <div class="uc-identity">
            <div class="uc-avatar-wrap">
              ${avatarMarkup(ctx)}
              <label class="uc-avatar-action" for="uc-avatar-input" title="Alterar foto" tabindex="0">✎</label>
              <input id="uc-avatar-input" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp">
            </div>
            <div>
              <div class="eyebrow">MINHA CONTA</div>
              <h1>${escHtml(name)}</h1>
              <p>${escHtml(ctx.user.email || '')}</p>
              <div class="uc-chips">
                <span>${escHtml(provider)}</span>
                <span>${ctx.memberships.length} vínculo${ctx.memberships.length === 1 ? '' : 's'}</span>
              </div>
            </div>
          </div>
          <button class="btn" id="uc-signout">Sair da conta</button>
        </section>

        <div class="uc-grid">
          <section class="panel uc-section">
            <div class="panel-head"><div><div class="eyebrow">PERFIL</div><h2>Seus dados</h2><p class="muted small">Essas informações aparecem na sua conta e nos registros do sistema.</p></div></div>
            <form id="uc-profile-form" class="uc-form">
              <div class="field"><label for="uc-name">Nome completo</label><input id="uc-name" name="name" value="${escHtml(name)}" required maxlength="120"></div>
              <div class="field"><label for="uc-phone">Telefone</label><input id="uc-phone" name="phone" value="${escHtml(ctx.profile.phone || '')}" autocomplete="tel" placeholder="(51) 99999-9999"></div>
              <div class="field"><label>E-mail</label><input value="${escHtml(ctx.user.email || '')}" disabled><small>O e-mail é gerenciado pelo seu método de acesso.</small></div>
              <button class="btn btn-primary" type="submit">Salvar perfil</button>
            </form>
          </section>

          <section class="panel uc-section">
            <div class="panel-head"><div><div class="eyebrow">ACESSOS</div><h2>Condomínios e função</h2><p class="muted small">Somente vínculos ativos aparecem aqui.</p></div></div>
            <div class="uc-memberships">${membershipsMarkup(ctx)}</div>
          </section>

          <section class="panel uc-section">
            <div class="panel-head"><div><div class="eyebrow">NOTIFICAÇÕES</div><h2>Preferências</h2><p class="muted small">Escolha quais alertas operacionais podem gerar notificações push.</p></div></div>
            <form id="uc-prefs-form" class="uc-pref-list">
              <label class="uc-pref"><span><strong>Notificações push</strong><small>Chave geral deste dispositivo/usuário.</small></span><input type="checkbox" name="enabled" ${prefChecked(prefs.enabled)}></label>
              <label class="uc-pref"><span><strong>Manutenções</strong><small>Vencimentos e lembretes de manutenção.</small></span><input type="checkbox" name="maintenance" ${prefChecked(prefs.maintenance)}></label>
              <label class="uc-pref"><span><strong>Tarefas</strong><small>Prazos e tarefas atrasadas.</small></span><input type="checkbox" name="task" ${prefChecked(prefs.task)}></label>
              <label class="uc-pref"><span><strong>Documentos</strong><small>Documentos próximos do vencimento.</small></span><input type="checkbox" name="document_expiry" ${prefChecked(prefs.document_expiry)}></label>
              <label class="uc-pref"><span><strong>Assembleias</strong><small>Chamadas e atualizações de assembleia.</small></span><input type="checkbox" name="assembly" ${prefChecked(prefs.assembly)}></label>
              <label class="uc-pref"><span><strong>Gás</strong><small>Alertas relacionados aos controles de gás.</small></span><input type="checkbox" name="gas" ${prefChecked(prefs.gas)}></label>
              <label class="uc-pref"><span><strong>Atrasos</strong><small>Itens que passaram do prazo.</small></span><input type="checkbox" name="overdue" ${prefChecked(prefs.overdue)}></label>
              <label class="uc-pref"><span><strong>Comunicados</strong><small>Novos comunicados importantes.</small></span><input type="checkbox" name="announcement" ${prefChecked(prefs.announcement)}></label>
              <button class="btn btn-primary" type="submit">Salvar preferências</button>
            </form>
          </section>

          <section class="panel uc-section">
            <div class="panel-head"><div><div class="eyebrow">SEGURANÇA</div><h2>Acesso e sessão</h2><p class="muted small">Defina uma nova senha ou encerre todas as sessões abertas.</p></div></div>
            <form id="uc-password-form" class="uc-form uc-password-form">
              <div class="field"><label for="uc-password">Nova senha</label><input id="uc-password" name="password" type="password" autocomplete="new-password" minlength="8" required placeholder="Mínimo de 8 caracteres"></div>
              <div class="field"><label for="uc-password-confirm">Confirmar nova senha</label><input id="uc-password-confirm" name="confirm" type="password" autocomplete="new-password" minlength="8" required></div>
              <button class="btn" type="submit">Atualizar senha</button>
            </form>
            <div class="uc-security-actions">
              <button class="btn btn-danger-outline" id="uc-signout-all" type="button">Sair de todos os dispositivos</button>
            </div>
            <p class="uc-security-note">Ao trocar a senha, seu login atual continua ativo. O botão acima encerra todas as sessões da conta.</p>
          </section>
        </div>
      </div>
    `;

    if (typeof window.shell === 'function') {
      document.querySelector('#app').innerHTML = window.shell(page, 'profile');
    } else {
      document.querySelector('#app').innerHTML = page;
    }
    bindEvents(ctx);
  }

  async function saveProfile(ctx, form) {
    const values = new FormData(form);
    const fullName = String(values.get('name') || '').trim();
    const phone = String(values.get('phone') || '').trim();
    if (!fullName) return notify('Informe seu nome.');

    const { error } = await sb.from('profiles').update({ full_name: fullName, phone: phone || null, updated_at: new Date().toISOString() }).eq('id', ctx.user.id);
    if (error) return notify(`Não foi possível salvar: ${error.message}`);
    const { error: authError } = await sb.auth.updateUser({ data: { ...ctx.user.user_metadata, full_name: fullName } });
    if (authError) console.warn('[user-center] metadata', authError);
    document.querySelectorAll('.sidebar-footer strong').forEach(node => { node.textContent = fullName; });
    notify('Perfil atualizado.');
    await userCenterPage();
  }

  async function savePreferences(ctx, form) {
    const fd = new FormData(form);
    const bool = name => fd.get(name) === 'on';
    const payload = {
      user_id: ctx.user.id,
      enabled: bool('enabled'),
      maintenance: bool('maintenance'),
      task: bool('task'),
      document_expiry: bool('document_expiry'),
      assembly: bool('assembly'),
      gas: bool('gas'),
      overdue: bool('overdue'),
      announcement: bool('announcement'),
      updated_at: new Date().toISOString()
    };
    const { error } = await sb.from('push_preferences').upsert(payload, { onConflict: 'user_id' });
    if (error) return notify(`Não foi possível salvar as preferências: ${error.message}`);
    notify('Preferências atualizadas.');
  }

  async function uploadAvatar(ctx, file) {
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) return notify('Use JPG, PNG ou WebP.');
    if (file.size > 3 * 1024 * 1024) return notify('A foto precisa ter no máximo 3 MB.');
    const ext = ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'})[file.type];
    const path = `${ctx.user.id}/avatar.${ext}`;
    const { error: uploadError } = await sb.storage.from('profile-avatars').upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' });
    if (uploadError) return notify(`Não foi possível enviar a foto: ${uploadError.message}`);
    const { data: publicData } = sb.storage.from('profile-avatars').getPublicUrl(path);
    const avatarUrl = `${publicData.publicUrl}?v=${Date.now()}`;
    const { error } = await sb.from('profiles').update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() }).eq('id', ctx.user.id);
    if (error) return notify(`A foto foi enviada, mas o perfil não atualizou: ${error.message}`);
    const { error: authError } = await sb.auth.updateUser({ data: { ...ctx.user.user_metadata, avatar_url: avatarUrl } });
    if (authError) console.warn('[user-center] avatar metadata', authError);
    notify('Foto de perfil atualizada.');
    await userCenterPage();
  }

  async function updatePassword(form) {
    const fd = new FormData(form);
    const password = String(fd.get('password') || '');
    const confirm = String(fd.get('confirm') || '');
    if (password.length < 8) return notify('Use uma senha com pelo menos 8 caracteres.');
    if (password !== confirm) return notify('As senhas não conferem.');
    const button = form.querySelector('button[type="submit"]');
    if (button) { button.disabled = true; button.textContent = 'Atualizando...'; }
    const { error } = await sb.auth.updateUser({ password });
    if (button) { button.disabled = false; button.textContent = 'Atualizar senha'; }
    if (error) return notify(`Não foi possível atualizar a senha: ${error.message}`);
    form.reset();
    notify('Senha atualizada com sucesso.');
  }

  async function signOutAll() {
    const ok = window.confirm('Sair desta conta em todos os dispositivos?');
    if (!ok) return;
    const { error } = await sb.auth.signOut({ scope: 'global' });
    if (error) return notify(`Não foi possível encerrar as sessões: ${error.message}`);
    location.hash = '#/';
    location.reload();
  }

  function bindEvents(ctx) {
    document.querySelector('#uc-profile-form')?.addEventListener('submit', event => { event.preventDefault(); saveProfile(ctx, event.currentTarget); });
    document.querySelector('#uc-prefs-form')?.addEventListener('submit', event => { event.preventDefault(); savePreferences(ctx, event.currentTarget); });
    document.querySelector('#uc-password-form')?.addEventListener('submit', event => { event.preventDefault(); updatePassword(event.currentTarget); });
    document.querySelector('#uc-avatar-input')?.addEventListener('change', event => uploadAvatar(ctx, event.target.files?.[0]));
    document.querySelector('.uc-avatar-action')?.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        document.querySelector('#uc-avatar-input')?.click();
      }
    });
    document.querySelector('#uc-signout-all')?.addEventListener('click', signOutAll);
    document.querySelector('#uc-signout')?.addEventListener('click', async () => {
      await sb.auth.signOut();
      location.hash = '#/';
      location.reload();
    });
  }

  async function userCenterPage() {
    const ctx = await getContext();
    if (!ctx) {
      location.hash = '#/';
      return;
    }
    renderPage(ctx);
  }

  window.userCenterPage = userCenterPage;

  function enhanceAccountEntry() {
    document.querySelectorAll('.sidebar-footer').forEach(footer => {
      if (footer.querySelector('.uc-account-link')) return;
      const link = document.createElement('a');
      link.className = 'uc-account-link';
      link.href = '#/conta';
      link.innerHTML = '<span aria-hidden="true">◉</span><span>Minha conta</span>';
      const logout = footer.querySelector('.cloud-logout');
      if (logout) footer.insertBefore(link, logout);
      else footer.appendChild(link);
    });
  }

  const observer = new MutationObserver(() => enhanceAccountEntry());
  function start() {
    enhanceAccountEntry();
    observer.observe(document.body, { subtree: true, childList: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();