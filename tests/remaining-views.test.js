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

test('rotas principais recebem contexto visual explícito no runtime', () => {
  for (const view of ['condominiums','calls','documents','files','assemblies','team','residents','announcements','audit','integrations','notifications','tasks','gas']) {
    assert.match(js, new RegExp(`return '${view}'`), view);
  }
  assert.match(js, /document\.body\.dataset\.view\s*=\s*view/);
});

test('famílias de layout restantes possuem cobertura visual', () => {
  assert.match(css, /body\[data-view="calls"\]/);
  assert.match(css, /body\[data-view="files"\]/);
  assert.match(css, /body\[data-view="assemblies"\]/);
  assert.match(css, /body\[data-view="announcements"\]/);
  assert.match(css, /body\[data-view="documents"\]/);
  assert.match(css, /body\[data-view="audit"\]/);
  assert.match(css, /body\[data-view="integrations"\]/);
  assert.match(css, /body\[data-view="notifications"\]/);
  assert.match(css, /body\[data-view="tasks"\]/);
  assert.match(css, /body\[data-view="gas"\]/);
  assert.match(css, /body\[data-view="condominiums"\]/);
  assert.match(css, /body\[data-view="team"\]/);
  assert.match(css, /body\[data-view="residents"\]/);
});

test('chamados possui busca, prioridade, status, contador e ocultação forte', () => {
  assert.match(js, /dataset\.viewFilter\s*=\s*'calls'/);
  assert.match(js, /dataset\.filterSearch\s*=\s*'calls'/);
  assert.match(js, /dataset\.filterPriority\s*=\s*'calls'/);
  assert.match(js, /dataset\.filterStatus\s*=\s*'calls'/);
  assert.match(js, /function filterCalls\(\)/);
  assert.match(js, /classList\.toggle\('view-filter-hidden'/);
  assert.match(css, /\.view-filter-hidden\{display:none!important\}/);
});

test('base de dados possui busca local, plural correto e grid responsivo', () => {
  assert.match(js, /dataset\.viewFilter\s*=\s*'files'/);
  assert.match(js, /function filterFiles\(\)/);
  assert.match(js, /'1 item'/);
  assert.match(js, /`\$\{visible\} itens`/);
  assert.match(css, /body\[data-view="files"\] \.file-grid/);
  assert.match(css, /repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:350px\)[\s\S]*body\[data-view="files"\] \.file-grid\{grid-template-columns:1fr!important\}/);
});

test('camada cobre tabela, grid, feed, filtros e módulos legados', () => {
  assert.match(css, /body\[data-view="assemblies"\] \.panel-body>\.card/);
  assert.match(css, /body\[data-view="integrations"\] \.integration-grid/);
  assert.match(css, /body\[data-view="audit"\] \.panel-head \.row-actions/);
  assert.match(css, /\.stats-grid,\.transition-kpis,\.kpi-strip/);
});