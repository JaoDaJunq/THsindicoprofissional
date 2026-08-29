(() => {
  'use strict';

  const previousRoute = typeof route === 'function' ? route : null;
  if (!previousRoute) return;

  const path = () => (location.hash || '#/').replace(/^#\//,'').split('?')[0].split('/').filter(Boolean);
  const params = () => { const raw=(location.hash||'').split('?')[1]||''; const p=new URLSearchParams(raw); return {start:p.get('start')||null,end:p.get('end')||null}; };

  route = function(){
    const p = path();
    const rp=params();

    if (p[0] === 'auditoria' && typeof window.auditPage === 'function') return window.auditPage();
    if (p[0] === 'relatorios' && typeof window.managementReportsPage === 'function') return window.managementReportsPage(null,rp.start||undefined,rp.end||undefined);
    if (p[0] === 'integracoes' && typeof window.integrationsPage === 'function') return window.integrationsPage();
    if (p[0] === 'notificacoes' && typeof window.notificationsPage === 'function') return window.notificationsPage();
    if (p[0] === 'financeiro' && typeof window.financeConsolidatedPage === 'function') return window.financeConsolidatedPage();

    if (p[0] === 'condominio') {
      const cid = p[1];
      const sub = p[2];

      if (sub === 'auditoria' && typeof window.auditPage === 'function') return window.auditPage(cid);
      if (sub === 'relatorios' && typeof window.managementReportsPage === 'function') return window.managementReportsPage(cid,rp.start||undefined,rp.end||undefined);
      if (sub === 'gas' && typeof window.gasPage === 'function') return window.gasPage(cid);
      if (sub === 'comunicados' && typeof window.adminAnnouncementsPage === 'function') return window.adminAnnouncementsPage(cid);
      if (sub === 'assembleias') {
        if (p[3] && typeof window.assemblyVotingWorkspace === 'function') return window.assemblyVotingWorkspace(p[3], cid);
        if (typeof window.assemblyVotingPage === 'function') return window.assemblyVotingPage(cid);
        if (typeof window.assembliesPage === 'function') return window.assembliesPage(cid);
      }
      if (sub === 'moradores' && typeof window.residentsPage === 'function') return window.residentsPage(cid);
      if (sub === 'financeiro' && typeof window.financePage === 'function') return window.financePage(cid);
    }

    if (p[0] === 'morador' && p[1] === 'assemblies' && typeof window.residentAssembliesPage === 'function') return window.residentAssembliesPage();
    if (p[0] === 'morador' && typeof window.renderResidentPortal === 'function') return window.renderResidentPortal(p[1] || 'home');

    return previousRoute();
  };

  const active = window.__GC_ACTIVE_HASH_LISTENER__;
  if (active && active !== route) window.removeEventListener('hashchange', active);
  window.addEventListener('hashchange', route);
  window.__GC_ACTIVE_HASH_LISTENER__ = route;

  setTimeout(() => {
    try { route(); } catch (err) { console.error('Final router', err); }
  }, 0);
})();