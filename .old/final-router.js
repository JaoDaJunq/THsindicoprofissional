(() => {
  'use strict';

  const previousRoute = typeof route === 'function' ? route : null;
  if (!previousRoute) return;

  const path = () => (location.hash || '#/').replace(/^#\//,'').split('/').filter(Boolean);

  route = function(){
    const p = path();

    if (p[0] === 'integracoes' && typeof window.integrationsPage === 'function') {
      return window.integrationsPage();
    }
    if (p[0] === 'notificacoes' && typeof window.notificationsPage === 'function') {
      return window.notificationsPage();
    }

    if (p[0] === 'condominio') {
      const cid = p[1];
      const sub = p[2];

      if (sub === 'gas' && typeof window.gasPage === 'function') {
        return window.gasPage(cid);
      }
      if (sub === 'comunicados' && typeof window.adminAnnouncementsPage === 'function') {
        return window.adminAnnouncementsPage(cid);
      }
      if (sub === 'assembleias' && typeof window.assembliesPage === 'function') {
        return window.assembliesPage(cid);
      }
      if (sub === 'moradores' && typeof window.residentsPage === 'function') {
        return window.residentsPage(cid);
      }
    }

    if (p[0] === 'morador' && typeof window.renderResidentPortal === 'function') {
      return window.renderResidentPortal(p[1] || 'home');
    }

    return previousRoute();
  };

  const active = window.__GC_ACTIVE_HASH_LISTENER__;
  if (active && active !== route) {
    window.removeEventListener('hashchange', active);
  }
  window.addEventListener('hashchange', route);

  setTimeout(() => {
    try { route(); } catch (err) { console.error('Final router', err); }
  }, 0);
})();