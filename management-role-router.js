(() => {
  'use strict';
  if (typeof route !== 'function') return;

  const previousRoute = route;
  let routeToken = 0;

  const parts = () => (location.hash || '#/').replace(/^#\//, '').split('/').filter(Boolean);

  function applyRestrictions(cid = null) {
    const access = window.CondoAccess;
    if (!access) return;

    if (!access.canCreateCondo()) {
      document.querySelectorAll('[onclick*="openCondoModal"], #new-condo, #another-condo').forEach(el => el.remove());
      document.querySelectorAll('a[href="#/condominios"]').forEach(el => {
        if (el.closest('.sidebar')) el.style.display = 'none';
      });
    }

    if (cid && !access.can('team.manage', cid)) {
      document.querySelectorAll(`a[href="#/condominio/${cid}/equipe"]`).forEach(el => el.remove());
    }

    if (cid && !access.can('residents.manage', cid) && !access.can('units.manage', cid)) {
      document.querySelectorAll(`a[href="#/condominio/${cid}/moradores"]`).forEach(el => el.remove());
    }

    if (cid && !access.can('condo.manage', cid)) {
      document.querySelectorAll('[data-condo-settings]').forEach(el => el.remove());
    }
  }

  function renderManagementRoute() {
    const p = parts();
    const cid = p[0] === 'condominio' ? p[1] : null;
    const access = window.CondoAccess;

    if (!access?.hasAnyManagementRole()) return previousRoute();
    if (cid && !access.canAccessCondo(cid)) return previousRoute();

    document.body.classList.remove('auth-body', 'onboarding-body');

    let result;
    let handled = true;

    if (!p.length) result = dashboard();
    else if (p[0] === 'condominios') result = access.canCreateCondo() ? condosPage() : dashboard();
    else if (p[0] === 'calendario') result = calendarPage();
    else if (p[0] === 'manutencoes') result = maintenancesPage();
    else if (p[0] === 'tarefas') result = tasksPage();
    else if (p[0] === 'chamados') result = callsPage();
    else if (p[0] === 'condominio') {
      const sub = p[2];
      if (!sub) result = condoOverview(cid);
      else if (sub === 'calendario') result = calendarPage(cid);
      else if (sub === 'manutencoes') result = maintenancesPage(cid);
      else if (sub === 'tarefas') result = tasksPage(cid);
      else if (sub === 'chamados') result = callsPage(cid);
      else if (sub === 'documentos') result = docsPage(cid);
      else if (sub === 'historico') result = historyPage(cid);
      else if (sub === 'arquivos') result = filesPage(cid, p[3] || null);
      else if (sub === 'moradores' && typeof window.residentsPage === 'function') result = window.residentsPage(cid);
      else if (sub === 'equipe' && typeof window.teamPage === 'function') result = window.teamPage(cid);
      else if (sub === 'gas' && typeof window.gasPage === 'function') result = window.gasPage(cid);
      else if (sub === 'comunicados' && typeof window.adminAnnouncementsPage === 'function') result = window.adminAnnouncementsPage(cid);
      else if (sub === 'assembleias' && typeof window.assembliesPage === 'function') result = window.assembliesPage(cid);
      else handled = false;
    } else {
      handled = false;
    }

    if (!handled) return previousRoute();

    Promise.resolve(result).finally(() => setTimeout(() => applyRestrictions(cid), 0));
    return result;
  }

  route = function managementAwareRoute() {
    const token = ++routeToken;
    const access = window.CondoAccess;
    if (!access) return previousRoute();

    const snapshot = access.getSnapshot();
    if (snapshot.loadedAt) return renderManagementRoute();

    access.refresh().then(() => {
      if (token === routeToken) renderManagementRoute();
    }).catch(err => {
      console.warn('[management-role-router]', err);
      if (token === routeToken) previousRoute();
    });
  };

  const active = window.__GC_ACTIVE_HASH_LISTENER__;
  if (active && active !== route) window.removeEventListener('hashchange', active);
  window.addEventListener('hashchange', route);
  window.__GC_ACTIVE_HASH_LISTENER__ = route;

  window.addEventListener('condo-access-ready', () => {
    const p = parts();
    if (window.CondoAccess?.hasAnyManagementRole() && (p.length === 0 || p[0] === 'condominio')) {
      setTimeout(() => applyRestrictions(p[0] === 'condominio' ? p[1] : null), 0);
    }
  });
})();
