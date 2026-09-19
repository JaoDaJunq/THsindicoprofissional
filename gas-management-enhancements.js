(() => {
  'use strict';

  if (!window.supabase || typeof window.gasPage !== 'function') return;

  const client = window.supabase.createClient(
    'https://tckvzlizcqdxzgavjwie.supabase.co',
    'sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3'
  );

  const baseGasPage = window.gasPage;
  const safe = value => typeof esc === 'function'
    ? esc(value)
    : String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));

  function addYearsIso(value, years) {
    if (!value) return null;
    const date = new Date(value + 'T12:00:00');
    if (Number.isNaN(date.getTime())) return null;
    date.setFullYear(date.getFullYear() + Number(years || 0));
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }

  async function currentUser() {
    return (await client.auth.getSession()).data.session?.user || null;
  }

  async function unitsFor(cid) {
    const { data, error } = await client
      .from('units')
      .select('id,block_name,unit_number')
      .eq('condominium_id', cid)
      .order('block_name')
      .order('unit_number');
    if (error) {
      console.warn('[gas-management] units', error);
      return [];
    }
    return data || [];
  }

  function canManage(cid) {
    try {
      return Boolean(window.CondoAccess?.can?.('operations.manage', cid));
    } catch (_) {
      return false;
    }
  }

  async function openCreate(cid) {
    if (!canManage(cid)) return flash('Você não tem permissão para adicionar controles de gás.');
    const units = await unitsFor(cid);
    modal(`
      <div class="eyebrow">Controle de gás</div>
      <h2 style="margin-bottom:6px">Adicionar sala ou unidade</h2>
      <p class="muted" style="margin-bottom:16px">Cadastre apartamentos, salas comerciais ou outros pontos que tenham medidor e válvula próprios.</p>
      <form id="gas-create-form" class="form-grid">
        <div class="field full">
          <label>Identificação</label>
          <input name="label" required maxlength="80" placeholder="Ex.: Sala 101, Loja 02 ou Apto 303">
        </div>
        <div class="field full">
          <label>Vincular a uma unidade existente <span class="muted">(opcional)</span></label>
          <select name="unitId" id="gas-unit-link">
            <option value="">Sem vínculo, usar somente a identificação acima</option>
            ${units.map(unit => {
              const label = [unit.block_name, unit.unit_number].filter(Boolean).join(' / ');
              return `<option value="${safe(unit.id)}" data-label="${safe(label)}">${safe(label)}</option>`;
            }).join('')}
          </select>
        </div>
        <div class="field">
          <label>Última troca do medidor</label>
          <input name="meterLast" type="date">
        </div>
        <div class="field">
          <label>Próxima troca do medidor</label>
          <input name="meterNext" type="date">
        </div>
        <div class="field">
          <label>Última troca da válvula</label>
          <input name="valveLast" type="date">
        </div>
        <div class="field">
          <label>Próxima troca da válvula</label>
          <input name="valveNext" type="date">
        </div>
        <div class="field full">
          <label>Observações</label>
          <textarea name="notes" placeholder="Informações adicionais, localização do medidor, acesso..."></textarea>
        </div>
        <div class="field full">
          <button class="btn btn-primary" type="submit">Adicionar ao controle</button>
        </div>
      </form>
    `);

    const unitSelect = document.querySelector('#gas-unit-link');
    unitSelect?.addEventListener('change', () => {
      const option = unitSelect.selectedOptions?.[0];
      const label = option?.dataset?.label;
      const input = document.querySelector('#gas-create-form [name="label"]');
      if (label && input && !input.value.trim()) input.value = label;
    });

    document.querySelector('#gas-create-form')?.addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const fd = new FormData(form);
      const button = form.querySelector('button[type="submit"]');
      const user = await currentUser();
      if (!user) return flash('Sessão expirada.');

      const label = String(fd.get('label') || '').trim();
      if (!label) return flash('Informe a sala ou unidade.');

      const meterLast = fd.get('meterLast') || null;
      const valveLast = fd.get('valveLast') || null;
      const meterNext = fd.get('meterNext') || addYearsIso(meterLast, 10);
      const valveNext = fd.get('valveNext') || addYearsIso(valveLast, 5);
      const missing = [];
      if (!meterLast || !meterNext) missing.push('medidor');
      if (!valveLast || !valveNext) missing.push('válvula');

      const payload = {
        condominium_id: cid,
        unit_id: fd.get('unitId') || null,
        unit_label: label,
        meter_cycle_years: 10,
        meter_last_replaced_at: meterLast,
        meter_next_replacement_at: meterNext,
        valve_cycle_years: 5,
        valve_last_replaced_at: valveLast,
        valve_next_replacement_at: valveNext,
        notes: String(fd.get('notes') || '').trim() || null,
        source_label: 'Cadastro manual',
        is_incomplete: missing.length > 0,
        incomplete_reason: missing.length ? `Dados incompletos de ${missing.join(' e ')}.` : null,
        created_by: user.id
      };

      if (button) {
        button.disabled = true;
        button.textContent = 'Adicionando...';
      }
      const { error } = await client.from('gas_controls').insert(payload);
      if (error) {
        if (button) {
          button.disabled = false;
          button.textContent = 'Adicionar ao controle';
        }
        const duplicate = String(error.code || '') === '23505';
        return flash(duplicate ? 'Já existe um controle de gás com essa identificação.' : (error.message || 'Não foi possível adicionar.'));
      }

      closeModal();
      flash('Sala/unidade adicionada ao controle de gás.');
      await window.gasPage(cid);
    });
  }

  async function removeControl(id, cid, label='') {
    if (!canManage(cid)) return flash('Você não tem permissão para excluir controles de gás.');
    const confirmed = window.confirm(`Excluir ${label ? '"' + label + '"' : 'este controle'} da relação de gás?\n\nEssa ação remove o controle e seus eventos futuros vinculados.`);
    if (!confirmed) return;
    const { error } = await client.from('gas_controls').delete().eq('id', id).eq('condominium_id', cid);
    if (error) return flash(error.message || 'Não foi possível excluir.');
    flash('Controle de gás removido.');
    await window.gasPage(cid);
  }

  function enhance(cid) {
    if (!canManage(cid)) return;

    const topActions = document.querySelector('.topbar .top-actions');
    if (topActions && !topActions.querySelector('[data-add-gas-control]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-primary';
      button.dataset.addGasControl = 'true';
      button.textContent = '+ Sala / unidade';
      button.addEventListener('click', () => openCreate(cid));
      topActions.prepend(button);
    }

    document.querySelectorAll('.table tbody tr').forEach(row => {
      const edit = row.querySelector('button[onclick*="openGasEdit"]');
      if (!edit || row.querySelector('[data-delete-gas-control]')) return;
      const match = (edit.getAttribute('onclick') || '').match(/openGasEdit\('([^']+)'/);
      if (!match) return;
      const id = match[1];
      const label = row.querySelector('td strong')?.textContent?.trim() || '';
      const cell = edit.closest('td');
      if (!cell) return;
      const wrap = document.createElement('div');
      wrap.className = 'row-actions';
      edit.replaceWith(wrap);
      wrap.appendChild(edit);
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn btn-soft gas-delete-control';
      del.dataset.deleteGasControl = id;
      del.textContent = 'Excluir';
      del.addEventListener('click', () => removeControl(id, cid, label));
      wrap.appendChild(del);
    });
  }

  window.openGasCreate = openCreate;
  window.deleteGasControl = removeControl;

  window.gasPage = async function enhancedGasPage(cid) {
    await baseGasPage(cid);
    enhance(cid);
  };
})();