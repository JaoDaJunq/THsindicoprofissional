(() => {
  'use strict';

  // Um único cliente Supabase para todos os módulos da aplicação.
  if (window.supabase?.createClient && !window.__GC_SUPABASE_SINGLETON_PATCHED__) {
    const originalCreateClient = window.supabase.createClient.bind(window.supabase);
    const clients = new Map();

    window.supabase.createClient = function(url, key, options) {
      const cacheKey = `${url}::${key}`;
      if (!clients.has(cacheKey)) {
        clients.set(cacheKey, originalCreateClient(url, key, options));
      }
      return clients.get(cacheKey);
    };

    window.__GC_SUPABASE_CLIENTS__ = clients;
    window.__GC_SUPABASE_SINGLETON_PATCHED__ = true;
  }

  // A aplicação foi crescendo por módulos e vários deles adicionavam seu próprio
  // hashchange. Mantemos somente o listener principal mais recente.
  if (!window.__GC_HASH_ROUTER_PATCHED__) {
    const nativeAdd = window.addEventListener.bind(window);
    const nativeRemove = window.removeEventListener.bind(window);
    let activeHashListener = null;

    window.addEventListener = function(type, listener, options) {
      if (type === 'hashchange' && typeof listener === 'function') {
        // transition-ui tinha um listener auxiliar só para a rota de gás.
        // A rota é tratada pelo final-router, então ele não deve competir
        // com o roteador principal.
        if (listener.name === 'handleGasRoute') return;

        if (activeHashListener && activeHashListener !== listener) {
          nativeRemove('hashchange', activeHashListener);
        }
        activeHashListener = listener;
        window.__GC_ACTIVE_HASH_LISTENER__ = listener;
      }
      return nativeAdd(type, listener, options);
    };

    window.removeEventListener = function(type, listener, options) {
      if (type === 'hashchange' && activeHashListener === listener) {
        activeHashListener = null;
        window.__GC_ACTIVE_HASH_LISTENER__ = null;
      }
      return nativeRemove(type, listener, options);
    };

    window.__GC_HASH_ROUTER_PATCHED__ = true;
  }
})();