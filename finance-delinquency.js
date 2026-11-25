(() => {
  'use strict';

  if (!window.supabase || typeof shell !== 'function') return;

  const client = window.supabase.createClient(
    'https://tckvzlizcqdxzgavjwie.supabase.co',
    'sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3'
  );

  const BUCKET = 'condo-files';
  const safe = value => typeof esc === 'function' ? esc(value) : String(value ?? '');
  const rich = value => window.GCRichText?.render(value) ?? safe(value);
  const canReview = cid => Boolean(window.CondoAccess?.can('finance.review', cid));
  const canManage = cid => Boolean(window.CondoAccess?.can('finance.manage', cid));
  const brl = cents => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format((Number(cents) || 0) / 100);
  const cents = value => Math.round(Number(String(value || '0').replace(/\./g, '').replace(',', '.')) * 100);
  const date = value => value ? new Intl.DateTimeFormat('pt-BR').format(new Date(`${String(value).slice(0,10)}T12:00:00`)) : '—';
  const dateTime = value => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle:'short', timeStyle:'short' }).format(new Date(value)) : '—';
  const monthValue = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  };
  const todayValue = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const datetimeLocalNow = () => {
    const d = new Date();
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0,16);
  };
  const statusLabel = { pending:'Pendente', partial:'Parcial', paid:'Pago', cancelled:'Cancelado' };
  const channelLabel = { whatsapp:'WhatsApp', phone:'Ligação', email:'E-mail', in_person:'Presencial', other:'Outro' };

  const style = document.createElement('style');
  style.textContent = `
    .finance-delinquency-btn{border-color:#f0c1c5!important;color:#9d3340!important;background:#fff7f7!important}
    .finance-delinquency-btn:hover{border-color:#dc8f98!important;background:#fff0f1!important}
    .finance-delinquency-panel{margin-bottom:18px;border:1px solid #f0d5d8;background:linear-gradient(180deg,#fffafa,#fff)}
    .finance-delinquency-panel .panel-head{border-bottom-color:#f2e1e3}
    .finance-delinquency-total{color:#a23440}
    .finance-contact-list{display:grid;gap:9px;margin-top:10px}
    .finance-contact-item{padding:11px 12px;border:1px solid #e4e8ef;border-radius:11px;background:#fafbfc}
    .finance-contact-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px}
    .finance-contact-channel{font-size:9px;font-weight:850;text-transform:uppercase;letter-spacing:.04em;color:#59677d}
    .finance-contact-date{font-size:9px;color:#8a94a5;white-space:nowrap}
    .finance-contact-empty{padding:12px;border:1px dashed #dfe3ea;border-radius:10px;color:#7d8798;font-size:10px}
    .finance-delinquency-kpi{border-color:#f0d5d8!important;background:#fffafa!important}
    .finance-unit-hint{margin-top:5px;font-size:9px;color:#7c8799}
    @media(max-width:700px){
      .finance-contact-head{align-items:flex-start;flex-direction:column}
      .finance-contact-date{white-space:normal}
    }
  `;
  document.head.appendChild(style);

  async function currentUser() {
    return (await client.auth.getSession()).data.session?.user || null;
  }

  function computedStatus(t) {
    if (t.status === 'cancelled' || t.status === 'paid') return t.status;
    const now = new Date(); now.setHours(0,0,0,0);
    const due = new Date(`${t.due_date}T00:00:00`);
    if (due < now && Number(t.expected_amount_cents || 0) > Number(t.paid_amount_cents || 0)) return 'overdue';
    if (t.status === 'partial') return 'partial';
    return 'pending';
  }

  function statusBadge(t) {
    const status = computedStatus(t);
    const map = {
      paid:['good','Pago'],
      partial:['warn','Parcial'],
      cancelled:['attention','Cancelado'],
      overdue:['bad','Vencido'],
      pending:['attention','Pendente']
    };
    const [cls,label] = map[status] || ['attention',status];
    return `<span class="badge ${cls}">${safe(label)}</span>`;
  }

  function unitLabel(unit) {
    if (!unit) return '';
    return [unit.block_name ? `Bloco ${unit.block_name}` : '', unit.unit_number ? `Unidade ${unit.unit_number}` : '']
      .filter(Boolean).join(' • ');
  }

  async function loadUnits(cid) {
    const { data, error } = await client
      .from('units')
      .select('id,block_name,unit_number')
      .eq('condominium_id', cid)
      .order('block_name', { ascending:true, nullsFirst:true })
      .order('unit_number', { ascending:true });
    if (error) throw error;
    return data || [];
  }

  async function categories(cid, kind) {
    const { data, error } = await client
      .from('finance_categories')
      .select('id,name')
      .eq('condominium_id', cid)
      .eq('kind', kind)
      .eq('is_active', true)
      .order('sort_order')
      .order('name');
    if (error) throw error;
    return data || [];
  }

  async function ensureDelinquencyCategory(cid, user) {
    const cats = await categories(cid, 'income');
    const existing = cats.find(item => String(item.name || '').trim().toLowerCase() === 'inadimplência');
    if (existing) return existing;

    const { data, error } = await client
      .from('finance_categories')
      .insert({
        condominium_id: cid,
        kind: 'income',
        name: 'Inadimplência',
        is_active: true,
        sort_order: 15,
        created_by: user.id
      })
      .select('id,name')
      .single();
    if (error) throw error;
    return data;
  }

  async function loadPage(cid, month) {
    const first = `${month}-01`;
    const [year,monthNumber] = month.split('-').map(Number);
    const next = new Date(year, monthNumber, 1);
    const nextIso = `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}-01`;

    const [txRes, catRes, attRes, unitRes, delinquencyRes] = await Promise.all([
      client.from('finance_transactions').select('*').eq('condominium_id',cid).gte('competence_month',first).lt('competence_month',nextIso).order('due_date',{ascending:true}),
      client.from('finance_categories').select('*').eq('condominium_id',cid).eq('is_active',true).order('sort_order').order('name'),
      client.from('finance_transaction_files').select('transaction_id,file_entry_id').eq('condominium_id',cid),
      client.from('units').select('id,block_name,unit_number').eq('condominium_id',cid),
      client.from('finance_transactions').select('*').eq('condominium_id',cid).eq('is_delinquency',true).in('status',['pending','partial']).order('due_date',{ascending:true})
    ]);

    const error = txRes.error || catRes.error || attRes.error || unitRes.error || delinquencyRes.error;
    if (error) throw error;

    return {
      tx: txRes.data || [],
      cats: catRes.data || [],
      atts: attRes.data || [],
      units: unitRes.data || [],
      openDelinquencies: delinquencyRes.data || []
    };
  }

  function transactionActions(t, cid, month, manage) {
    const details = `<button class="btn btn-soft" onclick="openFinanceDetails('${t.id}','${cid}','${month}')">Detalhes</button>`;
    if (!manage || t.status === 'cancelled') return details;
    const edit = `<button class="btn btn-soft" onclick="openFinanceEditModal('${t.id}','${cid}','${month}')">Editar</button>`;
    const pay = t.status !== 'paid'
      ? `<button class="btn" onclick="openFinancePaymentModal('${t.id}','${cid}','${month}')">Baixar</button>`
      : '';
    return details + edit + pay;
  }

  function transactionRows(tx, cid, month, catMap, unitMap, attCount, manage) {
    if (!tx.length) return '<tr><td colspan="8"><div class="empty">Nenhum lançamento nesta competência.</div></td></tr>';
    return tx.map(t => {
      const unit = unitMap.get(t.unit_id);
      const unitText = t.reference_number || unitLabel(unit);
      const subtitle = t.is_delinquency
        ? [unitText, t.counterparty].filter(Boolean).join(' • ')
        : (t.counterparty || catMap.get(t.category_id) || '');
      const search = [t.description,t.counterparty,t.reference_number,catMap.get(t.category_id),unitText].filter(Boolean).join(' ').toLowerCase();
      const type = t.is_delinquency ? '<span class="badge bad">Inadimplência</span>' : (t.kind === 'income' ? 'Receita' : 'Despesa');
      return `<tr data-search="${safe(search)}">
        <td><strong>${safe(t.description)}</strong><div class="list-sub">${safe(subtitle)}</div></td>
        <td>${type}</td>
        <td>${safe(catMap.get(t.category_id) || 'Sem categoria')}</td>
        <td>${date(t.due_date)}</td>
        <td><strong>${brl(t.expected_amount_cents)}</strong>${t.paid_amount_cents ? `<div class="list-sub">Pago: ${brl(t.paid_amount_cents)}</div>` : ''}</td>
        <td>${statusBadge(t)}</td>
        <td>${attCount.get(t.id) || 0}</td>
        <td><div class="row-actions">${transactionActions(t,cid,month,manage)}</div></td>
      </tr>`;
    }).join('');
  }

  function delinquencyRows(items, cid, month, unitMap, manage) {
    if (!items.length) return '<tr><td colspan="7"><div class="empty">Nenhuma inadimplência em aberto.</div></td></tr>';
    return items.map(t => {
      const unitText = t.reference_number || unitLabel(unitMap.get(t.unit_id)) || 'Sem unidade';
      const remaining = Math.max(0, Number(t.expected_amount_cents || 0) - Number(t.paid_amount_cents || 0));
      return `<tr>
        <td><strong>${safe(unitText)}</strong><div class="list-sub">${safe(t.counterparty || 'Morador não informado')}</div></td>
        <td>${date(t.competence_month)}</td>
        <td>${date(t.due_date)}</td>
        <td><strong class="finance-delinquency-total">${brl(remaining)}</strong></td>
        <td>${statusBadge(t)}</td>
        <td>${safe(t.notes ? (window.GCRichText?.plainText(t.notes) || '').slice(0,80) : '—')}</td>
        <td><div class="row-actions">${transactionActions(t,cid,month,manage)}</div></td>
      </tr>`;
    }).join('');
  }

  async function page(cid, month=monthValue()) {
    const condoData = condo(cid);
    if (!condoData || !canReview(cid)) return;
    const manage = canManage(cid);
    const add = manage
      ? `<button class="btn finance-delinquency-btn" onclick="openFinanceDelinquencyModal('${cid}','${month}')">+ Inadimplência</button><button class="btn" onclick="openFinanceTransactionModal('${cid}','income')">+ Receita</button><button class="btn btn-primary" onclick="openFinanceTransactionModal('${cid}','expense')">+ Despesa</button>`
      : '';

    $('#app').innerHTML = shell(`${topbar('Financeiro',`${safe(condoData.name)} • receitas, despesas, inadimplência e vencimentos.`,'Gestão',add)}<article class="panel"><div class="panel-body"><div class="empty">Carregando financeiro...</div></div></article>`,'condo-finance',cid);

    try {
      const { tx, cats, atts, units, openDelinquencies } = await loadPage(cid, month);
      const catMap = new Map(cats.map(item => [item.id,item.name]));
      const unitMap = new Map(units.map(item => [item.id,item]));
      const attCount = new Map();
      atts.forEach(item => attCount.set(item.transaction_id, (attCount.get(item.transaction_id) || 0) + 1));

      const income = tx.filter(t => t.kind === 'income' && t.status !== 'cancelled').reduce((sum,t) => sum + Number(t.paid_amount_cents || 0), 0);
      const expense = tx.filter(t => t.kind === 'expense' && t.status !== 'cancelled').reduce((sum,t) => sum + Number(t.paid_amount_cents || 0), 0);
      const expectedIncome = tx.filter(t => t.kind === 'income' && t.status !== 'cancelled').reduce((sum,t) => sum + Number(t.expected_amount_cents || 0), 0);
      const expectedExpense = tx.filter(t => t.kind === 'expense' && t.status !== 'cancelled').reduce((sum,t) => sum + Number(t.expected_amount_cents || 0), 0);
      const delinquencyOpen = openDelinquencies.reduce((sum,t) => sum + Math.max(0,Number(t.expected_amount_cents || 0) - Number(t.paid_amount_cents || 0)), 0);
      const delinquencyUnits = new Set(openDelinquencies.map(t => t.unit_id || t.reference_number || t.id)).size;
      const overdueExpenses = tx
        .filter(t => t.kind === 'expense' && computedStatus(t) === 'overdue')
        .reduce((sum,t) => sum + Math.max(0,Number(t.expected_amount_cents || 0) - Number(t.paid_amount_cents || 0)), 0);

      const monthlyRows = transactionRows(tx,cid,month,catMap,unitMap,attCount,manage);
      const delinquencyTable = delinquencyRows(openDelinquencies,cid,month,unitMap,manage);

      $('#app').innerHTML = shell(`
        ${topbar('Financeiro',`${safe(condoData.name)} • receitas, despesas, inadimplência e vencimentos.`,'Gestão',add)}
        <section class="metrics" style="margin-bottom:18px">
          <article class="metric"><div class="metric-top"><div><span>Recebido</span><strong>${brl(income)}</strong><small>Previsto ${brl(expectedIncome)}</small></div><div class="icon green">↗</div></div></article>
          <article class="metric"><div class="metric-top"><div><span>Pago</span><strong>${brl(expense)}</strong><small>Previsto ${brl(expectedExpense)}</small></div><div class="icon orange">↘</div></div></article>
          <article class="metric"><div class="metric-top"><div><span>Saldo realizado</span><strong>${brl(income-expense)}</strong></div><div class="icon blue">$</div></div></article>
          <article class="metric finance-delinquency-kpi"><div class="metric-top"><div><span>Inadimplência</span><strong class="finance-delinquency-total">${brl(delinquencyOpen)}</strong><small>${delinquencyUnits} unidade${delinquencyUnits === 1 ? '' : 's'} em aberto</small></div><div class="icon red">!</div></div></article>
          <article class="metric"><div class="metric-top"><div><span>Contas vencidas</span><strong>${brl(overdueExpenses)}</strong><small>Despesas do condomínio</small></div><div class="icon orange">↓</div></div></article>
        </section>

        <article class="panel finance-delinquency-panel">
          <div class="panel-head"><div><h2>Inadimplência em aberto</h2><div class="muted small">Cobranças pendentes de qualquer competência, com histórico de contatos.</div></div></div>
          <div class="panel-body"><div class="table-wrap"><table class="table">
            <thead><tr><th>Unidade / morador</th><th>Competência</th><th>Vencimento</th><th>Saldo devido</th><th>Status</th><th>Observação</th><th>Ações</th></tr></thead>
            <tbody>${delinquencyTable}</tbody>
          </table></div></div>
        </article>

        <article class="panel">
          <div class="panel-head">
            <div><h2>Lançamentos</h2><div class="muted small">Competência, vencimento, pagamento e comprovantes no mesmo lugar.</div></div>
            <div class="row-actions"><input id="finance-month" type="month" value="${safe(month)}"><input id="finance-search" placeholder="Buscar..." style="max-width:220px"></div>
          </div>
          <div class="panel-body"><div class="table-wrap"><table class="table">
            <thead><tr><th>Lançamento</th><th>Tipo</th><th>Categoria</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Arquivos</th><th>Ações</th></tr></thead>
            <tbody id="finance-tbody">${monthlyRows}</tbody>
          </table></div></div>
        </article>
      `,'condo-finance',cid);

      $('#finance-month').onchange = event => page(cid,event.target.value || monthValue());
      $('#finance-search').oninput = event => {
        const query = event.target.value.trim().toLowerCase();
        $$('#finance-tbody tr').forEach(row => row.style.display = !query || String(row.dataset.search || '').includes(query) ? '' : 'none');
      };
    } catch (err) {
      flash(err.message || 'Não foi possível carregar o financeiro.');
    }
  }

  window.openFinanceDelinquencyModal = async function(cid, month=monthValue()) {
    if (!canManage(cid)) return flash('Somente o síndico pode registrar inadimplência.');
    const user = await currentUser();
    if (!user) return flash('Sessão expirada.');

    let units, category;
    try {
      [units, category] = await Promise.all([loadUnits(cid), ensureDelinquencyCategory(cid,user)]);
    } catch (err) {
      return flash(err.message || 'Não foi possível preparar a inadimplência.');
    }

    const options = units.map(unit => `<option value="${unit.id}" data-label="${safe(unitLabel(unit))}">${safe(unitLabel(unit))}</option>`).join('');
    modal(`
      <div class="eyebrow">Financeiro</div>
      <h2 style="margin-bottom:6px">Nova inadimplência</h2>
      <p class="muted small" style="margin-bottom:16px">Registrada como receita a receber, sem inflar as despesas do condomínio.</p>
      <form id="finance-delinquency-form" class="form-grid">
        <div class="field"><label>Unidade cadastrada</label><select name="unitId"><option value="">Sem vínculo / informar manualmente</option>${options}</select></div>
        <div class="field"><label>Apartamento / unidade</label><input name="unitRef" required placeholder="Ex.: Apto 302"></div>
        <div class="field full"><label>Morador / responsável</label><input name="resident" required placeholder="Nome da pessoa responsável"></div>
        <div class="field"><label>Competência</label><input type="month" name="competence" value="${safe(month)}" required></div>
        <div class="field"><label>Vencimento</label><input type="date" name="due" value="${todayValue()}" required></div>
        <div class="field full"><label>Valor devido</label><input name="amount" inputmode="decimal" required placeholder="0,00"></div>
        <div class="field full"><label>Observações iniciais</label><textarea name="notes" data-rich-text placeholder="Contexto da dívida, acordo anterior ou informação relevante"></textarea></div>
        <div class="field full"><button class="btn btn-primary" type="submit">Registrar inadimplência</button></div>
      </form>
    `);

    const form = $('#finance-delinquency-form');
    const unitSelect = form.querySelector('[name="unitId"]');
    const unitRef = form.querySelector('[name="unitRef"]');
    unitSelect.onchange = () => {
      const selected = units.find(item => String(item.id) === String(unitSelect.value));
      if (selected) unitRef.value = unitLabel(selected);
    };

    form.onsubmit = async event => {
      event.preventDefault();
      const values = new FormData(form);
      const amount = cents(values.get('amount'));
      if (!Number.isFinite(amount) || amount <= 0) return flash('Informe um valor válido.');
      const ref = String(values.get('unitRef') || '').trim();
      const resident = String(values.get('resident') || '').trim();
      if (!ref || !resident) return flash('Informe a unidade e o morador.');

      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      button.textContent = 'Salvando...';

      const payload = {
        condominium_id: cid,
        kind: 'income',
        category_id: category.id,
        description: `Inadimplência - ${ref}`,
        counterparty: resident,
        reference_number: ref,
        competence_month: `${values.get('competence')}-01`,
        issue_date: todayValue(),
        due_date: values.get('due'),
        expected_amount_cents: amount,
        paid_amount_cents: 0,
        status: 'pending',
        paid_date: null,
        notes: String(values.get('notes') || '').trim() || null,
        unit_id: values.get('unitId') || null,
        is_delinquency: true,
        created_by: user.id,
        updated_by: user.id
      };

      const { error } = await client.from('finance_transactions').insert(payload);
      if (error) {
        button.disabled = false;
        button.textContent = 'Registrar inadimplência';
        return flash(error.message || 'Não foi possível registrar a inadimplência.');
      }

      closeModal();
      flash('Inadimplência registrada.');
      page(cid,String(values.get('competence')));
    };
  };

  window.openFinanceEditModal = async function(id,cid,month=monthValue()) {
    if (!canManage(cid)) return flash('Somente o síndico pode editar o financeiro.');

    const [{data:t,error}, cats, units] = await Promise.all([
      client.from('finance_transactions').select('*').eq('id',id).eq('condominium_id',cid).single(),
      categories(cid,'income').catch(() => []),
      loadUnits(cid).catch(() => [])
    ]);
    if (error || !t) return flash(error?.message || 'Lançamento não encontrado.');

    const correctCats = t.kind === 'income' ? cats : await categories(cid,'expense');
    const unitOptions = units.map(unit => `<option value="${unit.id}" ${String(unit.id)===String(t.unit_id||'')?'selected':''}>${safe(unitLabel(unit))}</option>`).join('');
    const catOptions = correctCats.map(item => `<option value="${item.id}" ${String(item.id)===String(t.category_id||'')?'selected':''}>${safe(item.name)}</option>`).join('');
    const amount = String((Number(t.expected_amount_cents || 0)/100).toFixed(2)).replace('.',',');
    const competence = String(t.competence_month || '').slice(0,7);
    const unitRef = t.reference_number || unitLabel(units.find(unit => String(unit.id) === String(t.unit_id))) || '';

    const specificFields = t.is_delinquency ? `
      <div class="field"><label>Unidade cadastrada</label><select name="unitId"><option value="">Sem vínculo</option>${unitOptions}</select></div>
      <div class="field"><label>Apartamento / unidade</label><input name="reference" required value="${safe(unitRef)}"></div>
      <div class="field full"><label>Morador / responsável</label><input name="counterparty" required value="${safe(t.counterparty || '')}"></div>
      <input type="hidden" name="category" value="${safe(t.category_id || '')}">
    ` : `
      <div class="field"><label>Categoria</label><select name="category"><option value="">Sem categoria</option>${catOptions}</select></div>
      <div class="field"><label>${t.kind === 'income' ? 'Pagador / origem' : 'Fornecedor / favorecido'}</label><input name="counterparty" value="${safe(t.counterparty || '')}"></div>
      <div class="field full"><label>Referência</label><input name="reference" value="${safe(t.reference_number || '')}"></div>
    `;

    modal(`
      <div class="eyebrow">Editar financeiro</div>
      <h2 style="margin-bottom:6px">${safe(t.is_delinquency ? 'Inadimplência' : t.description)}</h2>
      <p class="muted small" style="margin-bottom:16px">${t.is_delinquency ? 'Atualize morador, unidade, valor ou observações sem perder o histórico de contatos.' : 'Atualize os dados do lançamento.'}</p>
      <form id="finance-edit-form" class="form-grid">
        ${t.is_delinquency ? '' : `<div class="field full"><label>Descrição</label><input name="description" required value="${safe(t.description)}"></div>`}
        ${specificFields}
        <div class="field"><label>Competência</label><input type="month" name="competence" value="${safe(competence)}" required></div>
        <div class="field"><label>Emissão</label><input type="date" name="issue" value="${safe(String(t.issue_date || '').slice(0,10))}"></div>
        <div class="field"><label>Vencimento</label><input type="date" name="due" value="${safe(String(t.due_date || '').slice(0,10))}" required></div>
        <div class="field"><label>Valor previsto</label><input name="amount" inputmode="decimal" value="${safe(amount)}" required></div>
        <div class="field full"><label>Observações</label><textarea name="notes" data-rich-text placeholder="Observações, acordos ou contexto">${safe(t.notes || '')}</textarea></div>
        <div class="field full"><button class="btn btn-primary" type="submit">Salvar alterações</button></div>
      </form>
    `);

    const form = $('#finance-edit-form');
    if (t.is_delinquency) {
      const select = form.querySelector('[name="unitId"]');
      const reference = form.querySelector('[name="reference"]');
      select.onchange = () => {
        const selected = units.find(item => String(item.id) === String(select.value));
        if (selected) reference.value = unitLabel(selected);
      };
    }

    form.onsubmit = async event => {
      event.preventDefault();
      const values = new FormData(form);
      const user = await currentUser();
      if (!user) return flash('Sessão expirada.');

      const expected = cents(values.get('amount'));
      const paid = Number(t.paid_amount_cents || 0);
      if (!Number.isFinite(expected) || expected <= 0) return flash('Informe um valor válido.');
      if (expected < paid) return flash(`O valor previsto não pode ser menor que o valor já baixado (${brl(paid)}).`);

      let status = t.status;
      let paidDate = t.paid_date;
      if (status !== 'cancelled') {
        if (paid === 0) { status = 'pending'; paidDate = null; }
        else if (paid === expected) status = 'paid';
        else status = 'partial';
      }

      const reference = String(values.get('reference') || '').trim() || null;
      const counterparty = String(values.get('counterparty') || '').trim() || null;
      const description = t.is_delinquency
        ? `Inadimplência - ${reference || 'unidade'}`
        : String(values.get('description') || '').trim();

      const payload = {
        category_id: values.get('category') || null,
        description,
        counterparty,
        reference_number: reference,
        competence_month: `${values.get('competence')}-01`,
        issue_date: values.get('issue') || null,
        due_date: values.get('due'),
        expected_amount_cents: expected,
        status,
        paid_date: paidDate,
        notes: String(values.get('notes') || '').trim() || null,
        updated_by: user.id
      };
      if (t.is_delinquency) payload.unit_id = values.get('unitId') || null;

      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      button.textContent = 'Salvando...';

      const { error:updateError } = await client
        .from('finance_transactions')
        .update(payload)
        .eq('id',id)
        .eq('condominium_id',cid);

      if (updateError) {
        button.disabled = false;
        button.textContent = 'Salvar alterações';
        return flash(updateError.message || 'Não foi possível editar o lançamento.');
      }

      closeModal();
      flash('Lançamento atualizado.');
      page(cid,String(values.get('competence')));
    };
  };

  window.openFinanceContactModal = async function(id,cid,month=monthValue()) {
    if (!canManage(cid)) return flash('Somente o síndico pode registrar contatos.');
    const { data:t, error } = await client
      .from('finance_transactions')
      .select('id,description,counterparty,is_delinquency')
      .eq('id',id)
      .eq('condominium_id',cid)
      .single();
    if (error || !t?.is_delinquency) return flash(error?.message || 'Inadimplência não encontrada.');

    modal(`
      <div class="eyebrow">Cobrança</div>
      <h2 style="margin-bottom:6px">Registrar contato</h2>
      <p class="muted small" style="margin-bottom:16px">${safe(t.counterparty || t.description)}</p>
      <form id="finance-contact-form" class="form-grid">
        <div class="field"><label>Data e horário</label><input type="datetime-local" name="contactAt" value="${datetimeLocalNow()}" required></div>
        <div class="field"><label>Canal</label><select name="channel"><option value="whatsapp">WhatsApp</option><option value="phone">Ligação</option><option value="email">E-mail</option><option value="in_person">Presencial</option><option value="other">Outro</option></select></div>
        <div class="field full"><label>Registro do contato</label><textarea name="note" data-rich-text required placeholder="Ex.: Morador informou que fará o pagamento na sexta-feira."></textarea></div>
        <div class="field full"><button class="btn btn-primary" type="submit">Salvar contato</button></div>
      </form>
    `);

    const form = $('#finance-contact-form');
    form.onsubmit = async event => {
      event.preventDefault();
      const values = new FormData(form);
      const user = await currentUser();
      if (!user) return flash('Sessão expirada.');
      const note = String(values.get('note') || '').trim();
      if (!window.GCRichText?.plainText(note) && !note) return flash('Registre o que aconteceu no contato.');

      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      button.textContent = 'Salvando...';

      const { error:insertError } = await client.from('finance_collection_contacts').insert({
        condominium_id: cid,
        transaction_id: id,
        contact_at: new Date(String(values.get('contactAt'))).toISOString(),
        channel: values.get('channel'),
        note,
        created_by: user.id
      });

      if (insertError) {
        button.disabled = false;
        button.textContent = 'Salvar contato';
        return flash(insertError.message || 'Não foi possível registrar o contato.');
      }

      closeModal();
      flash('Contato registrado no histórico.');
      window.openFinanceDetails(id,cid,month);
    };
  };

  window.openFinanceDetails = async function(id,cid,month=monthValue()) {
    const { data:t, error:txError } = await client
      .from('finance_transactions')
      .select('*')
      .eq('id',id)
      .eq('condominium_id',cid)
      .single();
    if (txError || !t) return flash(txError?.message || 'Lançamento não encontrado.');

    const [linksRes, contactsRes, unitRes] = await Promise.all([
      client.from('finance_transaction_files').select('file_entry_id').eq('transaction_id',id).order('created_at'),
      t.is_delinquency
        ? client.from('finance_collection_contacts').select('id,contact_at,channel,note,created_by').eq('transaction_id',id).eq('condominium_id',cid).order('contact_at',{ascending:false})
        : Promise.resolve({data:[],error:null}),
      t.unit_id
        ? client.from('units').select('id,block_name,unit_number').eq('id',t.unit_id).maybeSingle()
        : Promise.resolve({data:null,error:null})
    ]);

    const firstError = linksRes.error || contactsRes.error || unitRes.error;
    if (firstError) return flash(firstError.message);

    const ids = (linksRes.data || []).map(item => item.file_entry_id);
    let files = [];
    if (ids.length) {
      const { data, error } = await client.from('file_entries').select('id,name,storage_path').in('id',ids);
      if (error) return flash(error.message);
      files = data || [];
    }

    const fileHtml = files.length
      ? files.map(file => `<button class="btn btn-soft" onclick="openFinanceFile('${file.id}')">📎 ${safe(file.name)}</button>`).join(' ')
      : '<span class="muted small">Nenhum arquivo anexado.</span>';

    const contacts = contactsRes.data || [];
    const contactHtml = contacts.length
      ? `<div class="finance-contact-list">${contacts.map(contact => `<div class="finance-contact-item"><div class="finance-contact-head"><span class="finance-contact-channel">${safe(channelLabel[contact.channel] || contact.channel)}</span><span class="finance-contact-date">${dateTime(contact.contact_at)}</span></div><div class="gc-rich-output">${rich(contact.note)}</div></div>`).join('')}</div>`
      : '<div class="finance-contact-empty">Nenhum contato registrado ainda.</div>';

    const unitText = t.reference_number || unitLabel(unitRes.data) || '—';
    const remaining = Math.max(0,Number(t.expected_amount_cents || 0) - Number(t.paid_amount_cents || 0));
    const type = t.is_delinquency ? 'Inadimplência' : (t.kind === 'income' ? 'Receita' : 'Despesa');

    const delinquencyDetails = t.is_delinquency ? `
      <div class="kpi-strip" style="margin:16px 0">
        <div class="kpi-pill"><strong>${safe(unitText)}</strong><span>Unidade</span></div>
        <div class="kpi-pill"><strong>${safe(t.counterparty || '—')}</strong><span>Morador</span></div>
        <div class="kpi-pill"><strong class="finance-delinquency-total">${brl(remaining)}</strong><span>Saldo devido</span></div>
      </div>
      <div style="margin-top:18px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap"><strong>Histórico de contatos</strong>${canManage(cid) ? `<button class="btn btn-soft" onclick="openFinanceContactModal('${id}','${cid}','${month}')">+ Registrar contato</button>` : ''}</div>
        ${contactHtml}
      </div>
    ` : `
      <div class="kpi-strip" style="margin:16px 0">
        <div class="kpi-pill"><strong>${brl(t.expected_amount_cents)}</strong><span>Previsto</span></div>
        <div class="kpi-pill"><strong>${brl(t.paid_amount_cents)}</strong><span>Realizado</span></div>
        <div class="kpi-pill"><strong>${safe(t.counterparty || '—')}</strong><span>Fornecedor / origem</span></div>
      </div>
    `;

    modal(`
      <div class="eyebrow">Financeiro</div>
      <h2>${safe(t.description)}</h2>
      <p class="muted">${safe(type)} • ${date(t.due_date)} • ${statusBadge(t)}</p>
      ${delinquencyDetails}
      ${t.notes ? `<div style="margin-top:16px"><strong>Observações</strong><div class="gc-rich-output" style="margin-top:7px">${rich(t.notes)}</div></div>` : ''}
      <div style="margin-top:16px"><strong>Arquivos</strong><div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">${fileHtml}</div></div>
      ${canManage(cid) && t.status !== 'cancelled' ? `<div style="margin-top:18px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-soft" onclick="openFinanceEditModal('${id}','${cid}','${month}')">Editar</button>${t.status !== 'paid' ? `<button class="btn" onclick="openFinancePaymentModal('${id}','${cid}','${month}')">Baixar</button>` : ''}<button class="btn" onclick="addFinanceAttachment('${id}','${cid}','${month}')">+ Anexar arquivo</button><button class="btn btn-soft" onclick="cancelFinanceTransaction('${id}','${cid}','${month}')">Cancelar lançamento</button></div>` : ''}
    `);
  };

  window.financePage = page;
})();