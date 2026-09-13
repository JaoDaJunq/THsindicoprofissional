(() => {
  'use strict';
  if (!window.supabase) return;

  const SOURCE_KEY = 'condo_mvp_v2';
  const BROWSER_KEY = 'gc_legacy_browser_key_v1';
  const raw = localStorage.getItem(SOURCE_KEY);
  if (!raw) return;

  let payload;
  try { payload = JSON.parse(raw); } catch (_) { return; }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return;

  function browserId() {
    try {
      if (window.crypto?.randomUUID) return window.crypto.randomUUID();
      if (window.crypto?.getRandomValues) {
        const bytes = new Uint8Array(16);
        window.crypto.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
      }
    } catch (_) {}
    return `legacy-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  let browserKey = localStorage.getItem(BROWSER_KEY);
  if (!browserKey) {
    browserKey = browserId();
    localStorage.setItem(BROWSER_KEY, browserKey);
  }

  const captured = JSON.parse(JSON.stringify(payload));
  window.__GC_LEGACY_BROWSER_SNAPSHOT__ = captured;
  window.__GC_LEGACY_BROWSER_KEY__ = browserKey;

  const client = window.supabase.createClient(
    'https://tckvzlizcqdxzgavjwie.supabase.co',
    'sb_publishable_MRtiWP-ErwVKXqNbGFrW_g_FwEHsob3'
  );
  let saving = false;
  let saved = false;

  async function persistSnapshot() {
    if (saving || saved) return;
    const { data: sessionData } = await client.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return;
    saving = true;
    try {
      const { data: existing, error: selectError } = await client
        .from('legacy_browser_snapshots')
        .select('id')
        .eq('user_id', user.id)
        .eq('browser_key', browserKey)
        .eq('source_key', SOURCE_KEY)
        .maybeSingle();
      if (selectError) throw selectError;
      if (existing?.id) { saved = true; return; }

      const { error } = await client.from('legacy_browser_snapshots').insert({
        user_id: user.id,
        browser_key: browserKey,
        source_key: SOURCE_KEY,
        source_version: Number(captured.version) || null,
        payload: captured,
        captured_at: new Date().toISOString(),
        user_agent: navigator.userAgent || null
      });
      if (error) throw error;
      saved = true;
      console.info('[legacy-rescue] Snapshot antigo preservado no Supabase.');
    } catch (err) {
      console.warn('[legacy-rescue] Não foi possível preservar o snapshot remoto.', err);
    } finally {
      saving = false;
    }
  }

  client.auth.onAuthStateChange((event, session) => {
    if (session?.user && event !== 'SIGNED_OUT') setTimeout(persistSnapshot, 0);
  });
  persistSnapshot();
})();
