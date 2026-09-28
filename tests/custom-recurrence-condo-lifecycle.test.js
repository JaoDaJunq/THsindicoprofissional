const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const cloud = fs.readFileSync('cloud-operations.js','utf8');
const maintenance = fs.readFileSync('maintenance-workflow.js','utf8');
const auth = fs.readFileSync('auth-extension.js','utf8');
const lifecycle = fs.readFileSync('condominium-lifecycle.js','utf8');
const archiveMigration = fs.readFileSync('supabase/migrations/20260927_add_condominium_archive_and_safe_delete.sql','utf8');
const deleteMigration = fs.readFileSync('supabase/migrations/20260927_allow_confirmed_condominium_deletion.sql','utf8');
const index = fs.readFileSync('index.html','utf8');

test('maintenance creation supports custom recurrence in months or years', () => {
  assert.match(cloud,/value="custom">Personalizada/);
  assert.match(cloud,/name="customInterval"/);
  assert.match(cloud,/name="customUnit"/);
  assert.match(cloud,/unit==='years'\?interval\*12:interval/);
  assert.match(cloud,/recurrence_months:x\.recurrence==='custom'\?x\.recurrenceMonths:null/);
  assert.match(cloud,/recurrenceMonths:x\.recurrence_months/);
});

test('custom recurrence is shown in readable years when possible', () => {
  assert.match(maintenance,/recurrenceDisplay/);
  assert.match(maintenance,/months % 12 === 0/);
  assert.match(maintenance,/A cada \$\{years\} ano/);
});

test('archived condominiums are separated from active operational state', () => {
  assert.match(auth,/archived_at/);
  assert.match(auth,/activeVisible=visible\.filter\(c=>!c\.archived_at\)/);
  assert.match(auth,/archivedVisible=visible\.filter\(c=>Boolean\(c\.archived_at\)\)/);
  assert.match(auth,/data\.archivedCondos=archivedVisible\.map\(mapCondo\)/);
  assert.match(auth,/!data\.condos\.length && !\(data\.archivedCondos\|\|\[\]\)\.length/);
});

test('condominium lifecycle uses reversible archive and explicit permanent-delete confirmation', () => {
  assert.match(lifecycle,/archiveCondominium/);
  assert.match(lifecycle,/restoreCondominium/);
  assert.match(lifecycle,/archived_at: archivedAt/);
  assert.match(lifecycle,/archived_at: null/);
  assert.match(lifecycle,/delete_condominium_permanently/);
  assert.match(lifecycle,/name="certainty"/);
  assert.match(lifecycle,/Sim, tenho certeza/);
  assert.match(lifecycle,/p_confirmed: true/);
  assert.doesNotMatch(lifecycle,/from\('condominiums'\)\.delete/);
  assert.match(lifecycle,/Digite o nome do condomínio para confirmar/);
});

test('archive migration keeps the original guarded empty-delete path versioned', () => {
  assert.match(archiveMigration,/delete_condominium_if_empty/);
  assert.match(archiveMigration,/condominium_has_linked_data/);
});

test('confirmed-delete migration requires syndic, explicit confirmation and preserves last-syndic protection outside parent deletion', () => {
  assert.match(deleteMigration,/delete_condominium_permanently/);
  assert.match(deleteMigration,/p_confirmed is not true/);
  assert.match(deleteMigration,/confirmation_required/);
  assert.match(deleteMigration,/private\.has_condo_role\(p_condominium_id, array\['syndic'\]\)/);
  assert.match(deleteMigration,/if not exists \(/);
  assert.match(deleteMigration,/from public\.condominiums c/);
  assert.match(deleteMigration,/cannot_remove_last_syndic/);
});

test('condominium lifecycle loads after access and settings layers', () => {
  const access = index.indexOf('./foundation-access.js');
  const settings = index.indexOf('./condominium-settings.js');
  const lifecycleIndex = index.indexOf('./condominium-lifecycle.js');
  const pwa = index.indexOf('./pwa.js');
  assert.ok(access >= 0 && settings > access);
  assert.ok(lifecycleIndex > settings);
  assert.ok(pwa > lifecycleIndex);
});
