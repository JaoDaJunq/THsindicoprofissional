'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const design = fs.readFileSync(path.join(root, 'design-system.css'), 'utf8');
const polish = fs.readFileSync(path.join(root, 'design-system-polish.css'), 'utf8');
const accessibility = fs.readFileSync(path.join(root, 'design-system-accessibility.css'), 'utf8');
const visual = fs.readFileSync(path.join(root, 'visual-system.js'), 'utf8');
const legacyMobile = fs.readFileSync(path.join(root, 'mobile-fixes.css'), 'utf8');

function positionOf(source, needle) {
  const index = source.indexOf(needle);
  assert.notEqual(index, -1, `${needle} deve existir`);
  return index;
}

function count(source, needle) {
  return source.split(needle).length - 1;
}

function mediaBlock(maxWidth) {
  const startToken = `@media(max-width:${maxWidth}px)`;
  const start = design.indexOf(startToken);
  assert.notEqual(start, -1, `${startToken} deve existir`);
  const next = design.indexOf('@media(', start + startToken.length);
  return design.slice(start, next === -1 ? design.length : next);
}

test('camadas visuais sobrescrevem o legado na ordem correta', () => {
  assert.ok(positionOf(html, './design-system.css') > positionOf(html, './mobile-fixes.css'));
  assert.ok(positionOf(html, './design-system-polish.css') > positionOf(html, './design-system.css'));
  assert.ok(positionOf(html, './design-system-accessibility.css') > positionOf(html, './design-system-polish.css'));
  const localStyles = [...html.matchAll(/<link[^>]+href=["']\.\/([^"']+\.css)["']/g)].map(match => match[1]);
  assert.equal(localStyles.at(-1), 'design-system-accessibility.css');
});

test('visual-system executa depois dos roteadores de estabilidade e antes do PWA', () => {
  assert.ok(positionOf(html, './visual-system.js') > positionOf(html, './workspace-route-stability.js'));
  assert.ok(positionOf(html, './visual-system.js') < positionOf(html, './pwa.js'));
});

test('mobile usa navegação off-canvas e sobrescreve a sidebar horizontal antiga', () => {
  assert.match(legacyMobile, /\.sidebar\{[\s\S]*position:sticky!important/);
  const tablet = mediaBlock(960);
  assert.match(tablet, /\.sidebar\{[\s\S]*position:fixed!important/);
  assert.match(tablet, /transform:translateX\(-104%\)/);
  assert.match(tablet, /body\.nav-open \.sidebar\{transform:translateX\(0\)/);
  assert.match(visual, /mobile-nav-toggle/);
  assert.match(visual, /mobile-nav-backdrop/);
  assert.match(visual, /const NAV_BREAKPOINT = 960/);
});

test('eventos globais do menu são vinculados uma única vez', () => {
  assert.match(visual, /let navigationEventsBound = false/);
  assert.match(visual, /if \(!navigationEventsBound\)/);
  assert.equal(count(visual, "document.addEventListener('keydown'"), 1);
  assert.match(visual, /navigationEventsBound = true/);
});

test('tabelas comuns recebem labels inclusive em linhas inseridas depois', () => {
  assert.match(visual, /table\.querySelectorAll\('tbody tr'\)\.forEach/);
  assert.match(visual, /const label = headers\[index\] \|\| 'Detalhe'/);
  assert.match(visual, /cell\.dataset\.label !== label/);
  assert.doesNotMatch(visual, /if \(!table \|\| table\.dataset\.mobileEnhanced === 'true'\) return/);
  assert.match(visual, /mobile-card-table/);
  assert.match(design, /content:attr\(data-label\)/);
});

test('polish mobile mantém marca legível e ações compactas', () => {
  assert.match(polish, /\.mobile-top \.brand strong\{[\s\S]*color:var\(--ui-text\)!important/);
  assert.match(polish, /\.top-actions>[.]icon-btn,[\s\S]*\.top-actions>[.]avatar\{[\s\S]*flex:0 0 42px!important/);
  assert.match(polish, /\.mobile-card-table \.table td:first-child\{[\s\S]*text-align:left!important/);
  assert.match(polish, /\.mobile-card-table \.row-actions\{[\s\S]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
});

test('calendário é explicitamente excluído da conversão para cards', () => {
  assert.match(visual, /table\.classList\.contains\('calendar'\)/);
  assert.match(visual, /table\.closest\('\.calendar-card'\)/);
});

test('breakpoints de KPI mantêm densidade 4 desktop, 2 mobile e 1 em telas muito estreitas', () => {
  assert.match(design, /\.metrics\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/);
  assert.match(mediaBlock(960), /\.metrics\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
  assert.match(mediaBlock(430), /\.metrics\{grid-template-columns:1fr 1fr!important/);
  assert.match(mediaBlock(350), /\.metrics\{grid-template-columns:1fr!important/);
});

test('conteúdo desktop possui limite e sidebar não cresce com o viewport', () => {
  assert.match(design, /--ui-content:1440px/);
  assert.match(design, /--ui-sidebar-width:240px/);
  assert.match(design, /grid-template-columns:var\(--ui-sidebar-width\) minmax\(0,1fr\)/);
  assert.match(design, /width:min\(100%,calc\(var\(--ui-content\) \+ 64px\)\)/);
});

test('design respeita foco, redução de movimento e alvos confortáveis', () => {
  assert.match(design, /:focus-visible/);
  assert.match(design, /prefers-reduced-motion:reduce/);
  assert.match(accessibility, /prefers-reduced-motion: reduce/);
  assert.match(accessibility, /\.sidebar[\s\S]*transition:none!important/);
  assert.match(design, /min-height:42px!important/);
  assert.match(design, /\.mobile-nav-toggle\{[\s\S]*width:44px;height:44px/);
});

test('formulários mobile usam 16px para evitar zoom automático no iOS', () => {
  assert.match(mediaBlock(700), /\.field input,\.field select,\.field textarea\{font-size:16px!important\}/);
});
