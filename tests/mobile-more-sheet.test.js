'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'mobile-more-sheet.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'mobile-more-sheet.js'), 'utf8');

test('Mais usa bottom sheet dedicado e não depende do drawer lateral', () => {
  assert.match(html, /\.\/mobile-more-sheet\.css/);
  assert.match(html, /\.\/mobile-more-sheet\.js/);
  assert.ok(html.indexOf('./mobile-more-sheet.js') > html.indexOf('./visual-system.js'));
  assert.match(js, /mobile-dock-more/);
  assert.match(js, /event\.stopImmediatePropagation\(\)/);
  assert.match(js, /mobile-more-open/);
  assert.match(js, /function closeLegacyDrawer\(\)/);
  assert.match(css, /\.mobile-more-sheet\{/);
  assert.match(css, /bottom:calc\(8px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /height:min\(68dvh,620px\)/);
});

test('Mais mostra apenas rotas que não estão no dock inferior', () => {
  assert.match(js, /function dockHrefs\(\)/);
  assert.match(js, /function extraLinks\(\)/);
  assert.match(js, /activeSourceLinks\(\)\.filter\(link => !visible\.has\(link\.href\)\)/);
});

test('sheet fecha por backdrop, botão, Escape, rota e resize', () => {
  assert.match(js, /backdrop\.addEventListener\('click', closeSheet\)/);
  assert.match(js, /mobile-more-close/);
  assert.match(js, /event\.key === 'Escape'/);
  assert.match(js, /sheet\.querySelectorAll\('a'\)\.forEach\(link => link\.addEventListener\('click', closeSheet\)\)/);
  assert.match(js, /window\.addEventListener\('resize'/);
  assert.match(js, /window\.addEventListener\('hashchange', handleRouteChange/);
});

test('hamburguer usa sheet completo e sidebar quebrado fica neutralizado', () => {
  assert.match(js, /event\.target\.closest\?\.\('\.mobile-nav-toggle'\)/);
  assert.match(js, /openSheet\('all'\)/);
  assert.match(js, /const SHEET_BREAKPOINT = 960/);
  assert.match(css, /body\.nav-open \.sidebar\{transform:translateX\(-104%\)!important\}/);
  assert.match(css, /\.mobile-more-sheet\[data-mode="all"\]/);
  assert.match(js, /groupsMarkup\(allGroups\)/);
});

test('sheet pode expandir e recolher por gesto vertical', () => {
  assert.match(js, /function bindDrag\(sheet\)/);
  assert.match(js, /pointerdown/);
  assert.match(js, /pointermove/);
  assert.match(js, /pointerup/);
  assert.match(js, /deltaY < -50/);
  assert.match(js, /deltaY > 140/);
  assert.match(css, /\.mobile-more-sheet\.is-expanded\{/);
  assert.match(css, /touch-action:none/);
});

test('home e workspace possuem contexto visual e textual distintos', () => {
  assert.match(js, /context-workspace/);
  assert.match(js, /context-main/);
  assert.match(js, /Workspace do condomínio/);
  assert.match(js, /workspaceName\(\)/);
  assert.match(css, /body\.context-workspace \.mobile-top\{/);
  assert.match(css, /body\.context-main \.mobile-top\{/);
  assert.match(css, /body\.context-workspace \.mobile-bottom-dock\{/);
});

test('atalho quadrado antigo some do header mobile', () => {
  assert.match(css, /\.mobile-top>\.icon-btn\{display:none!important\}/);
});

test('troca de rota fecha overlays e retorna viewport ao topo', () => {
  assert.match(js, /function scrollRouteToTop\(\)/);
  assert.match(js, /window\.scrollTo\(\{ top: 0, left: 0, behavior: 'auto' \}\)/);
  assert.match(js, /document\.scrollingElement\.scrollTop = 0/);
  assert.match(js, /requestAnimationFrame\(scrollRouteToTop\)/);
});
