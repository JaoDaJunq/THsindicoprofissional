const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('activity and gas enhancements are loaded after their base modules', () => {
  const html = fs.readFileSync('index.html','utf8');
  const audit = html.indexOf('./audit-workflow.js');
  const transition = html.indexOf('./transition-ui.js');
  const activity = html.indexOf('./team-activity.js');
  const gas = html.indexOf('./gas-management-enhancements.js');
  assert.ok(audit >= 0 && activity > audit);
  assert.ok(transition >= 0 && gas > transition);
});

test('team activity has user and date filters', () => {
  const js = fs.readFileSync('team-activity.js','utf8');
  assert.match(js,/activity-actor/);
  assert.match(js,/data-range="today"/);
  assert.match(js,/data-range="7"/);
  assert.match(js,/data-range="30"/);
  assert.match(js,/gas_controls:'Controle de gás'/);
  assert.match(js,/tasks:'Tarefa'/);
});

test('gas management supports manual room or unit creation and safe permissions', () => {
  const js = fs.readFileSync('gas-management-enhancements.js','utf8');
  assert.match(js,/\+ Sala \/ unidade/);
  assert.match(js,/unit_label: label/);
  assert.match(js,/created_by: user\.id/);
  assert.match(js,/operations\.manage/);
  assert.match(js,/gas_controls'\)\.insert/);
  assert.match(js,/gas_controls'\)\.delete/);
});