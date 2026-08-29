(() => {
  'use strict';

  if (typeof route !== 'function') return;

  const previousRoute = route;
  let navigationToken = 0;

  function getCondominiumIdFromHash() {
    const parts = (location.hash || '#/')
      .replace(/^#\//, '')
      .split('/')
      .filter(Boolean);

    return parts[0] === 'condominio' ? parts[1] || null : null;
  }

  function renderDenied() {
    const app = document.querySelector('#app');
    if (!app) return;

    const content = `
      <main class="content">
        <section class="panel">
          <div class="panel-body">
            <div class="empty">
              <strong>Acesso não autorizado.</strong>
              <p>Este condomínio não está vinculado à sua conta.</p>
              <p><a class="btn btn-primary" href="#/">Voltar para a visão geral</a></p>
            </div>
          </div>
        </section>
      </main>`;

    try {
      app.innerHTML = typeof shell === 'function' ? shell(content, 'dashboard') : content;
    } catch (_) {
      app.innerHTML = content;
    }
  }

  route = function guardedRoute() {
    const token = ++navigationToken;
    const condominiumId = getCondominiumIdFromHash();

    if (!condominiumId || !window.CondoAccess) {
      return previousRoute();
    }

    const current = window.CondoAccess.getSnapshot();
    if (current.loadedAt) {
      if (window.CondoAccess.canAccessCondo(condominiumId)) {
        return previousRoute();
      }
      return renderDenied();
    }

    window.CondoAccess.refresh()
      .then(() => {
        if (token !== navigationToken) return;
        if (window.CondoAccess.canAccessCondo(condominiumId)) {
          previousRoute();
        } else {
          renderDenied();
        }
      })
      .catch(err => {
        console.warn('[route-access-guard]', err);
        if (token === navigationToken) renderDenied();
      });
  };

  window.removeEventListener('hashchange', previousRoute);
  window.addEventListener('hashchange', route);
  window.__GC_ACTIVE_HASH_LISTENER__ = route;
})();
