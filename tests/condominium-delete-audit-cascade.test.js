const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const migration = fs.readFileSync('supabase/migrations/20261016_fix_condominium_delete_audit_cascade.sql','utf8');

test('cascade child deletes skip audit insert after condominium parent is gone', () => {
  assert.match(migration,/tg_op='DELETE'/);
  assert.match(migration,/tg_table_name <> 'condominiums'/);
  assert.match(migration,/not exists \(/);
  assert.match(migration,/from public\.condominiums c/);
  assert.match(migration,/where c\.id = condo/);
  assert.match(migration,/return old/);
});

test('normal audit inserts remain intact', () => {
  assert.match(migration,/insert into public\.audit_events/);
  assert.match(migration,/private\.audit_jsonb_diff/);
  assert.match(migration,/auth\.uid\(\)/);
});
