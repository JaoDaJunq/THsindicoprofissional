const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('social-auth-login.js', 'utf8');
const css = fs.readFileSync('social-auth-login.css', 'utf8');

test('social auth assets are loaded without overriding accessibility layer', () => {
  const authScript = html.indexOf('<script src="./auth-extension.js"></script>');
  const socialScript = html.indexOf('<script src="./social-auth-login.js"></script>');
  const socialCss = html.indexOf('<link rel="stylesheet" href="./social-auth-login.css" />');
  const accessibilityCss = html.indexOf('<link rel="stylesheet" href="./design-system-accessibility.css" />');
  assert.ok(authScript >= 0 && socialScript > authScript);
  assert.ok(socialCss >= 0 && accessibilityCss > socialCss);
});

test('Google login uses Supabase OAuth and returns to the GitHub Pages app', () => {
  assert.match(js, /signInWithOAuth\s*\(\s*\{/);
  assert.match(js, /provider:\s*['"]google['"]/);
  assert.match(js, /redirectTo/);
  assert.match(js, /location\.origin/);
  assert.match(js, /location\.pathname/);
  assert.match(js, /prompt:\s*['"]select_account['"]/);
});

test('existing email and password login remains available', () => {
  assert.match(js, /#cloud-login/);
  assert.match(js, /Entrar com e-mail/);
  assert.match(js, /Continuar com Google/);
  assert.match(js, /ou continue com e-mail/);
});

test('social auth contains no privileged Supabase credentials', () => {
  assert.doesNotMatch(js, /service_role/i);
  assert.doesNotMatch(js, /sb_secret_/i);
  assert.match(js, /sb_publishable_/);
});

test('Google button has keyboard focus and mobile styling', () => {
  assert.match(css, /\.google-signin-button:focus-visible/);
  assert.match(css, /@media\(max-width:520px\)/);
  assert.match(css, /prefers-reduced-motion/);
});
