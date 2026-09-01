(() => {
  'use strict';

  if (typeof route !== 'function') return;

  const baseCondoDashboard = window.condoManagementDashboard;

  function addSettingsAction(cid) {
    if (!cid || !window.CondoAccess?.can('condo.manage', cid)) return;
    const actions = document.querySelector('.topbar .top-actions');
    if (!actions || actions.querySelector('[data-condo-settings]')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-soft';
    button.dataset.condoSettings = 'true';
    button.textContent = '⚙ Configurações';
    button.onclick = () => window.openCondoSettings?.(cid);
    actions.insertBefore(button, actions.firstChild);
  }

  if (typeof baseCondoDashboard === 'function') {
    const stableCondoDashboard = async function(cid) {
      const result = await baseCondoDashboard(cid);
      addSettingsAction(cid);
      return result;
    };

    window.condoManagementDashboard = stableCondoDashboard;

    // Old modules still call condoOverview() directly after actions such as
    // saving condominium settings. Point those calls to the final V2 screen.
    try {
      window.condoOverview = stableCondoDashboard;
      condoOverview = stableCondoDashboard;
    } catch (_) {}
  }

  // Some legacy modules registered their own bubble-phase hashchange listeners
  // before the final router existed. A single capture-phase listener runs first,
  // stops those stale listeners and delegates every navigation to the final
  // management-aware route exactly once.
  const previousCapture = window.__GC_ROUTE_CAPTURE_LISTENER__;
  if (previousCapture) {
    window.removeEventListener('hashchange', previousCapture, true);
  }

  const captureHashChange = event => {
    event.stopImmediatePropagation();
    try {
      route();
    } catch (err) {
      console.error('[workspace-route-stability]', err);
    }
  };

  window.addEventListener('hashchange', captureHashChange, true);
  window.__GC_ROUTE_CAPTURE_LISTENER__ = captureHashChange;

  // Keep the current workspace visually consistent if this hotfix loads while
  // the user is already inside a condominium overview.
  const parts = (location.hash || '#/').replace(/^#\//, '').split('?')[0].split('/').filter(Boolean);
  if (parts[0] === 'condominio' && parts[1] && !parts[2]) {
    setTimeout(() => addSettingsAction(parts[1]), 0);
  }
})();