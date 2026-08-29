(() => {
  'use strict';

  const SUPABASE_URL = 'https://tckvzlizcqdxzgavjwie.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3';

  if (!window.supabase) {
    console.warn('[foundation-access] Supabase SDK indisponível.');
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  let snapshot = {
    user: null,
    memberships: [],
    loadedAt: null
  };

  const ACTIVE_ROLES = new Set(['syndic', 'resident', 'staff', 'council']);
  const MANAGEMENT_ROLES = Object.freeze(['syndic', 'staff', 'council']);
  const CAPABILITIES = Object.freeze({
    'condo.view': ['syndic', 'resident', 'staff', 'council'],
    'condo.manage': ['syndic'],
    'team.manage': ['syndic'],
    'units.manage': ['syndic', 'staff'],
    'residents.manage': ['syndic'],
    'operations.manage': ['syndic', 'staff'],
    'operations.review': ['syndic', 'staff', 'council'],
    'documents.manage': ['syndic', 'staff'],
    'assemblies.manage': ['syndic', 'staff'],
    'communications.manage': ['syndic', 'staff'],
    'finance.manage': ['syndic'],
    'finance.review': ['syndic', 'council']
  });

  async function refresh() {
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;

    const user = sessionData?.session?.user || null;
    if (!user) {
      snapshot = { user: null, memberships: [], loadedAt: new Date().toISOString() };
      window.dispatchEvent(new CustomEvent('condo-access-ready', { detail: getSnapshot() }));
      return getSnapshot();
    }

    const { data: memberships, error } = await client
      .from('condominium_members')
      .select('condominium_id,role,unit_id,is_active')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) throw error;

    snapshot = {
      user,
      memberships: (memberships || []).filter(row => ACTIVE_ROLES.has(row.role)),
      loadedAt: new Date().toISOString()
    };

    window.dispatchEvent(new CustomEvent('condo-access-ready', { detail: getSnapshot() }));
    return getSnapshot();
  }

  function membershipsFor(condominiumId) {
    return snapshot.memberships.filter(row => row.condominium_id === condominiumId);
  }

  function canAccessCondo(condominiumId) {
    if (!snapshot.user || !condominiumId) return false;
    return membershipsFor(condominiumId).length > 0;
  }

  function rolesFor(condominiumId) {
    return membershipsFor(condominiumId).map(row => row.role);
  }

  function hasAnyRole(condominiumId, roles) {
    const allowed = new Set(Array.isArray(roles) ? roles : [roles]);
    return membershipsFor(condominiumId).some(row => allowed.has(row.role));
  }

  function hasAnyManagementRole(condominiumId = null) {
    if (condominiumId) return hasAnyRole(condominiumId, MANAGEMENT_ROLES);
    return snapshot.memberships.some(row => MANAGEMENT_ROLES.includes(row.role));
  }

  function isResidentOnly() {
    return snapshot.memberships.length > 0 && !hasAnyManagementRole();
  }

  function canCreateCondo() {
    const systemRole = snapshot.user?.app_metadata?.system_role;
    return systemRole === 'manager' || systemRole === 'superadmin';
  }

  function can(capability, condominiumId) {
    const roles = CAPABILITIES[capability];
    if (!roles) return false;
    return hasAnyRole(condominiumId, roles);
  }

  function canManageCondo(condominiumId) {
    return can('condo.manage', condominiumId);
  }

  function canOperateCondo(condominiumId) {
    return can('operations.manage', condominiumId);
  }

  function canReviewCondo(condominiumId) {
    return can('operations.review', condominiumId);
  }

  function assertCondoAccess(condominiumId, roles = null) {
    const allowed = roles ? hasAnyRole(condominiumId, roles) : canAccessCondo(condominiumId);
    if (!allowed) {
      const error = new Error('Você não tem permissão para acessar este condomínio.');
      error.code = 'CONDO_ACCESS_DENIED';
      throw error;
    }
    return true;
  }

  function assertCapability(capability, condominiumId) {
    if (!can(capability, condominiumId)) {
      const error = new Error('Você não tem permissão para realizar esta ação neste condomínio.');
      error.code = 'CONDO_CAPABILITY_DENIED';
      error.capability = capability;
      throw error;
    }
    return true;
  }

  function getSnapshot() {
    return {
      user: snapshot.user,
      memberships: snapshot.memberships.map(row => ({ ...row })),
      loadedAt: snapshot.loadedAt
    };
  }

  window.CondoAccess = Object.freeze({
    refresh,
    getSnapshot,
    membershipsFor,
    rolesFor,
    canAccessCondo,
    canManageCondo,
    canOperateCondo,
    canReviewCondo,
    canCreateCondo,
    hasAnyManagementRole,
    isResidentOnly,
    hasAnyRole,
    can,
    assertCondoAccess,
    assertCapability,
    capabilities: CAPABILITIES,
    managementRoles: MANAGEMENT_ROLES
  });

  client.auth.onAuthStateChange(() => {
    setTimeout(() => refresh().catch(err => console.warn('[foundation-access]', err)), 0);
  });

  refresh().catch(err => console.warn('[foundation-access]', err));
})();
