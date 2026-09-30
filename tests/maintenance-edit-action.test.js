const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const maintenance = fs.readFileSync('maintenance-workflow.js','utf8');
const transition = fs.readFileSync('transition-ui.js','utf8');
const index = fs.readFileSync('index.html','utf8');

test('maintenance edit action remains available after enhanced workflow takes over the page', () => {
  assert.match(transition,/window\.openMaintenanceEdit=async function/);
  assert.match(maintenance,/openMaintenanceEdit\('\$\{m\.id\}','\$\{m\.condoId\}'\)/);
  assert.match(maintenance,/Histórico/);
  assert.match(maintenance,/Concluir/);
});

test('maintenance edit, delete and completion stay permission-gated', () => {
  assert.match(maintenance,/const manageActions = canManage\(m\.condoId\)/);
  assert.match(maintenance,/openDeleteMaintenance/);
  assert.match(maintenance,/openCompleteMaintenance/);
});

test('maintenance deletion requires explicit confirmation and deletes through Supabase', () => {
  assert.match(maintenance,/Sim, quero excluir esta manutenção/);
  assert.match(maintenance,/button\.disabled = !certainty\?\.checked/);
  assert.match(maintenance,/\.from\('maintenances'\)/);
  assert.match(maintenance,/\.delete\(\)/);
  assert.match(maintenance,/\.eq\('condominium_id', m\.condoId\)/);
  assert.match(maintenance,/histórico de execuções vinculado/);
});

test('enhanced maintenance workflow loads after transition UI', () => {
  const transitionIndex = index.indexOf('./transition-ui.js');
  const maintenanceIndex = index.indexOf('./maintenance-workflow.js');
  assert.ok(transitionIndex >= 0);
  assert.ok(maintenanceIndex > transitionIndex);
});
