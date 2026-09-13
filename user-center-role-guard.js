(() => {
  'use strict';

  let scheduled = false;

  const isAccountRoute = () => (location.hash || '#/').split('?')[0] === '#/conta';

  function isResidentOnly() {
    try {
      return window.CondoAccess?.isResidentOnly?.() === true;
    } catch (_) {
      return false;
    }
  }

  function patchResidentMembershipLinks() {
    document.querySelectorAll('.uc-membership').forEach(card => {
      const role = (card.querySelector('span')?.textContent || '').trim();
      if (role !== 'Morador') return;
      const link = card.querySelector('a[href]');
      if (!link) return;
      link.href = '#/morador/home';
      link.textContent = 'Portal';
      link.setAttribute('aria-label', 'Abrir Portal do Morador');
    });
  }

  function patchResidentShell() {
    if (!isResidentOnly()) {
      document.body.classList.remove('uc-resident-account');
      return;
    }

    const app = document.querySelector('#app');
    const shell = app?.querySelector('.app-shell');
    if (!shell) return;

    shell.classList.add('uc-resident-account-shell');
    shell.querySelector('.sidebar')?.remove();
    shell.querySelector('.mobile-top')?.remove();
    document.querySelector('.mobile-bottom-dock')?.remove();
    document.querySelector('.mobile-nav-backdrop')?.remove();
    document.body.classList.remove('has-mobile-dock', 'nav-open');
    document.body.classList.add('uc-resident-account');

    const main = shell.querySelector('.main');
    if (!main || main.querySelector('.uc-resident-return')) return;

    const bar = document.createElement('div');
    bar.className = 'uc-resident-return';
    bar.innerHTML = '<a class="btn btn-soft" href="#/morador/home">← Portal do Morador</a>';
    main.prepend(bar);
  }

  function apply() {
    scheduled = false;
    if (!isAccountRoute()) {
      document.body.classList.remove('uc-resident-account');
      return;
    }
    patchResidentMembershipLinks();
    patchResidentShell();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }

  const style = document.createElement('style');
  style.textContent = `
    .uc-resident-account-shell{display:block!important;min-height:100vh;background:#f4f7fb}
    .uc-resident-account-shell>.main{width:min(1180px,100%);margin:0 auto!important;padding:24px!important;grid-column:1!important}
    .uc-resident-return{display:flex;align-items:center;margin-bottom:14px}
    .uc-resident-account .ux-quick-create-dock{display:none!important}
    @media(max-width:640px){.uc-resident-account-shell>.main{padding:14px!important}.uc-resident-return{margin-bottom:10px}.uc-resident-return .btn{width:100%}}
  `;
  document.head.appendChild(style);

  const observer = new MutationObserver(schedule);

  function start() {
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('hashchange', schedule, { passive: true });
    window.addEventListener('condo-access-ready', schedule, { passive: true });
    schedule();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();