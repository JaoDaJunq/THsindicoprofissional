(() => {
  'use strict';

  let scheduled = false;
  const WORKSPACE_ORDER = [
    'condo-overview','condo-calendar','condo-maintenance','condo-tasks','condo-calls',
    'condo-team','condo-residents','condo-announcements','condo-assemblies','condo-docs',
    'condo-gas','condo-files','condo-finance','condo-reports','condo-audit','condo-history'
  ];

  function can(capability, cid) {
    return Boolean(window.CondoAccess?.can?.(capability, cid));
  }

  function patchNavigationRegistry() {
    const registry = window.GCNavigation;
    if (!registry || registry.__uxReviewPatched) return;

    const baseGlobal = registry.global.bind(registry);
    const baseWorkspace = registry.workspace.bind(registry);

    registry.workspace = function patchedWorkspace(cid) {
      const items = baseWorkspace(cid).map(item => ({ ...item }));
      const ids = new Set(items.map(item => item.id));

      // A equipe operacional pode administrar unidades mesmo sem poder gerenciar
      // vínculos de moradores. A tela de Moradores/Unidades já aceita esse caso.
      if (can('units.manage', cid) && !ids.has('condo-residents')) {
        items.push({
          id:'condo-residents', label:'Moradores', icon:registry.icons.residents,
          href:`#/condominio/${cid}/moradores`, group:'workspace'
        });
      }

      // Conselho pode revisar assembleias sem possuir permissão de edição.
      if (can('operations.review', cid) && !ids.has('condo-assemblies')) {
        items.push({
          id:'condo-assemblies', label:'Assembleias', icon:registry.icons.assemblies,
          href:`#/condominio/${cid}/assembleias`, group:'workspace'
        });
      }

      const rank = id => {
        const index = WORKSPACE_ORDER.indexOf(id);
        return index < 0 ? WORKSPACE_ORDER.length : index;
      };
      return items.sort((a,b) => rank(a.id) - rank(b.id));
    };

    registry.groups = function patchedGroups() {
      const ctx = registry.parse();
      return [
        { id:'main', label:'Principal', items:baseGlobal() },
        ...(ctx.cid ? [{ id:'workspace', label:'Workspace', items:registry.workspace(ctx.cid) }] : [])
      ];
    };

    registry.__uxReviewPatched = true;
  }

  function targetForCondo(newCid) {
    const registry = window.GCNavigation;
    const ctx = registry?.parse?.();
    if (!registry || !ctx?.cid) return `#/condominio/${newCid}`;

    const sourceItems = registry.workspace(ctx.cid);
    const activeId = registry.activeId(sourceItems);
    const targetItems = registry.workspace(newCid);
    const sameModule = targetItems.find(item => item.id === activeId);

    // Preserva o módulo, não IDs de registros internos. Assim, trocar de
    // condomínio dentro de uma assembleia não tenta abrir a mesma assembleia
    // em outro condomínio. Também respeita as permissões do destino.
    return sameModule?.href || `#/condominio/${newCid}`;
  }

  function handleCondoSwitch(event) {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || !target.matches('.ux-condo-switch select')) return;
    if (!target.value) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.hash = targetForCondo(target.value);
  }

  function repairResidentAssemblies() {
    const source = document.querySelector('.resident-nav a[href="#/morador/assemblies"]');
    const iconMarkup = window.GCNavigation?.icons?.assemblies || '';
    if (!source || !iconMarkup) return;

    const icon = source.querySelector('.resident-v2-nav-icon');
    const label = source.querySelector('.resident-v2-nav-label');
    if (icon && icon.innerHTML !== iconMarkup) icon.innerHTML = iconMarkup;
    if (label && label.textContent.trim() !== 'Assembleias') label.textContent = 'Assembleias';

    const nav = document.querySelector('.resident-more-sheet nav');
    if (!nav || nav.querySelector('a[href="#/morador/assemblies"]')) return;

    const link = document.createElement('a');
    link.href = '#/morador/assemblies';
    link.className = source.classList.contains('active') ? 'active' : '';
    if (source.classList.contains('active')) link.setAttribute('aria-current','page');
    link.innerHTML = `<span class="resident-more-icon">${iconMarkup}</span><span><strong>Assembleias</strong><small>Reuniões e votações do condomínio</small></span><em>›</em>`;

    const calendar = nav.querySelector('a[href="#/morador/calendar"]');
    if (calendar) calendar.insertAdjacentElement('afterend', link);
    else nav.prepend(link);
  }

  function improveConfirmFocusReturn() {
    const ui = window.GCUI;
    if (!ui?.confirm || ui.__uxReviewFocusPatched) return;
    const baseConfirm = ui.confirm;
    ui.confirm = function confirmWithFocusReturn(options) {
      const opener = document.activeElement;
      return baseConfirm(options).finally(() => {
        if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll:true });
      });
    };
    ui.__uxReviewFocusPatched = true;
  }

  function refresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      patchNavigationRegistry();
      repairResidentAssemblies();
      improveConfirmFocusReturn();
    });
  }

  document.addEventListener('change', handleCondoSwitch, true);
  const observer = new MutationObserver(refresh);

  function start() {
    refresh();
    observer.observe(document.getElementById('app') || document.body, { childList:true, subtree:true });
    window.addEventListener('condo-access-ready', refresh, { passive:true });
    window.addEventListener('hashchange', refresh, { passive:true });
    window.addEventListener('resize', refresh, { passive:true });
  }

  window.GCUXReviewFixes = { refresh, targetForCondo, repairResidentAssemblies };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
