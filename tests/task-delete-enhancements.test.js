const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('task-delete-enhancements.js','utf8');
const index = fs.readFileSync('index.html','utf8');

test('task delete enhancement loads after task quick edit', () => {
  const quick = index.indexOf('./task-quick-edit.js');
  const remove = index.indexOf('./task-delete-enhancements.js');
  assert.ok(quick >= 0);
  assert.ok(remove > quick);
});

test('task delete requires management access and explicit confirmation', () => {
  assert.match(source,/operations\.manage/);
  assert.match(source,/Sim, quero excluir esta tarefa/);
  assert.match(source,/button\.disabled = !certainty\.checked/);
  assert.match(source,/Confirme que deseja excluir esta tarefa/);
});

test('task delete uses scoped Supabase delete and refreshes the route', () => {
  assert.match(source,/\.from\('tasks'\)/);
  assert.match(source,/\.delete\(\)/);
  assert.match(source,/\.eq\('id', current\.id\)/);
  assert.match(source,/\.eq\('condominium_id', current\.condoId\)/);
  assert.match(source,/Tarefa excluída/);
  assert.match(source,/typeof route === 'function'/);
});

test('delete button is inserted in task row actions', () => {
  assert.match(source,/data-task-delete/);
  assert.match(source,/button\.textContent = 'Excluir'/);
  assert.match(source,/actions\.insertBefore\(button, complete\)/);
});
