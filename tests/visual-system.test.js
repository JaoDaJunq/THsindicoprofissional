'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const design = fs.readFileSync(path.join(root, 'design-system.css'), 'utf8');
const visual = fs.readFileSync(path.join(root, 'visual-system.js'), 'utf8');

function positionOf(source, needle) {
  const index = source.indexOf(needle);
  assert.notEqual(index, -1, `${needle} deve existir`);
  return index;
}

test('design-system é a última folha local e pode sobrescrever legado visual', () => {
  assert.ok(positionOf(html, './design-system.css') > positionOf(html, './mobile-fixes.css'));
});

test('visual-system executa depois dos roteadores de estabilidade', () => {
  assert.ok(positionOf(html, './visual-system.js') > positionOf(html, './workspace-route-stability.js'));
});

test('mobile usa navegação off-canvas e não sidebar horizontal gigante', () => {
  assert.match(design, /@media\(max-width:960px\)/);
  assert.match(design, /transform:translateX\(-104%\)/);
  assert.match(design, /body\.nav-open \.sidebar\{transform:translateX\(0\)/);
  assert.match(visual, /mobile-nav-toggle/);
  assert.match(visual, /mobile-nav-backdrop/);
});

test('tabelas comuns recebem labels para virar cards no celular', () => {
  assert.match(visual, /cell\.dataset\.label = headers\[index\]/);
  assert.match(visual, /mobile-card-table/);
  assert.match(design, /content:attr\(data-label\)/);
});

test('design respeita foco, redução de movimento e alvos confortáveis', () => {
  assert.match(design, /:focus-visible/);
  assert.match(design, /prefers-reduced-motion:reduce/);
  assert.match(design, /min-height:42px!important/);
});
