const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const registrySource = fs.readFileSync('navigation-registry.js','utf8');
const uxSource = fs.readFileSync('ux-v2.js','utf8');
const index = fs.readFileSync('index.html','utf8');
const css = fs.readFileSync('ux-v2.css','utf8');

function loadRegistry({hash='#/', memberships=[], grants={}}={}) {
  const context = {
    window: {},
    location: { hash },
    console,
  };
  context.window.window = context.window;
  context.window.CondoAccess = {
    getSnapshot: () => ({memberships}),
    can: (cap,cid) => Boolean(grants[`${cap}:${cid}`]),
  };
  vm.createContext(context);
  vm.runInContext(registrySource, context);
  return context.window.GCNavigation;
}

test('registry exposes one source for global and workspace navigation', () => {
  const nav = loadRegistry({
    hash:'#/condominio/c1/manutencoes',
    memberships:[{condominium_id:'c1'}],
    grants:{
      'operations.review:c1':true,
      'documents.manage:c1':true,
      'finance.review:c1':true,
      'team.manage:c1':true,
      'residents.manage:c1':true,
      'communications.manage:c1':true,
      'assemblies.manage:c1':true,
    }
  });
  const groups = nav.groups();
  assert.equal(groups.length,2);
  assert.ok(groups[0].items.some(i => i.id === 'dashboard'));
  assert.ok(groups[1].items.some(i => i.id === 'condo-maintenance'));
  assert.ok(groups[1].items.some(i => i.id === 'condo-finance'));
  assert.equal(nav.activeId(groups.flatMap(g=>g.items)),'condo-maintenance');
});

test('registry hides capability-gated routes when permission is absent', () => {
  const nav = loadRegistry({hash:'#/condominio/c1', memberships:[{condominium_id:'c1'}], grants:{}});
  const workspace = nav.workspace('c1');
  assert.equal(workspace.some(i => i.id === 'condo-finance'), false);
  assert.equal(workspace.some(i => i.id === 'condo-team'), false);
  assert.equal(workspace.some(i => i.id === 'condo-residents'), false);
  assert.equal(workspace.some(i => i.id === 'condo-overview'), true);
  assert.equal(workspace.some(i => i.id === 'condo-calendar'), true);
});

test('ux v2 is loaded after visual and routing layers', () => {
  const pos = name => index.indexOf(`./${name}`);
  assert.ok(pos('navigation-registry.js') > pos('remaining-views.js'));
  assert.ok(pos('ux-v2.js') > pos('navigation-registry.js'));
  assert.ok(pos('ux-v2.css') > pos('design-system-accessibility.css'));
});

test('ux layer stays client-only and does not create a second data source', () => {
  assert.doesNotMatch(uxSource,/\.from\s*\(/);
  assert.doesNotMatch(uxSource,/\bfetch\s*\(/);
  assert.doesNotMatch(uxSource,/XMLHttpRequest/);
  assert.doesNotMatch(uxSource,/createClient\s*\(/);
});

test('sidebar rendering is idempotent by signature', () => {
  assert.match(uxSource,/dataset\.uxSignature/);
  assert.match(uxSource,/if \(sidebar\.dataset\.uxSignature === signature\) return/);
  assert.doesNotMatch(uxSource,/resetRenderMarkers/);
});

test('workspace switch preserves current subroute', () => {
  assert.match(uxSource,/ctx\.parts\.slice\(2\)\.join\('\/'\)/);
  assert.match(uxSource,/`#\/condominio\/\$\{newCid\}\$\{suffix/);
});

test('workspace mobile removes redundant condominium column', () => {
  assert.match(uxSource,/ux-redundant-condo/);
  assert.match(css,/\.ux-hide-condo-column \.ux-redundant-condo\{display:none!important\}/);
});

test('ux v2 provides consistent product states and confirmation dialog', () => {
  assert.match(uxSource,/window\.GCUI = \{ skeleton, empty, error, confirm: confirmDialog \}/);
  assert.match(css,/\.ux-skeleton/);
  assert.match(css,/\.ux-state-empty/);
  assert.match(css,/\.ux-state-error/);
  assert.match(css,/\.ux-confirm-overlay/);
});
