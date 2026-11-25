const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const feature = fs.readFileSync('finance-delinquency.js','utf8');
const base = fs.readFileSync('finance-workflow.js','utf8');
const consolidated = fs.readFileSync('finance-consolidated.js','utf8');
const index = fs.readFileSync('index.html','utf8');
const migration = fs.readFileSync('supabase/migrations/20261125_add_finance_delinquency_tracking.sql','utf8');

test('finance delinquency module loads after the base finance modules', () => {
  const baseIndex = index.indexOf('./finance-workflow.js');
  const consolidatedIndex = index.indexOf('./finance-consolidated.js');
  const delinquencyIndex = index.indexOf('./finance-delinquency.js');
  assert.ok(baseIndex >= 0);
  assert.ok(consolidatedIndex > baseIndex);
  assert.ok(delinquencyIndex > consolidatedIndex);
});

test('delinquency is modeled as income and linked to a unit', () => {
  assert.match(feature,/kind: 'income'/);
  assert.match(feature,/is_delinquency: true/);
  assert.match(feature,/unit_id:/);
  assert.match(feature,/Inadimplência -/);
  assert.match(migration,/finance_transactions_delinquency_kind_check/);
  assert.match(migration,/check \(is_delinquency = false or kind = 'income'\)/);
});

test('finance page separates delinquency from overdue condominium expenses', () => {
  assert.match(feature,/Inadimplência em aberto/);
  assert.match(feature,/Contas vencidas/);
  assert.match(feature,/Despesas do condomínio/);
  assert.match(feature,/t\.kind === 'expense' && computedStatus\(t\) === 'overdue'/);
  assert.match(consolidated,/const delinquency=/);
  assert.match(consolidated,/const overdueExpenses=/);
});

test('finance rows expose details edit and payment actions', () => {
  assert.match(feature,/openFinanceDetails/);
  assert.match(feature,/openFinanceEditModal/);
  assert.match(feature,/openFinancePaymentModal/);
  assert.match(feature,/>Editar<\/button>/);
  assert.match(base,/window\.financePage\(cid,month\)/);
});

test('collection contacts are immutable timeline entries protected by RLS', () => {
  assert.match(migration,/create table if not exists public\.finance_collection_contacts/);
  assert.match(migration,/alter table public\.finance_collection_contacts enable row level security/);
  assert.match(migration,/finance_collection_contacts_select_review/);
  assert.match(migration,/finance_collection_contacts_insert_syndic/);
  assert.match(migration,/ft\.is_delinquency = true/);
  assert.doesNotMatch(migration,/grant update/);
  assert.doesNotMatch(migration,/grant delete/);
});

test('contact timeline supports channels and rich notes', () => {
  assert.match(feature,/Registrar contato/);
  assert.match(feature,/whatsapp:'WhatsApp'/);
  assert.match(feature,/phone:'Ligação'/);
  assert.match(feature,/email:'E-mail'/);
  assert.match(feature,/data-rich-text required/);
  assert.match(feature,/finance-contact-list/);
});

test('standard income form cannot accidentally classify a normal income as delinquency', () => {
  assert.match(base,/toLowerCase\(\)!=='inadimplência'/);
  assert.match(feature,/ensureDelinquencyCategory/);
});
