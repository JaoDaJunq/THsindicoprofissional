(() => {
  'use strict';

  let scheduled = false;

  function initials() {
    const fromData = window.data?.user?.initials;
    if (fromData) return String(fromData).slice(0, 2).toUpperCase();
    const source = document.querySelector('.top-actions .avatar, .resident-top .avatar');
    return String(source?.textContent?.trim() || 'EU').slice(0, 2).toUpperCase();
  }

  function makeAccountButton(compact = false) {
    const link = document.createElement('a');
    link.href = '#/conta';
    link.className = compact ? 'uc-home-account uc-home-account--compact' : 'uc-home-account';
    link.setAttribute('aria-label', 'Abrir Minha conta');
    link.title = 'Minha conta';
    link.innerHTML = `<span class="uc-home-account-avatar" aria-hidden="true">${initials()}</span><span class="uc-home-account-label">Minha conta</span>`;
    return link;
  }

  function enhanceTopActions() {
    document.querySelectorAll('.topbar .top-actions').forEach(actions => {
      if (actions.querySelector('.uc-home-account')) return;
      const oldAvatar = actions.querySelector('.avatar');
      const link = makeAccountButton(false);
      if (oldAvatar) {
        oldAvatar.replaceWith(link);
      } else {
        actions.appendChild(link);
      }
    });
  }

  function enhanceMobileTop() {
    document.querySelectorAll('.mobile-top').forEach(header => {
      if (header.querySelector('.uc-home-account')) return;
      const link = makeAccountButton(true);
      header.appendChild(link);
    });
  }

  function enhanceResidentTop() {
    document.querySelectorAll('.resident-top').forEach(header => {
      if (header.querySelector('.uc-home-account')) return;
      const oldAvatar = header.querySelector('.avatar');
      const link = makeAccountButton(true);
      if (oldAvatar) oldAvatar.replaceWith(link);
      else header.appendChild(link);
    });
  }

  function apply() {
    scheduled = false;
    if ((location.hash || '#/') === '#/conta') return;
    enhanceTopActions();
    enhanceMobileTop();
    enhanceResidentTop();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }

  const observer = new MutationObserver(schedule);
  function start() {
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('hashchange', schedule, { passive: true });
    schedule();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();