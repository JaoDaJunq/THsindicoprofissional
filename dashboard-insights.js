(() => {
  'use strict';

  let scheduled = false;

  const routePath = () => (location.hash || '#/').replace(/^#\//, '').split('?')[0];
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();

  function metrics() {
    return [...document.querySelectorAll('.metrics .metric')].map(metric => {
      const label = clean(metric.querySelector('.metric-top span')?.textContent);
      const value = clean(metric.querySelector('.metric-top strong')?.textContent);
      const small = clean(metric.querySelector('.metric-top small')?.textContent);
      return { metric, label, value, small };
    });
  }

  function numeric(text) {
    const match = clean(text).match(/-?\d+(?:[.,]\d+)?/);
    if (!match) return 0;
    return Number(match[0].replace(',', '.')) || 0;
  }

  function money(text) {
    const raw = clean(text).replace(/[^0-9,.-]/g, '');
    if (!raw) return 0;
    const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
    return Number(normalized) || 0;
  }

  function byLabel(items, needle) {
    const target = needle.toLowerCase();
    return items.find(item => item.label.toLowerCase().includes(target));
  }

  function pulseMarkup(items) {
    const max = Math.max(1, ...items.map(item => Math.max(0, item.number)));
    return items.map(item => {
      const percent = item.number <= 0 ? 0 : Math.max(8, Math.round((item.number / max) * 100));
      const tag = item.href ? 'a' : 'div';
      const href = item.href ? ` href="${item.href}"` : '';
      return `<${tag} class="pulse-row"${href} data-tone="${item.tone || 'default'}"><div class="pulse-meta"><strong>${item.label}</strong><span>${item.caption || 'Indicador atual'}</span></div><div class="pulse-track"><div class="pulse-fill" style="--pulse:${percent}%"></div></div><div class="pulse-value">${item.display}</div></${tag}>`;
    }).join('');
  }

  function actionMarkup(actions) {
    return actions.map(action => `<a class="quick-action" href="${action.href}"><span class="quick-action-icon" aria-hidden="true">${action.icon}</span><strong>${action.label}</strong></a>`).join('');
  }

  function insertAfterMetrics(html, marker) {
    const metricsNode = document.querySelector('.metrics');
    if (!metricsNode || document.querySelector(`[data-dashboard-insight="${marker}"]`)) return;
    const host = document.createElement('div');
    host.dataset.dashboardInsight = marker;
    host.innerHTML = html;
    metricsNode.insertAdjacentElement('afterend', host);
  }

  function enhanceGeneralDashboard() {
    if (routePath() !== '' || !document.querySelector('.metrics')) return;
    const data = metrics();
    const calls = byLabel(data, 'chamados abertos');
    const maint = byLabel(data, 'manutenções em 7 dias');
    const docs = byLabel(data, 'documentos em 30 dias');
    const assemblies = byLabel(data, 'assembleias futuras');

    const pulse = [
      calls && { label:'Chamados abertos', display:calls.value, number:numeric(calls.value), caption:'Demandas aguardando resolução', href:'#/chamados', tone:numeric(calls.value) ? 'warning' : 'success' },
      maint && { label:'Manutenções próximas', display:maint.value, number:numeric(maint.value), caption:maint.small || 'Próximos 7 dias', href:'#/manutencoes', tone:numeric(maint.small) ? 'danger' : 'default' },
      docs && { label:'Documentos próximos', display:docs.value, number:numeric(docs.value), caption:'Vencimento em até 30 dias', tone:numeric(docs.value) ? 'warning' : 'success' },
      assemblies && { label:'Assembleias futuras', display:assemblies.value, number:numeric(assemblies.value), caption:'Programadas no calendário', tone:'default' }
    ].filter(Boolean);

    if (!pulse.length) return;

    insertAfterMetrics(`<section class="dashboard-insight-strip"><article class="insight-card"><div class="insight-head"><span class="insight-kicker">Pulso operacional</span><h2>O que merece atenção agora</h2><p>Comparação relativa entre os principais volumes da operação, usando os indicadores atuais.</p></div><div class="pulse-list">${pulseMarkup(pulse)}</div></article><article class="insight-card insight-card--soft"><div class="insight-head"><span class="insight-kicker">Acesso rápido</span><h2>Ir direto ao trabalho</h2><p>Atalhos para as áreas mais usadas no dia a dia.</p></div><div class="quick-action-grid">${actionMarkup([
      {label:'Condomínios',href:'#/condominios',icon:'▦'},
      {label:'Manutenções',href:'#/manutencoes',icon:'⚒'},
      {label:'Chamados',href:'#/chamados',icon:'◉'},
      {label:'Calendário',href:'#/calendario',icon:'◫'}
    ])}</div></article></section>`, 'general');
  }

  function enhanceCondoOverview() {
    const match = routePath().match(/^condominio\/([^/]+)$/);
    if (!match || !document.querySelector('.metrics')) return;
    const cid = match[1];
    const data = metrics();
    const calls = byLabel(data, 'chamados abertos');
    const maint = byLabel(data, 'manutenções em 7 dias');
    const docs = byLabel(data, 'documentos em 30 dias');
    const units = byLabel(data, 'unidades');
    const finance = byLabel(data, 'saldo realizado');

    const pulse = [
      calls && { label:'Chamados', display:calls.value, number:numeric(calls.value), caption:calls.small || 'Abertos agora', href:`#/condominio/${cid}/chamados`, tone:numeric(calls.small) ? 'danger' : (numeric(calls.value) ? 'warning' : 'success') },
      maint && { label:'Manutenções', display:maint.value, number:numeric(maint.value), caption:'Próximos 7 dias', href:`#/condominio/${cid}/manutencoes`, tone:numeric(maint.value) ? 'warning' : 'success' },
      docs && { label:'Documentos', display:docs.value, number:numeric(docs.value), caption:'Próximos 30 dias', href:`#/condominio/${cid}/documentos`, tone:numeric(docs.value) ? 'warning' : 'success' },
      units && { label:'Unidades', display:units.value, number:numeric(units.value), caption:'Base cadastrada', tone:'default' }
    ].filter(Boolean);

    const actions = [
      {label:'Manutenções',href:`#/condominio/${cid}/manutencoes`,icon:'⚒'},
      {label:'Chamados',href:`#/condominio/${cid}/chamados`,icon:'◉'},
      {label:'Documentos',href:`#/condominio/${cid}/documentos`,icon:'▤'},
      {label:'Calendário',href:`#/condominio/${cid}/calendario`,icon:'◫'}
    ];
    if (window.CondoAccess?.can('finance.review', cid)) actions[3] = {label:'Financeiro',href:`#/condominio/${cid}/financeiro`,icon:'$'};

    insertAfterMetrics(`<section class="dashboard-insight-strip"><article class="insight-card"><div class="insight-head"><span class="insight-kicker">Saúde operacional</span><h2>Resumo do condomínio</h2><p>Os principais volumes do Workspace em uma leitura rápida.</p></div><div class="pulse-list">${pulseMarkup(pulse)}</div></article><article class="insight-card insight-card--soft"><div class="insight-head"><span class="insight-kicker">Atalhos do Workspace</span><h2>Continuar a operação</h2><p>${finance ? `Saldo realizado atual: ${finance.value}.` : 'Acesse rapidamente as rotinas deste condomínio.'}</p></div><div class="quick-action-grid">${actionMarkup(actions)}</div></article></section>`, 'condo');
  }

  function expectedFromSmall(item) {
    if (!item?.small) return 0;
    const match = item.small.match(/Previsto\s+(.+)$/i);
    return match ? money(match[1]) : 0;
  }

  function financeProgress(label, actual, expected, kind) {
    const denominator = Math.max(expected, actual, 1);
    const percent = Math.max(0, Math.min(100, Math.round((actual / denominator) * 100)));
    const expectedText = expected > 0 ? `de ${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(expected)}` : 'realizado no período';
    return `<div class="finance-progress-row" data-kind="${kind}"><div class="finance-progress-head"><strong>${label}</strong><span>${expectedText}</span></div><div class="finance-progress-track"><div class="finance-progress-fill" style="--progress:${percent}%"></div></div></div>`;
  }

  function enhanceFinance() {
    const path = routePath();
    const isGlobal = path === 'financeiro';
    const condoMatch = path.match(/^condominio\/([^/]+)\/financeiro$/);
    if ((!isGlobal && !condoMatch) || !document.querySelector('.metrics')) return;
    const data = metrics();
    const income = byLabel(data, 'recebido');
    const expense = byLabel(data, 'pago');
    const balance = byLabel(data, 'saldo realizado');
    const overdue = byLabel(data, 'em atraso');
    if (!income || !expense || !balance || !overdue) return;

    const received = money(income.value);
    const paid = money(expense.value);
    const overdueValue = money(overdue.value);
    const expectedIncome = expectedFromSmall(income);
    const expectedExpense = expectedFromSmall(expense);
    const maxFlow = Math.max(received, paid, overdueValue, 1);

    const progress = isGlobal
      ? [
          financeProgress('Receitas realizadas', received, maxFlow, 'income'),
          financeProgress('Despesas realizadas', paid, maxFlow, 'expense'),
          financeProgress('Valor em atraso', overdueValue, maxFlow, 'overdue')
        ].join('')
      : [
          financeProgress('Receitas realizadas', received, expectedIncome || received, 'income'),
          financeProgress('Despesas realizadas', paid, expectedExpense || paid, 'expense'),
          financeProgress('Valor em atraso', overdueValue, Math.max(overdueValue, expectedIncome, expectedExpense, 1), 'overdue')
        ].join('');

    insertAfterMetrics(`<section class="finance-insight-grid"><article class="finance-flow-card"><div class="finance-flow-head"><div><span class="insight-kicker">Fluxo financeiro</span><h2>${isGlobal ? 'Movimento consolidado' : 'Execução da competência'}</h2><p>${isGlobal ? 'Comparação relativa entre entradas, saídas e valores vencidos.' : 'Realizado em relação aos valores previstos quando disponíveis.'}</p></div><div class="finance-flow-balance">${balance.value}<small>saldo realizado</small></div></div><div class="finance-progress-list">${progress}</div></article><aside class="finance-summary-card"><span>Leitura rápida</span><strong>${overdue.value}</strong><p>${overdueValue > 0 ? 'em atraso e pedindo acompanhamento.' : 'em atraso. Nenhuma pendência financeira vencida nesta visão.'}</p></aside></section>`, isGlobal ? 'finance-global' : 'finance-condo');
  }

  function refresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      enhanceGeneralDashboard();
      enhanceCondoOverview();
      enhanceFinance();
    });
  }

  const observer = new MutationObserver(refresh);

  function start() {
    refresh();
    observer.observe(document.getElementById('app') || document.body, { childList:true, subtree:true });
    window.addEventListener('hashchange', refresh, { passive:true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();