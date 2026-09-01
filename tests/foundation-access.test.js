'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'foundation-access.js'), 'utf8');

function queryResult(rows) {
  const query = {
    select() { return query; },
    eq() { return query; },
    then(resolve, reject) {
      return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
    }
  };
  return query;
}

async function loadAccess({ user, memberships = [] }) {
  const client = {
    auth: {
      async getSession() {
        return { data: { session: user ? { user } : null }, error: null };
      },
      onAuthStateChange() {}
    },
    from(table) {
      assert.equal(table, 'condominium_members');
      return queryResult(memberships);
    }
  };

  class FakeCustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  }

  const window = {
    supabase: { createClient: () => client },
    dispatchEvent() {}
  };

  const context = {
    window,
    console,
    CustomEvent: FakeCustomEvent,
    setTimeout: fn => { fn(); return 1; },
    clearTimeout() {},
    Date,
    Set,
    Array,
    Object,
    Error
  };

  vm.runInNewContext(SOURCE, context, { filename: 'foundation-access.js' });
  assert.ok(window.CondoAccess, 'foundation-access.js deve publicar window.CondoAccess');
  await window.CondoAccess.refresh();
  return window.CondoAccess;
}

const membership = (role, condominiumId = 'condo-a') => ({
  condominium_id: condominiumId,
  role,
  unit_id: null,
  is_active: true
});

const user = (systemRole = null) => ({
  id: 'user-1',
  app_metadata: systemRole ? { system_role: systemRole } : {}
});

test('síndico possui as capacidades administrativas esperadas', async () => {
  const access = await loadAccess({ user: user(), memberships: [membership('syndic')] });

  for (const capability of [
    'condo.view', 'condo.manage', 'team.manage', 'units.manage',
    'residents.manage', 'operations.manage', 'operations.review',
    'documents.manage', 'assemblies.manage', 'communications.manage',
    'finance.manage', 'finance.review'
  ]) {
    assert.equal(access.can(capability, 'condo-a'), true, capability);
  }
});

test('staff opera o condomínio sem receber poderes exclusivos do síndico', async () => {
  const access = await loadAccess({ user: user(), memberships: [membership('staff')] });

  for (const capability of [
    'condo.view', 'units.manage', 'operations.manage', 'operations.review',
    'documents.manage', 'assemblies.manage', 'communications.manage'
  ]) {
    assert.equal(access.can(capability, 'condo-a'), true, capability);
  }

  for (const capability of [
    'condo.manage', 'team.manage', 'residents.manage', 'finance.manage', 'finance.review'
  ]) {
    assert.equal(access.can(capability, 'condo-a'), false, capability);
  }
});

test('conselho revisa operação e financeiro sem ganhar permissão de edição', async () => {
  const access = await loadAccess({ user: user(), memberships: [membership('council')] });

  assert.equal(access.can('condo.view', 'condo-a'), true);
  assert.equal(access.can('operations.review', 'condo-a'), true);
  assert.equal(access.can('finance.review', 'condo-a'), true);

  for (const capability of [
    'condo.manage', 'team.manage', 'units.manage', 'residents.manage',
    'operations.manage', 'documents.manage', 'assemblies.manage',
    'communications.manage', 'finance.manage'
  ]) {
    assert.equal(access.can(capability, 'condo-a'), false, capability);
  }
});

test('morador fica restrito à visualização do próprio condomínio', async () => {
  const access = await loadAccess({ user: user(), memberships: [membership('resident')] });

  assert.equal(access.can('condo.view', 'condo-a'), true);
  assert.equal(access.isResidentOnly(), true);
  assert.equal(access.hasAnyManagementRole(), false);
  assert.equal(access.can('operations.review', 'condo-a'), false);
  assert.equal(access.can('finance.review', 'condo-a'), false);
});

test('papel em um condomínio não vaza autorização para outro', async () => {
  const access = await loadAccess({
    user: user(),
    memberships: [membership('syndic', 'condo-a'), membership('resident', 'condo-b')]
  });

  assert.equal(access.can('condo.manage', 'condo-a'), true);
  assert.equal(access.can('condo.manage', 'condo-b'), false);
  assert.equal(access.can('condo.view', 'condo-b'), true);
  assert.equal(access.canAccessCondo('condo-c'), false);
});

test('somente manager e superadmin de sistema podem criar condomínio', async () => {
  const manager = await loadAccess({ user: user('manager') });
  const superadmin = await loadAccess({ user: user('superadmin') });
  const regular = await loadAccess({ user: user() });

  assert.equal(manager.canCreateCondo(), true);
  assert.equal(superadmin.canCreateCondo(), true);
  assert.equal(regular.canCreateCondo(), false);
});

test('getSnapshot devolve cópia e não permite mutar a autorização interna', async () => {
  const access = await loadAccess({ user: user(), memberships: [membership('syndic')] });
  const snapshot = access.getSnapshot();
  snapshot.memberships[0].role = 'resident';
  snapshot.memberships.push(membership('resident', 'condo-b'));

  assert.deepEqual(Array.from(access.rolesFor('condo-a')), ['syndic']);
  assert.equal(access.canAccessCondo('condo-b'), false);
});
