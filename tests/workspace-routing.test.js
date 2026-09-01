'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');

function localScripts() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  return [...html.matchAll(/<script\s+src=["']\.\/([^"']+)["']/g)].map(match => match[1]);
}

test('camada de estabilidade carrega depois dos roteadores definitivos', () => {
  const scripts = localScripts();
  const stability = scripts.indexOf('workspace-route-stability.js');

  assert.notEqual(stability, -1, 'workspace-route-stability.js deve estar no index');
  for (const router of ['final-router.js', 'route-access-guard.js', 'management-role-router.js']) {
    assert.ok(stability > scripts.indexOf(router), `${router} precisa carregar antes da estabilidade`);
  }
});

test('módulos definitivos de chamados e manutenção carregam depois das versões legadas', () => {
  const scripts = localScripts();

  assert.ok(
    scripts.indexOf('service-requests-ui.js') > scripts.indexOf('operations-ui.js'),
    'service-requests-ui.js deve ser o dono final dos Chamados'
  );
  assert.ok(
    scripts.indexOf('maintenance-workflow.js') > scripts.indexOf('transition-ui.js'),
    'maintenance-workflow.js deve ser o dono final de Manutenções'
  );
});

test('captura de hashchange bloqueia listeners antigos e chama a rota final uma vez', () => {
  const source = fs.readFileSync(path.join(ROOT, 'workspace-route-stability.js'), 'utf8');
  let routeCalls = 0;
  let captureListener = null;
  let stopped = 0;

  const window = {
    CondoAccess: { can: () => false },
    condoManagementDashboard: async () => {},
    addEventListener(type, listener, capture) {
      if (type === 'hashchange' && capture === true) captureListener = listener;
    },
    removeEventListener() {},
    openCondoSettings() {}
  };

  const context = {
    window,
    location: { hash: '#/condominio/condo-a' },
    document: { querySelector: () => null, createElement: () => ({}) },
    console,
    setTimeout: fn => { fn(); return 1; },
    route: () => { routeCalls += 1; },
    condoOverview: () => {},
    Promise,
    Error
  };

  vm.runInNewContext(source, context, { filename: 'workspace-route-stability.js' });
  assert.equal(typeof captureListener, 'function', 'deve registrar listener de captura');

  captureListener({ stopImmediatePropagation: () => { stopped += 1; } });

  assert.equal(stopped, 1, 'deve interromper os listeners antigos');
  assert.equal(routeCalls, 1, 'deve delegar a navegação exatamente uma vez');
});

test('chamadas antigas de condoOverview apontam para o dashboard V2', async () => {
  const source = fs.readFileSync(path.join(ROOT, 'workspace-route-stability.js'), 'utf8');
  let rendered = 0;

  const finalDashboard = async cid => {
    assert.equal(cid, 'condo-a');
    rendered += 1;
  };

  const window = {
    CondoAccess: { can: () => false },
    condoManagementDashboard: finalDashboard,
    addEventListener() {},
    removeEventListener() {}
  };

  const context = {
    window,
    location: { hash: '#/' },
    document: { querySelector: () => null, createElement: () => ({}) },
    console,
    setTimeout: fn => { fn(); return 1; },
    route: () => {},
    condoOverview: () => {},
    Promise,
    Error
  };

  vm.runInNewContext(source, context, { filename: 'workspace-route-stability.js' });
  await context.condoOverview('condo-a');

  assert.equal(rendered, 1);
  assert.equal(window.condoOverview, window.condoManagementDashboard);
});
