const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('boot-stability.js', 'utf8');
const css = fs.readFileSync('boot-stability.css', 'utf8');

function indexOfScript(name) {
  return html.indexOf(`<script src="./${name}"></script>`);
}

test('boot gate loads before legacy application renderers', () => {
  const boot = indexOfScript('boot-stability.js');
  const app = indexOfScript('app.js');
  const auth = indexOfScript('auth-extension.js');
  const access = indexOfScript('foundation-access.js');
  assert.ok(boot >= 0, 'boot-stability.js must be referenced');
  assert.ok(boot < app, 'boot gate must load before app.js');
  assert.ok(boot < auth, 'boot gate must load before auth-extension.js');
  assert.ok(boot < access, 'boot gate must load before foundation-access.js');
});

test('boot stylesheet is loaded before visual design layers', () => {
  const boot = html.indexOf('<link rel="stylesheet" href="./boot-stability.css" />');
  const design = html.indexOf('<link rel="stylesheet" href="./design-system.css" />');
  assert.ok(boot >= 0, 'boot-stability.css must be referenced');
  assert.ok(boot < design, 'boot concealment must exist before design layers paint');
});

test('intermediate app renders are hidden while booting', () => {
  assert.match(css, /body\.gc-booting\s+#app[\s\S]*opacity\s*:\s*0\s*!important/);
  assert.match(css, /body\.gc-booting\s+#app[\s\S]*visibility\s*:\s*hidden\s*!important/);
  assert.match(css, /body\.gc-booting\s+#gc-boot-screen[\s\S]*visibility\s*:\s*visible/);
});

test('boot does not release until access snapshot and route are ready', () => {
  assert.match(js, /snapshotReady\(\)/);
  assert.match(js, /routeReady\(\)/);
  assert.match(js, /!state\.scriptsReady\s*\|\|\s*!state\.accessReady\s*\|\|\s*!routeReady\(\)/);
  assert.match(js, /screenMatchesAccess\(\)/);
});

test('login, resident and management mismatches are blocked before reveal', () => {
  assert.match(js, /!snap\.user[\s\S]*cloud-login/);
  assert.match(js, /isResidentOnly/);
  assert.match(js, /hasAnyManagementRole/);
  assert.match(js, /app\.querySelector\('\.resident-app'\)/);
});

test('startup failure keeps stale content concealed and offers retry', () => {
  assert.match(js, /12000/);
  assert.match(js, /is-error/);
  assert.match(js, /location\.reload\(\)/);
  assert.match(css, /gc-boot-retry/);
});
