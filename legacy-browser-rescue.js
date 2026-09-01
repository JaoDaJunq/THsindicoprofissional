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

  let browserKey = localStorage.getItem(BROWSER_KEY);
  if (!browserKey) {
    browserKey = crypto.randomUUID();
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