const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const guard = fs.readFileSync('user-center-role-guard.js', 'utf8');

test('resident account guard loads after user center and before PWA', () => {
  const center = html.indexOf('<script src="./user-center.js"></script>');
  const guardPos = html.indexOf('<script src="./user-center-role-guard.js"></script>');
  const pwa = html.indexOf('<script src="./pwa.js"></script>');
  assert.ok(center >= 0 && guardPos > center && pwa > guardPos);
});

test('resident-only accounts are isolated from management shell', () => {
  assert.match(guard, /isResidentOnly/);
  assert.match(guard, /\.sidebar/);
  assert.match(guard, /\.remove\(\)/);
  assert.match(guard, /#\/morador\/home/);
});

test('resident membership links return to resident portal', () => {
  assert.match(guard, /Morador/);
  assert.match(guard, /link\.href\s*=\s*['"]#\/morador\/home['"]/);
  assert.match(guard, /Portal do Morador/);
});
