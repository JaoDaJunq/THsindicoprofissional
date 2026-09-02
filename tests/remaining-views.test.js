'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'remaining-views.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'remaining-views.js'), 'utf8');

function pos(needle) {
  const index = html.indexOf(needle);
  assert.notEqual(index, -1, `${needle} deve existir no index`);
  return index;
}

test('remaining views carrega antes da camada final de acessibilidade e antes do PWA', () => {
  assert.ok(pos('./remaining-views.css') > pos('./dashboard-insights-polish.css'));
  assert.ok(pos('./design-system-accessibility.css') > pos('./remaining-views.css'));
  assert.ok(pos('./remaining-views.js') > pos('./dashboard-insights.js'));
  assert.ok(pos('./remaining-views.js') < pos('./pwa.js'));
});

test('aprimoramentos restantes são estritamente client-side', () => {
  assert.doesNotMatch(js, /createClient\s*\(/);
  assert.doesNotMatch(js, /\.from\s*\(/);
  assert.doesNotMatch(js, /fetch\s*\(/);
  assert.doesNotMatch(js, /XMLHttpRequest/);
});

test('rotas principais recebem contexto visual explícito', () => {
  for (const view of ['condominiums','calls','documents','files','assemblies','team','residents','announcements','audit','integrations','notifications','tasks','gas']) {
    assert.match(js, new RegExp(`return '${view}'`), view);
    assert.match(css, new RegExp(`data-view=\\"${view}\\"|data-view="${view}"|data-view='${view}'`), view);
  }
});

test('chamados possui busca, prioridade, status e contador sem nova query', () => {
  assert.match(js, /data\.viewFilter = 'calls'/);
  assert.match(js, /data\.filterSearch = 'calls'/);
  assert.match(js, /data\.filterPriority = 'calls'/);
  assert.match(js, /data\.filterStatus = 'calls'/);
  assert.match(js, /function filterCalls\(\)/);
  assert.match(css, /\.view-filterbar/);
});

test('base de dados possui busca local e grid responsivo', () => {
  assert.match(js, /data\.viewFilter = 'files'/);
  assert.match(js, /function filterFiles\(\)/);
  assert.match(css, /body\[data-view="files"\] \.file-grid/);
  assert.match(css, /repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:350px\)[\s\S]*body\[data-view="files"\] \.file-grid\{grid-template-columns:1fr!important\}/);
});

test('camada cobre os quatro padrões estruturais restantes', () => {
  assert.match(css, /body\[data-view="assemblies"\] \.panel-body>\.card/);
  assert.match(css, /body\[data-view="integrations"\] \.integration-grid/);
  assert.match(css, /body\[data-view="audit"\] \.panel-head \.row-actions/);
  assert.match(css, /\.stats-grid,\.transition-kpis,\.kpi-strip/);
});