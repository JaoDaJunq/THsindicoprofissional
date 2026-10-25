const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('transition-ui.js','utf8');

test('gas status uses exact countdown days instead of broad 12 month warning', () => {
  assert.doesNotMatch(source,/Vence em até 12 meses/);
  assert.match(source,/Vencido há \$\{overdue\} dia/);
  assert.match(source,/label:'Hoje'/);
  assert.match(source,/label:'Amanhã'/);
  assert.match(source,/label:\`Em \$\{n\} dias\`/);
});

test('gas countdown preserves severity colors for urgent and healthy dates', () => {
  assert.match(source,/if\(n===0\)return\{label:'Hoje',cls:'bad'\}/);
  assert.match(source,/if\(n===1\)return\{label:'Amanhã',cls:'bad'\}/);
  assert.match(source,/if\(n<=7\)return\{label:\`Em \$\{n\} dias\`,cls:'warn'\}/);
  assert.match(source,/return\{label:\`Em \$\{n\} dias\`,cls:'good'\}/);
});
