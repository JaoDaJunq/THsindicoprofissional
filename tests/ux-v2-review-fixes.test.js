const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('ux-v2-review-fixes.js','utf8');
const index = fs.readFileSync('index.html','utf8');

test('review hardening loads after resident v2 and before pwa', () => {
  const resident = index.indexOf('./resident-v2.js');
  const review = index.indexOf('./ux-v2-review-fixes.js');
  const pwa = index.indexOf('./pwa.js');
  assert.ok(resident >= 0 && review > resident && pwa > review);
});

test('staff unit management keeps Moradores/Unidades reachable', () => {
  assert.match(source, /units\.manage/);
  assert.match(source, /condo-residents/);
});

test('review-only management keeps Assemblies reachable', () => {
  assert.match(source, /operations\.review/);
  assert.match(source, /condo-assemblies/);
});

test('condominium switch preserves module rather than nested record ids', () => {
  assert.match(source, /activeId/);
  assert.match(source, /sameModule\?\.href/);
  assert.doesNotMatch(source, /parts\.slice\(2\)\.join/);
});

test('resident mobile More sheet restores assemblies entry', () => {
  assert.match(source, /#\/morador\/assemblies/);
  assert.match(source, /Reuniões e votações do condomínio/);
});

test('custom confirmations return focus to the opener', () => {
  assert.match(source, /document\.activeElement/);
  assert.match(source, /opener\.focus/);
});
