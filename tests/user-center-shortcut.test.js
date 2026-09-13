const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('user-center-shortcut.js', 'utf8');
const css = fs.readFileSync('user-center.css', 'utf8');

test('home account shortcut loads before PWA bootstrap', () => {
  const shortcut = html.indexOf('<script src="./user-center-shortcut.js"></script>');
  const pwa = html.indexOf('<script src="./pwa.js"></script>');
  assert.ok(shortcut >= 0 && pwa > shortcut);
});

test('shortcut points to authenticated account route', () => {
  assert.match(js, /href = '#\/conta'/);
  assert.match(js, /Abrir Minha conta/);
  assert.match(js, /\.topbar \.top-actions/);
  assert.match(js, /\.mobile-top/);
  assert.match(js, /\.resident-top/);
});

test('desktop and compact account controls have accessible focus styles', () => {
  assert.match(css, /\.uc-home-account\{/);
  assert.match(css, /\.uc-home-account--compact/);
  assert.match(css, /\.uc-home-account:focus-visible/);
  assert.match(css, /min-height:44px/);
});
