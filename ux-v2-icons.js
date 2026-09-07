(() => {
  'use strict';

  let scheduled = false;

  function keyFor(label='') {
    const value = String(label).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    if (/condominio|unidade/.test(value)) return 'condos';
    if (/chamado/.test(value)) return 'calls';
    if (/manutenc/.test(value)) return 'maintenance';
    if (/document/.test(value)) return 'documents';
    if (/assembleia/.test(value)) return 'assemblies';
    if (/tarefa/.test(value)) return 'tasks';
    if (/saldo|recebid|pago|atraso|finance|receita|despesa/.test(value)) return 'finance';
    if (/notifica|alerta/.test(value)) return 'notifications';
    return '';
  }

  function enhanceMetric(metric) {
    const icons = window.GCNavigation?.icons;
    if (!icons || metric.dataset.uxMetricIcon === 'true') return;
    const label = metric.querySelector('.metric-top span')?.textContent || '';
    const key = keyFor(label);
    const target = metric.querySelector('.metric-top .icon');
    if (!key || !target || !icons[key]) return;
    target.innerHTML = icons[key];
    target.classList.add('ux-metric-icon');
    target.dataset.iconKey = key;
    metric.dataset.uxMetricIcon = 'true';
  }

  function enhanceCompactIcons() {
    document.querySelectorAll('.metric').forEach(enhanceMetric);
  }

  function refresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      enhanceCompactIcons();
    });
  }

  const observer = new MutationObserver(refresh);
  function start() {
    refresh();
    observer.observe(document.getElementById('app') || document.body,{childList:true,subtree:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();