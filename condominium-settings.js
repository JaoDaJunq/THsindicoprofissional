(() => {
  'use strict';
  if (!window.supabase || typeof condoOverview !== 'function') return;

  const client = window.supabase.createClient(
    'https://tckvzlizcqdxzgavjwie.supabase.co',
    'sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3'
  );
  const originalOverview = condoOverview;
  const text = v => String(v ?? '');
  const nullable = v => String(v ?? '').trim() || null;
  const canManage = cid => Boolean(window.CondoAccess?.can('condo.manage', cid));

  condoOverview = function(cid) {
    const result = originalOverview(cid);
    Promise.resolve().then(() => {
      if (!canManage(cid)) return;
      const actions = document.querySelector('.topbar .top-actions');
      if (!actions || actions.querySelector('[data-condo-settings]')) return;
      const button = document.createElement('button');
      button.className = 'btn btn-soft';
      button.dataset.condoSettings = 'true';
      button.textContent = '⚙ Configurações';
      button.onclick = () => window.openCondoSettings(cid);
      actions.insertBefore(button, actions.firstChild);
    });
    return result;
  };

  window.openCondoSettings = async function(cid) {
    await window.CondoAccess?.refresh();
    if (!canManage(cid)) return flash('Você não tem permissão para alterar este condomínio.');

    const [{ data: row, error }, { count, error: countError }] = await Promise.all([
      client.from('condominiums')
        .select('id,name,cnpj,address_line,city,state,postal_code,phone,email,units_count')
        .eq('id', cid).single(),
      client.from('units').select('id', { count: 'exact', head: true }).eq('condominium_id', cid)
    ]);
    if (error || countError) return flash((error || countError).message || 'Erro ao carregar condomínio.');

    const registered = Number(count) || 0;
    const countNote = registered === Number(row.units_count)
      ? `${registered} unidades cadastradas.`
      : `${row.units_count} unidades informadas e ${registered} cadastradas. Os números são mantidos separados para não alterar dados existentes.`;

    modal(`<div class="eyebrow">Configurações</div><h2 style="margin-bottom:6px">${esc(row.name)}</h2><p class="muted" style="margin-bottom:16px">${esc(countNote)}</p><form id="condo-settings-form" class="form-grid"><div class="field full"><label>Nome do condomínio</label><input name="name" required value="${esc(text(row.name))}"></div><div class="field full"><label>Endereço</label><input name="address_line" value="${esc(text(row.address_line))}"></div><div class="field"><label>Cidade</label><input name="city" value="${esc(text(row.city))}"></div><div class="field"><label>Estado</label><input name="state" maxlength="2" value="${esc(text(row.state))}"></div><div class="field"><label>CEP</label><input name="postal_code" value="${esc(text(row.postal_code))}"></div><div class="field"><label>CNPJ</label><input name="cnpj" value="${esc(text(row.cnpj))}"></div><div class="field"><label>Telefone</label><input name="phone" value="${esc(text(row.phone))}"></div><div class="field"><label>E-mail</label><input name="email" type="email" value="${esc(text(row.email))}"></div><div class="field"><label>Unidades informadas</label><input name="units_count" type="number" min="0" value="${Number(row.units_count) || 0}"></div><div class="field"><label>Unidades cadastradas</label><input value="${registered}" disabled></div><div class="field full"><button class="btn btn-primary" type="submit">Salvar alterações</button></div></form>`);

    $('#condo-settings-form').onsubmit = async event => {
      event.preventDefault();
      if (!canManage(cid)) return flash('Você não tem permissão para alterar este condomínio.');
      const form = new FormData(event.target);
      const button = event.target.querySelector('button');
      button.disabled = true;
      button.textContent = 'Salvando...';
      const payload = {
        name: String(form.get('name') || '').trim(),
        address_line: nullable(form.get('address_line')),
        city: nullable(form.get('city')),
        state: nullable(form.get('state'))?.toUpperCase().slice(0, 2) || null,
        postal_code: nullable(form.get('postal_code')),
        cnpj: nullable(form.get('cnpj')),
        phone: nullable(form.get('phone')),
        email: nullable(form.get('email')),
        units_count: Math.max(0, Number(form.get('units_count')) || 0)
      };
      const { data: updated, error: updateError } = await client.from('condominiums')
        .update(payload).eq('id', cid)
        .select('id,name,cnpj,address_line,city,state,phone,email,units_count').single();
      if (updateError) {
        button.disabled = false;
        button.textContent = 'Salvar alterações';
        return flash(updateError.message || 'Erro ao salvar alterações.');
      }
      const local = data?.condos?.find(c => c.id === cid);
      if (local) {
        local.name = updated.name;
        local.cnpj = updated.cnpj || '';
        local.phone = updated.phone || '';
        local.email = updated.email || '';
        local.units = Number(updated.units_count) || 0;
        local.address = [updated.address_line, updated.city, updated.state].filter(Boolean).join(' • ');
        if (typeof save === 'function') save(data);
      }
      closeModal();
      flash('Dados do condomínio atualizados.');
      condoOverview(cid);
    };
  };
})();
