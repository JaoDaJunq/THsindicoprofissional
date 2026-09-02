(() => {
  'use strict';

  const PAGE_RENDERERS = [
    'managementDashboard',
    'condoManagementDashboard',
    'managementReportsPage',
    'callsPage',
    'docsPage',
    'residentsPage',
    'teamPage',
    'financePage',
    'financeConsolidatedPage',
    'financeOverviewPage',
    'assemblyVotingPage',
    'assemblyVotingWorkspace',
    'auditPage',
    'integrationsPage',
    'notificationsPage',
    'adminAnnouncementsPage'
  ];

  let restoreScheduled = false;

  const routeKey = () => `${location.hash || '#/'}|${location.pathname || ''}`;

  function restoreCurrentRoute() {
    if (restoreScheduled) return;
    restoreScheduled = true;
    queueMicrotask(() => {
      restoreScheduled = false;
      try {
        if (typeof route === 'function') route();
      } catch (err) {
        console.error('[navigation-integrity]', err);
      }
    });
  }

  function wrap(name) {
    const original = window[name];
    if (typeof original !== 'function' || original.__gcNavigationIntegrity) return;

    const wrapped = function(...args) {
      const startedAt = routeKey();
      let result;
      try {
        result = original.apply(this, args);
      } catch (err) {
        throw err;
      }

      if (!result || typeof result.then !== 'function') return result;

      return Promise.resolve(result).finally(() => {
        if (routeKey() !== startedAt) restoreCurrentRoute();
      });
    };

    Object.defineProperty(wrapped, '__gcNavigationIntegrity', { value: true });
    Object.defineProperty(wrapped, '__gcOriginalRenderer', { value: original });
    window[name] = wrapped;
  }

  PAGE_RENDERERS.forEach(wrap);

  // Some legacy scripts expose globals late. A one-shot access-ready pass covers
  // those without observing/mutating DOM or changing any data source.
  window.addEventListener('condo-access-ready', () => PAGE_RENDERERS.forEach(wrap));

  window.__GC_NAVIGATION_INTEGRITY__ = Object.freeze({
    wrap,
    routeKey,
    renderers: [...PAGE_RENDERERS]
  });
})();