const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('index.html','utf8');
const command = fs.readFileSync('ux-command-center.js','utf8');
const resident = fs.readFileSync('resident-v2.js','utf8');
const commandCss = fs.readFileSync('ux-command-center.css','utf8');
const residentCss = fs.readFileSync('resident-v2.css','utf8');

const pos = name => index.indexOf(`./${name}`);

test('command center and resident v2 load after registry and before PWA', () => {
  assert.ok(pos('ux-command-center.js') > pos('navigation-registry.js'));
  assert.ok(pos('resident-v2.js') > pos('ux-command-center.js'));
  assert.ok(pos('pwa.js') > pos('resident-v2.js'));
  assert.ok(pos('design-system-accessibility.css') > pos('ux-command-center.css'));
  assert.ok(pos('design-system-accessibility.css') > pos('resident-v2.css'));
});

test('command center is client-side only', () => {
  assert.doesNotMatch(command,/createClient\s*\(/);
  assert.doesNotMatch(command,/\.from\s*\(\s*['"`]/);
  assert.doesNotMatch(command,/\bfetch\s*\(/);
  assert.doesNotMatch(command,/XMLHttpRequest/);
});

test('global search indexes existing state and respects current access helpers', () => {
  assert.match(command,/state\(\)\?\.condos/);
  assert.match(command,/\(d\.tasks \|\| \[\]\)/);
  assert.match(command,/\(d\.maintenances \|\| \[\]\)/);
  assert.match(command,/\(d\.calls \|\| \[\]\)/);
  assert.match(command,/can\('operations\.review', cid\)/);
  assert.match(command,/can\('documents\.manage', cid\)/);
  assert.match(command,/can\('assemblies\.manage', cid\)/);
});

test('quick create reuses existing creation workflows and capabilities', () => {
  assert.match(command,/openTaskModal/);
  assert.match(command,/openMaintenanceModal/);
  assert.match(command,/openCallModal/);
  assert.match(command,/openDocumentModal/);
  assert.match(command,/openAnnouncementModal/);
  assert.match(command,/operations\.manage/);
  assert.match(command,/documents\.manage/);
  assert.match(command,/communications\.manage/);
});

test('command center supports keyboard and mobile triggers', () => {
  assert.match(command,/event\.ctrlKey \|\| event\.metaKey/);
  assert.match(command,/event\.key\.toLowerCase\(\) === 'k'/);
  assert.match(command,/ArrowDown/);
  assert.match(command,/ArrowUp/);
  assert.match(command,/ux-command-mobile/);
  assert.match(command,/ux-quick-create-dock/);
  assert.match(commandCss,/\.ux-command-overlay/);
  assert.match(commandCss,/\.ux-quick-create-dock/);
});

test('resident v2 stays presentation-only and preserves existing data flow', () => {
  assert.doesNotMatch(resident,/createClient\s*\(/);
  assert.doesNotMatch(resident,/\.from\s*\(\s*['"`]/);
  assert.doesNotMatch(resident,/\bfetch\s*\(/);
  assert.doesNotMatch(resident,/XMLHttpRequest/);
  assert.match(resident,/resident-mobile-dock/);
  assert.match(resident,/resident-more-sheet/);
  assert.match(resident,/role','link'/);
  assert.match(residentCss,/\.resident-v2-active/);
  assert.match(residentCss,/\.resident-mobile-dock/);
});
