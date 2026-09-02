'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const source = fs.readFileSync(path.join(root, 'task-quick-edit.js'), 'utf8');

function pos(needle) {
  const index = html.indexOf(needle);
  assert.notEqual(index, -1, `${needle} deve existir no index`);
  return index;
}

test('quick edit carrega depois da tabela final de tarefas', () => {
  assert.ok(pos('./task-quick-edit.js') > pos('./transition-ui.js'));
  assert.ok(pos('./task-quick-edit.js') < pos('./structural-integrity-fixes.js'));
});

test('editar tarefa respeita operations.manage e RLS de condomínio', () => {
  assert.match(source, /CondoAccess\?\.can\('operations\.manage', cid\)/);
  assert.match(source, /if \(!canOperate\(task\.condoId\)\) return flash/);
  assert.match(source, /\.from\('tasks'\)/);
  assert.match(source, /\.update\(payload\)/);
  assert.match(source, /\.eq\('id', current\.id\)/);
  assert.match(source, /\.eq\('condominium_id', current\.condoId\)/);
  assert.match(source, /\.select\('id'\)/);
  assert.match(source, /if \(!updated\?\.id\) throw new Error/);
});

test('atalho não permite mover tarefa para outro condomínio', () => {
  assert.match(source, /O condomínio da tarefa não é alterado por este atalho/);
  assert.match(source, /<input value="\$\{safe\(condoName\(task\.condoId\)\)\}" disabled>/);
  assert.doesNotMatch(source, /name="condoId"/);
  assert.doesNotMatch(source, /condominium_id:\s*values/);
});

test('tabela mostra Editar e Concluir lado a lado somente para operação autorizada', () => {
  assert.match(source, /const manage = canOperate\(task\.condoId\)/);
  assert.match(source, /openTaskQuickEdit\('/);
  assert.match(source, /completeTask\('/);
  assert.match(source, /<div class="row-actions">\$\{edit\}\$\{complete\}<\/div>/);
  assert.match(source, /Somente leitura/);
});

test('modal edita campos operacionais úteis sem alterar status diretamente', () => {
  for (const field of ['title','description','responsible','dueDate','recurrence','priority','reminders']) {
    assert.match(source, new RegExp(`name="${field}"`), field);
  }
  assert.doesNotMatch(source, /name="status"/);
  assert.match(source, /Para concluir uma tarefa, continue usando o botão Concluir/);
});
