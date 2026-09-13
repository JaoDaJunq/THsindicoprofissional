const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('user-center.js', 'utf8');
const css = fs.readFileSync('user-center.css', 'utf8');
const router = fs.readFileSync('final-router.js', 'utf8');

test('user center assets load before accessibility and before PWA bootstrap', () => {
  const centerCss = html.indexOf('<link rel="stylesheet" href="./user-center.css" />');
  const a11yCss = html.indexOf('<link rel="stylesheet" href="./design-system-accessibility.css" />');
  const centerJs = html.indexOf('<script src="./user-center.js"></script>');
  const pwaJs = html.indexOf('<script src="./pwa.js"></script>');
  assert.ok(centerCss >= 0 && a11yCss > centerCss);
  assert.ok(centerJs >= 0 && pwaJs > centerJs);
});

test('account route is authenticated and points to the user center', () => {
  assert.match(router, /p\[0\]\s*===\s*['"]conta['"]/);
  assert.match(router, /userCenterPage/);
  assert.match(router, /hasAuthenticatedAccessSnapshot/);
});

test('profile editing is scoped to the current authenticated user', () => {
  assert.match(js, /from\(['"]profiles['"]\)\.update/);
  assert.match(js, /\.eq\(['"]id['"],\s*ctx\.user\.id\)/);
  assert.match(js, /full_name/);
  assert.match(js, /phone/);
});

test('avatar upload is scoped to user folder and validates type and size', () => {
  assert.match(js, /profile-avatars/);
  assert.match(js, /ctx\.user\.id/);
  assert.match(js, /image\/jpeg/);
  assert.match(js, /image\/png/);
  assert.match(js, /image\/webp/);
  assert.match(js, /3 \* 1024 \* 1024/);
});

test('notification preferences and global sign out are implemented', () => {
  assert.match(js, /push_preferences/);
  assert.match(js, /upsert\(payload/);
  assert.match(js, /scope:\s*['"]global['"]/);
  assert.match(js, /resetPasswordForEmail/);
});

test('mobile account layout has narrow viewport rules and keyboard focus treatment', () => {
  assert.match(css, /@media\(max-width:640px\)/);
  assert.match(css, /@media\(max-width:360px\)/);
  assert.match(css, /:focus-visible/);
});
