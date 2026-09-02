(() => {
  'use strict';

  const icon = paths => `<svg class="ux-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  const icons = {
    home: icon('<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/>'),
    condos: icon('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3"/>'),
    calendar: icon('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>'),
    maintenance: icon('<path d="m14.7 6.3 3-3 3 3-3 3"/><path d="m13 8 3 3"/><path d="M5 19 15 9"/><path d="m4 20-1-1 3-5 4 4-5 3Z"/>'),
    calls: icon('<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>'),
    tasks: icon('<path d="M9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'),
    finance: icon('<circle cx="12" cy="12" r="9"/><path d="M16 8.5c-.8-1-2-1.5-4-1.5-2.2 0-3.5 1-3.5 2.5S10 12 12 12s3.5 1 3.5 2.5S14.2 17 12 17c-2 0-3.2-.5-4-1.5M12 5v14"/>'),
    integrations: icon('<path d="M7 7h10v4M17 17H7v-4"/><path d="m14 8 3-3 3 3M10 16l-3 3-3-3"/>'),
    notifications: icon('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>'),
    documents: icon('<path d="M6 2h8l4 4v16H6Z"/><path d="M14 2v5h5M9 12h6M9 16h6"/>'),
    files: icon('<path d="M3 6h7l2 2h9v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>'),
    team: icon('<circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M15 17a4 4 0 0 1 6 3v1"/>'),
    residents: icon('<circle cx="12" cy="8" r="3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>'),
    announcements: icon('<path d="M3 11v2l10 4V7L3 11Z"/><path d="M13 9c4 0 6-2 6-4v14c0-2-2-4-6-4M6 14l1.5 5"/>'),
    assemblies: icon('<path d="M3 10h18M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18M12 3l9 5H3Z"/>'),
    gas: icon('<path d="M12 22c4 0 7-3 7-7 0-5-4-8-7-13-3 5-7 8-7 13 0 4 3 7 7 7Z"/><path d="M12 22c2 0 4-2 4-4 0-2-2-4-4-6-2 2-4 4-4 6 0 2 2 4 4 4Z"/>'),
    reports: icon('<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>'),
    audit: icon('<path d="M4 4h12v16H4z"/><path d="M8 8h4M8 12h5M8 16h3"/><circle cx="18" cy="16" r="3"/><path d="m20 18 2 2"/>'),
    history: icon('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>'),
    settings: icon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z"/>'),
    search: icon('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>'),
    chevron: icon('<path d="m9 18 6-6-6-6"/>')
  };

  const globalItems = [
    ['dashboard','Visão geral','home','#/'],
    ['condos','Condomínios','condos','#/condominios'],
    ['finance','Financeiro','finance','#/financeiro','finance.review'],
    ['calendar','Calendário','calendar','#/calendario'],
    ['maintenance','Manutenções','maintenance','#/manutencoes','operations.review'],
    ['calls','Chamados','calls','#/chamados','operations.review'],
    ['tasks','Tarefas','tasks','#/tarefas','operations.review'],
    ['integrations','Integrações','integrations','#/integracoes'],
    ['notifications','Notificações','notifications','#/notificacoes']
  ];

  const workspaceItems = [
    ['condo-overview','Resumo','home',''],
    ['condo-calendar','Calendário','calendar','/calendario'],
    ['condo-maintenance','Manutenções','maintenance','/manutencoes','operations.review'],
    ['condo-tasks','Tarefas','tasks','/tarefas','operations.review'],
    ['condo-calls','Chamados','calls','/chamados','operations.review'],
    ['condo-team','Equipe','team','/equipe','team.manage'],
    ['condo-residents','Moradores','residents','/moradores','residents.manage'],
    ['condo-announcements','Comunicados','announcements','/comunicados','communications.manage'],
    ['condo-assemblies','Assembleias','assemblies','/assembleias','assemblies.manage'],
    ['condo-docs','Documentos','documents','/documentos','documents.manage'],
    ['condo-gas','Gás','gas','/gas','operations.review'],
    ['condo-files','Base de dados','files','/arquivos','documents.manage'],
    ['condo-finance','Financeiro','finance','/financeiro','finance.review'],
    ['condo-reports','Relatórios','reports','/relatorios','operations.review'],
    ['condo-audit','Auditoria','audit','/auditoria','operations.review'],
    ['condo-history','Histórico','history','/historico','operations.review']
  ];

  function can(capability, cid=null) {
    if (!capability) return true;
    const access = window.CondoAccess;
    if (!access) return false;
    if (cid) return Boolean(access.can?.(capability, cid));
    const memberships = access.getSnapshot?.()?.memberships || [];
    return memberships.some(m => access.can?.(capability, m.condominium_id));
  }

  function mapGlobal() {
    return globalItems.filter(item => can(item[4])).map(([id,label,iconKey,href]) => ({id,label,icon:icons[iconKey],href,group:'main'}));
  }

  function mapWorkspace(cid) {
    if (!cid) return [];
    return workspaceItems.filter(item => can(item[4], cid)).map(([id,label,iconKey,suffix]) => ({id,label,icon:icons[iconKey],href:`#/condominio/${cid}${suffix}`,group:'workspace'}));
  }

  function parse() {
    const hash = location.hash || '#/';
    const parts = hash.replace(/^#\//,'').split('?')[0].split('/').filter(Boolean);
    const cid = parts[0] === 'condominio' ? parts[1] : null;
    return {hash,parts,cid,workspace:Boolean(cid)};
  }

  function activeId(items) {
    const current = (location.hash || '#/').split('?')[0];
    const exact = items.find(item => item.href === current);
    if (exact) return exact.id;
    const nested = [...items].sort((a,b)=>b.href.length-a.href.length).find(item => item.href !== '#/' && current.startsWith(item.href + '/'));
    return nested?.id || (current === '#/' ? 'dashboard' : '');
  }

  window.GCNavigation = {
    icons,
    parse,
    can,
    global: mapGlobal,
    workspace: mapWorkspace,
    activeId,
    groups() {
      const ctx=parse();
      return [
        {id:'main',label:'Principal',items:mapGlobal()},
        ...(ctx.cid ? [{id:'workspace',label:'Workspace',items:mapWorkspace(ctx.cid)}] : [])
      ];
    }
  };
})();