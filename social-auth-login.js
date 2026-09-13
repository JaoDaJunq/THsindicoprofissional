(() => {
  'use strict';

  if (window.__GC_SOCIAL_AUTH_LOGIN__) return;

  const SUPABASE_URL = 'https://tckvzlizcqdxzgavjwie.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3';
  const client = window.supabase?.createClient?.(SUPABASE_URL, SUPABASE_KEY);

  const googleIcon = `
    <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.715v2.26h2.909c1.702-1.567 2.684-3.877 2.684-6.616Z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.179l-2.91-2.26c-.805.54-1.834.86-3.046.86-2.344 0-4.328-1.584-5.037-3.713H.956v2.332A9 9 0 0 0 9 18Z"/>
      <path fill="#FBBC05" d="M3.963 10.708A5.42 5.42 0 0 1 3.68 9c0-.592.102-1.167.283-1.708V4.96H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.04l3.007-2.332Z"/>
      <path fill="#EA4335" d="M9 3.58c1.322 0 2.507.454 3.44 1.346l2.581-2.581C13.464.892 11.426 0 9 0A9 9 0 0 0 .956 4.96l3.007 2.332C4.672 5.163 6.656 3.58 9 3.58Z"/>
    </svg>`;

  function showMessage(text, kind = 'info') {
    const card = document.querySelector('.auth-card');
    if (!card) return;
    let box = card.querySelector('.auth-message.social-auth-message');
    if (!box) {
      box = document.createElement('div');
      box.className = 'auth-message social-auth-message';
      const title = card.querySelector('h1');
      title?.insertAdjacentElement('afterend', box);
    }
    box.dataset.kind = kind;
    box.textContent = text;
  }

  async function signInWithGoogle(button) {
    if (!client) {
      showMessage('A conexão de login não carregou. Atualize a página e tente novamente.', 'error');
      return;
    }

    const original = button.innerHTML;
    button.disabled = true;
    button.classList.add('is-loading');
    button.innerHTML = '<span class="social-auth-spinner" aria-hidden="true"></span><span>Abrindo Google...</span>';

    try {
      const redirectTo = `${location.origin}${location.pathname}`;
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: { prompt: 'select_account' }
        }
      });
      if (error) throw error;
    } catch (error) {
      console.warn('[social-auth] Google login', error);
      const message = /provider.*enabled|unsupported provider/i.test(error?.message || '')
        ? 'O login com Google ainda precisa ser ativado na configuração de autenticação.'
        : (error?.message || 'Não foi possível abrir o login com Google.');
      showMessage(message, 'error');
      button.disabled = false;
      button.classList.remove('is-loading');
      button.innerHTML = original;
    }
  }

  function enhanceLogin() {
    const form = document.querySelector('#cloud-login');
    if (!form || form.dataset.socialAuthReady === 'true') return;
    const card = form.closest('.auth-card');
    if (!card) return;

    form.dataset.socialAuthReady = 'true';
    card.classList.add('auth-card--social');

    const googleButton = document.createElement('button');
    googleButton.type = 'button';
    googleButton.className = 'google-signin-button';
    googleButton.id = 'google-signin';
    googleButton.innerHTML = `<span class="google-signin-icon">${googleIcon}</span><span>Continuar com Google</span>`;
    googleButton.addEventListener('click', () => signInWithGoogle(googleButton));

    const divider = document.createElement('div');
    divider.className = 'auth-divider auth-divider--social';
    divider.innerHTML = '<span>ou continue com e-mail</span>';

    form.insertAdjacentElement('beforebegin', divider);
    divider.insertAdjacentElement('beforebegin', googleButton);

    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.textContent = 'Entrar com e-mail';

    const subtitle = card.querySelector('h1 + .muted');
    if (subtitle) subtitle.textContent = 'Entre com Google ou use seu e-mail e senha. Seu perfil e permissões continuam os mesmos.';
  }

  const observer = new MutationObserver(enhanceLogin);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhanceLogin, { once: true });
  else enhanceLogin();

  window.__GC_SOCIAL_AUTH_LOGIN__ = Object.freeze({ enhanceLogin });
})();
