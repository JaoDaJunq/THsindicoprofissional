(() => {
  'use strict';

  if (window.__GC_BOOT_STABILITY__) return;

  const state = {
    scriptsReady: false,
    accessReady: false,
    released: false,
    releaseScheduled: false,
    startedAt: Date.now(),
    lastMutationAt: Date.now()
  };

  const body = document.body;
  const app = document.querySelector('#app');
  body?.classList.add('gc-booting');

  async function hardRetry(button) {
    if (button) {
      button.disabled = true;
      button.textContent = 'Recarregando...';
    }
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations
          .filter(reg => String(reg.scope || '').includes('/THsindicoprofissional/'))
          .map(reg => reg.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys
          .filter(key => key.startsWith('gestao-condominial-shell-'))
          .map(key => caches.delete(key)));
      }
      const cleanPath = `${location.origin}${location.pathname}`;
      location.replace(`${cleanPath}?reload=${Date.now()}${location.hash || ''}`);
    } catch (err) {
      console.warn('[boot-stability] hard retry', err);
      location.reload();
    }
  }

  function ensureScreen() {
    let screen = document.querySelector('#gc-boot-screen');
    if (screen) return screen;
    screen = document.createElement('div');
    screen.id = 'gc-boot-screen';
    screen.setAttribute('role', 'status');
    screen.setAttribute('aria-live', 'polite');
    screen.innerHTML = `
      <div class="gc-boot-card">
        <div class="gc-boot-mark">SG</div>
        <strong>Carregando Gestão Condominial</strong>
        <p data-gc-boot-message>Preparando sua sessão e o condomínio atual.</p>
        <div class="gc-boot-progress" aria-hidden="true"></div>
        <button type="button" class="gc-boot-retry">Tentar novamente</button>
      </div>`;
    document.body.appendChild(screen);
    const retry = screen.querySelector('.gc-boot-retry');
    retry?.addEventListener('click', () => hardRetry(retry));
    return screen;
  }

  ensureScreen();

  const observer = app ? new MutationObserver(() => {
    state.lastMutationAt = Date.now();
  }) : null;
  observer?.observe(app, { childList: true, subtree: true, attributes: false, characterData: false });

  function accessSnapshot() {
    try {
      return window.CondoAccess?.getSnapshot?.() || null;
    } catch (_) {
      return null;
    }
  }

  function snapshotReady() {
    return Boolean(accessSnapshot()?.loadedAt);
  }

  function routeReady() {
    return typeof window.route === 'function' || typeof route === 'function';
  }

  function finalRoute() {
    try {
      const fn = typeof window.route === 'function' ? window.route : (typeof route === 'function' ? route : null);
      return fn ? fn() : null;
    } catch (err) {
      console.error('[boot-stability] final route', err);
      return null;
    }
  }

  function screenMatchesAccess() {
    const snap = accessSnapshot();
    if (!snap?.loadedAt || !app) return false;

    if (!snap.user) return Boolean(app.querySelector('#cloud-login, .auth-page'));
    if (app.querySelector('#cloud-login')) return false;

    const memberships = Array.isArray(snap.memberships) ? snap.memberships : [];
    if (memberships.length && app.querySelector('.onboarding-page, .cloud-onboarding')) return false;

    try {
      if (window.CondoAccess?.isResidentOnly?.() && app.querySelector('.app-shell') && !app.querySelector('.resident-app')) return false;
      if (window.CondoAccess?.hasAnyManagementRole?.() && app.querySelector('.resident-app')) return false;
    } catch (_) {}

    return app.childElementCount > 0;
  }

  function reveal() {
    if (state.released) return;
    state.released = true;
    observer?.disconnect();
    document.body.classList.remove('gc-booting');
    document.body.classList.add('gc-boot-ready');
    const screen = document.querySelector('#gc-boot-screen');
    if (screen) {
      screen.setAttribute('aria-hidden', 'true');
      setTimeout(() => screen.remove(), 220);
    }
    window.dispatchEvent(new CustomEvent('gc-boot-ready'));
  }

  function retryFinalRoute() {
    if (state.released) return;
    state.releaseScheduled = false;
    state.lastMutationAt = Date.now();
    setTimeout(maybeRelease, 55);
  }

  function waitForQuietAndReveal() {
    if (state.released || state.releaseScheduled) return;
    state.releaseScheduled = true;

    const started = Date.now();
    const check = () => {
      if (state.released) return;

      if (!screenMatchesAccess()) {
        retryFinalRoute();
        return;
      }

      const quietFor = Date.now() - state.lastMutationAt;
      const waited = Date.now() - started;
      if (quietFor >= 110 || waited >= 520) {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (!screenMatchesAccess()) return retryFinalRoute();
          reveal();
        }));
        return;
      }
      setTimeout(check, 35);
    };
    setTimeout(check, 35);
  }

  function maybeRelease() {
    if (state.released || state.releaseScheduled) return;
    state.accessReady = state.accessReady || snapshotReady();
    if (!state.scriptsReady || !state.accessReady || !routeReady()) return;

    Promise.resolve(finalRoute())
      .catch(err => console.warn('[boot-stability] route promise', err))
      .finally(waitForQuietAndReveal);
  }

  function markScriptsReady() {
    state.scriptsReady = true;
    state.lastMutationAt = Date.now();
    maybeRelease();
  }

  window.addEventListener('condo-access-ready', () => {
    state.accessReady = true;
    state.lastMutationAt = Date.now();
    maybeRelease();
  });

  window.addEventListener('condo-access-error', event => {
    const screen = ensureScreen();
    screen.classList.add('is-error');
    const message = screen.querySelector('[data-gc-boot-message]');
    if (message) message.textContent = event.detail?.message || 'Não foi possível validar sua sessão. Tente novamente.';
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', markScriptsReady, { once: true });
  } else {
    queueMicrotask(markScriptsReady);
  }

  queueMicrotask(() => {
    if (snapshotReady()) {
      state.accessReady = true;
      maybeRelease();
    }
  });

  setTimeout(() => {
    if (state.released || window.supabase) return;
    const screen = ensureScreen();
    screen.classList.add('is-error');
    const message = screen.querySelector('[data-gc-boot-message]');
    if (message) message.textContent = 'O componente de conexão não carregou. Toque em Tentar novamente para limpar o cache deste site e recarregar.';
  }, 4500);

  setTimeout(() => {
    if (state.released) return;
    const screen = ensureScreen();
    screen.classList.add('is-error');
    const message = screen.querySelector('[data-gc-boot-message]');
    if (message && window.supabase) message.textContent = 'A inicialização está demorando mais que o esperado. Toque em Tentar novamente para limpar o cache deste site e recarregar.';
  }, 12000);

  window.__GC_BOOT_STABILITY__ = Object.freeze({
    getState: () => ({ ...state }),
    maybeRelease,
    screenMatchesAccess,
    hardRetry
  });
})();
