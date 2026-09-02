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
  assert.match(js, /document\.body\.classList\.remove\('nav-open'\)/);
  assert.match(css, /\.mobile-more-sheet\{/);
  assert.match(css, /bottom:calc\(8px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /max-height:min\(72dvh,620px\)/);
});

test('Mais mostra apenas rotas que não estão no dock inferior', () => {
  assert.match(js, /function dockHrefs\(\)/);
  assert.match(js, /function extraLinks\(\)/);
  assert.match(js, /sourceLinks\(\)\.filter\(link => !visible\.has\(link\.href\)\)/);
});

test('sheet fecha por backdrop, botão, Escape, rota e resize', () => {
  assert.match(js, /backdrop\.addEventListener\('click', closeSheet\)/);
  assert.match(js, /mobile-more-close/);
  assert.match(js, /event\.key === 'Escape'/);
  assert.match(js, /sheet\.querySelectorAll\('a'\)\.forEach\(link => link\.addEventListener\('click', closeSheet\)\)/);
  assert.match(js, /window\.addEventListener\('resize'/);
});
