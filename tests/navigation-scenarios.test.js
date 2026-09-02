'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const FINAL_ROUTER = fs.readFileSync(path.join(ROOT, 'final-router.js'), 'utf8');
const ACCESS_GUARD = fs.readFileSync(path.join(ROOT, 'route-access-guard.js'), 'utf8');
const MANAGEMENT_ROUTER = fs.readFileSync(path.join(ROOT, 'management-role-router.js'), 'utf8');
const NAVIGATION_INTEGRITY = fs.readFileSync(path.join(ROOT, 'navigation-integrity.js'), 'utf8');
const INDEX = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function runFinalRouter({ hash, user = null, management = false }) {
  const calls = [];
  const listeners = new Map();
  const previousRoute = () => { calls.push('previous'); };
  const page = name => (...args) => { calls.push([name, ...args]); };

  const window = {
    CondoAccess: {
      getSnapshot: () => ({ user, memberships: [], loadedAt: 'ready' }),
      hasAnyManagementRole: () => management
    },
    auditPage: page('audit'),
    managementReportsPage: page('reports'),
    integrationsPage: page('integrations'),
    notificationsPage: page('notifications'),
    financeConsolidatedPage: page('finance-global'),
    financePage: page('finance-condo'),
    adminAnnouncementsPage: page('announcements'),
    assemblyVotingPage: page('assemblies'),
    assemblyVotingWorkspace: page('assembly-workspace'),
    residentsPage: page('residents'),
    gasPage: page('gas'),
    residentAssembliesPage: page('resident-assemblies'),
    renderResidentPortal: page('resident-portal'),
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener() {}
  };

  const context = {
    window,
    location: { hash },
    route: previousRoute,
    URLSearchParams,
    console,
    setTimeout: () => 1,
    Set,
    Boolean,
    Error
  };

  vm.runInNewContext(FINAL_ROUTER, context, { filename: 'final-router.js' });
  calls.length = 0;
  context.route();
  return { calls, context, listeners };
}

for (const hash of ['#/financeiro', '#/auditoria', '#/relatorios', '#/integracoes', '#/notificacoes']) {
  test(`entrada direta sem sessão em ${hash} delega para autenticação`, () => {
    const { calls } = runFinalRouter({ hash, user: null, management: false });
    assert.deepEqual(calls, ['previous']);
  });
}

test('morador não abre rota administrativa global digitada manualmente', () => {
  const resident = { id: 'resident-1' };
  for (const hash of ['#/financeiro', '#/auditoria', '#/relatorios', '#/integracoes']) {
    const { calls } = runFinalRouter({ hash, user: resident, management: false });
    assert.deepEqual(calls, ['previous'], hash);
  }
});

test('morador não abre workspace administrativo de assembleia por hash manual', () => {
  const { calls } = runFinalRouter({
    hash: '#/condominio/condo-a/assembleias/assembly-1',
    user: { id: 'resident-1' },
    management: false
  });
  assert.deepEqual(calls, ['previous']);
});

test('síndico pode entrar diretamente em rotas administrativas', () => {
  const { calls } = runFinalRouter({ hash: '#/financeiro', user: { id: 'syndic-1' }, management: true });
  assert.deepEqual(calls, [['finance-global']]);
});

test('portal do morador sem sessão não contorna autenticação', () => {
  const { calls } = runFinalRouter({ hash: '#/morador/assemblies', user: null, management: false });
  assert.deepEqual(calls, ['previous']);
});

test('rota desconhecida continua usando fallback existente', () => {
  const { calls } = runFinalRouter({ hash: '#/rota-que-nao-existe', user: { id: 'syndic-1' }, management: true });
  assert.deepEqual(calls, ['previous']);
});

test('guard ignora resposta antiga de permissão após navegação rápida', async () => {
  let hash = '#/condominio/condo-a/chamados';
  let previousCalls = 0;
  let denied = 0;
  const pending = [];

  const window = {
    CondoAccess: {
      getSnapshot: () => ({ user: { id: 'u1' }, memberships: [], loadedAt: null }),
      canAccessCondo: id => id === 'condo-b',
      refresh: () => new Promise(resolve => pending.push(resolve))
    },
    addEventListener() {},
    removeEventListener() {}
  };

  const app = { set innerHTML(_) { denied += 1; }, get innerHTML() { return ''; } };
  const context = {
    window,
    location: { get hash() { return hash; } },
    route: () => { previousCalls += 1; },
    document: { querySelector: selector => selector === '#app' ? app : null },
    shell: value => value,
    console,
    Promise,
    Error
  };

  vm.runInNewContext(ACCESS_GUARD, context, { filename: 'route-access-guard.js' });

  context.route();
  hash = '#/condominio/condo-b/manutencoes';
  context.route();

  assert.equal(pending.length, 2);
  pending[0]();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(previousCalls, 0, 'resposta antiga não pode renderizar a rota anterior');
  assert.equal(denied, 0, 'resposta antiga não pode mostrar acesso negado');

  pending[1]();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(previousCalls, 1, 'somente a navegação mais recente deve continuar');
  assert.equal(denied, 0);
});

test('rotas diretas sensíveis são reavaliadas quando CondoAccess termina de carregar', () => {
  const listeners = new Map();
  let routeCalls = 0;
  const access = {
    getSnapshot: () => ({ user: { id: 'u1' }, memberships: [], loadedAt: 'ready' }),
    hasAnyManagementRole: () => true,
    canAccessCondo: () => true,
    canCreateCondo: () => true,
    can: () => true,
    refresh: async () => {}
  };
  const window = {
    CondoAccess: access,
    financeConsolidatedPage: () => {},
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener() {}
  };
  const context = {
    window,
    location: { hash: '#/financeiro' },
    route: () => { routeCalls += 1; },
    document: { body: { classList: { remove() {} } }, querySelectorAll: () => [] },
    dashboard: () => {}, condosPage: () => {}, calendarPage: () => {}, maintenancesPage: () => {}, tasksPage: () => {}, callsPage: () => {},
    URLSearchParams,
    console,
    Promise,
    Set,
    setTimeout: fn => { fn(); return 1; }
  };

  vm.runInNewContext(MANAGEMENT_ROUTER, context, { filename: 'management-role-router.js' });
  const ready = listeners.get('condo-access-ready');
  assert.equal(typeof ready, 'function');
  const before = routeCalls;
  ready();
  assert.equal(routeCalls, before + 1, 'financeiro deve ser reavaliado quando acesso fica pronto');
});

test('camada de integridade restaura rota atual quando render assíncrono termina atrasado', async () => {
  let hash = '#/chamados';
  let resolveOld;
  let routeCalls = 0;
  const listeners = new Map();
  const oldRenderer = () => new Promise(resolve => { resolveOld = resolve; });

  const window = {
    callsPage: oldRenderer,
    addEventListener(type, fn) { listeners.set(type, fn); }
  };
  const context = {
    window,
    location: { get hash() { return hash; }, pathname: '/app/' },
    route: () => { routeCalls += 1; },
    queueMicrotask,
    Promise,
    Object,
    console
  };

  vm.runInNewContext(NAVIGATION_INTEGRITY, context, { filename: 'navigation-integrity.js' });
  assert.notEqual(window.callsPage, oldRenderer, 'callsPage deve ser envolvida pela proteção');

  const pendingRender = window.callsPage();
  hash = '#/manutencoes';
  resolveOld();
  await pendingRender;
  await new Promise(resolve => queueMicrotask(resolve));

  assert.equal(routeCalls, 1, 'a rota atual deve ser reconstruída após resposta atrasada');
});

test('camada de integridade não força rerender quando o hash continua igual', async () => {
  let routeCalls = 0;
  const window = { callsPage: async () => {}, addEventListener() {} };
  const context = {
    window,
    location: { hash: '#/chamados', pathname: '/app/' },
    route: () => { routeCalls += 1; },
    queueMicrotask,
    Promise,
    Object,
    console
  };
  vm.runInNewContext(NAVIGATION_INTEGRITY, context, { filename: 'navigation-integrity.js' });
  await window.callsPage();
  await new Promise(resolve => queueMicrotask(resolve));
  assert.equal(routeCalls, 0);
});

test('navigation-integrity carrega depois dos módulos e antes dos roteadores', () => {
  const pos = name => {
    const index = INDEX.indexOf(`./${name}`);
    assert.notEqual(index, -1, `${name} deve existir no index`);
    return index;
  };
  assert.ok(pos('navigation-integrity.js') > pos('structural-integrity-fixes.js'));
  assert.ok(pos('navigation-integrity.js') < pos('final-router.js'));
  assert.ok(pos('navigation-integrity.js') < pos('management-role-router.js'));
});
