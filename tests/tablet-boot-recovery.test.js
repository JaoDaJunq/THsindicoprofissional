const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const boot = fs.readFileSync('boot-stability.js', 'utf8');
const legacy = fs.readFileSync('legacy-browser-rescue.js', 'utf8');
const access = fs.readFileSync('foundation-access.js', 'utf8');

test('Supabase CDN has a second provider fallback before app modules start', () => {
  const primary = html.indexOf('cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4');
  const fallback = html.indexOf('unpkg.com/@supabase/supabase-js@2.112.4');
  const runtime = html.indexOf('<script src="./runtime-stability.js"></script>');
  assert.ok(primary >= 0);
  assert.ok(fallback > primary);
  assert.ok(runtime > fallback);
  assert.match(html, /if \(!window\.supabase\)/);
});

test('retry clears only this application service worker/cache before reload', () => {
  assert.match(boot, /getRegistrations\(\)/);
  assert.match(boot, /THsindicoprofissional/);
  assert.match(boot, /gestao-condominial-shell-/);
  assert.match(boot, /location\.replace/);
});

test('legacy rescue does not require crypto.randomUUID support', () => {
  assert.match(legacy, /crypto\?\.randomUUID/);
  assert.match(legacy, /getRandomValues/);
  assert.match(legacy, /legacy-\$\{Date\.now\(\)\}/);
});

test('access bootstrap reports errors to the boot gate', () => {
  assert.match(access, /condo-access-error/);
  assert.match(access, /reportAccessError/);
  assert.match(boot, /condo-access-error/);
});
