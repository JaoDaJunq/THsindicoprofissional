(() => {
  'use strict';

  let scheduled = false;

  function isWorkspace() {
    return /^#\/condominio\/[^/]+/.test(location.hash || '') && !/^#\/condominios(?:\?|$)/.test(location.hash || '');
  }

  function homeIcon() {
    return window.GCNavigation?.icons?.home || '';
  }

  function enhanceBrandHome() {
    const brand = document.querySelector('.mobile-top .brand');
    if (!brand || brand.dataset.homeShortcut === 'true') return;
    brand.dataset.homeShortcut = 'true';
    brand.setAttribute('role','link');
    brand.setAttribute('tabindex','0');
    brand.setAttribute('aria-label','Ir para a visão geral');
    const goHome = () => { location.hash = '#/'; };
    brand.addEventListener('click', goHome);
    brand.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      goHome();
    });
  }

  function enhanceBreadcrumb() {
    if (!isWorkspace()) return;
    const first = document.querySelector('.ux-contextbar.is-workspace .ux-breadcrumb a:first-child');
    if (!first) return;
    first.classList.add('ux-home-shortcut');
    first.setAttribute('aria-label','Ir para a visão geral');
    if (!first.querySelector('.ux-icon')) first.innerHTML = `${homeIcon()}<span>Início</span>`;
  }

  function enhanceMoreSheet() {
    if (!isWorkspace()) return;
    const list = document.querySelector('.mobile-more-sheet .mobile-more-list');
    if (!list || list.querySelector('.mobile-more-home')) return;

    const link = document.createElement('a');
    link.className = 'mobile-more-home';
    link.href = '#/';
    link.setAttribute('aria-label','Voltar para a visão geral');
    link.innerHTML = `
      <span class="mobile-more-icon" aria-hidden="true">${homeIcon()}</span>
      <span class="mobile-more-copy"><strong>Visão geral</strong><small>Sair do condomínio e voltar ao painel principal</small></span>
      <span class="mobile-more-chevron" aria-hidden="true">›</span>`;
    list.prepend(link);
  }

  function refresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      enhanceBrandHome();
      enhanceBreadcrumb();
      enhanceMoreSheet();
    });
  }

  const observer = new MutationObserver(refresh);
  function start() {
    refresh();
    observer.observe(document.getElementById('app') || document.body,{childList:true,subtree:true});
    window.addEventListener('hashchange',refresh,{passive:true});
    window.addEventListener('resize',refresh,{passive:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
