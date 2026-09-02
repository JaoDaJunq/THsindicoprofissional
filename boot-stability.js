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
    screen.querySelector('.gc-boot-retry')?.addEventListener('click', () => location.reload());
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

    // No authenticated session: the login screen is authoritative.
    if (!snap.user) return Boolean(app.querySelector('#cloud-login, .auth-page'));

    // Auth can lag a few milliseconds behind FoundationAccess. If the access
    // snapshot already has a user, never reveal a transient login form.
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', markScriptsReady, { once: true });
  } else {
    queueMicrotask(markScriptsReady);
  }

  // Access may have completed before this listener was installed.
  queueMicrotask(() => {
    if (snapshotReady()) {
      state.accessReady = true;
      maybeRelease();
    }
  });

  // Never expose a potentially stale legacy screen if startup fails. Keep the
  // neutral gate visible and offer an explicit retry instead.
  setTimeout(() => {
    if (state.released) return;
    const screen = ensureScreen();
    screen.classList.add('is-error');
    const message = screen.querySelector('[data-gc-boot-message]');
    if (message) message.textContent = 'A inicialização está demorando mais que o esperado. Verifique a conexão e tente novamente.';
  }, 12000);

  window.__GC_BOOT_STABILITY__ = Object.freeze({
    getState: () => ({ ...state }),
    maybeRelease,
    screenMatchesAccess
  });
})();
