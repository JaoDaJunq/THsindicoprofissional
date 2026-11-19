const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const fixes = fs.readFileSync('assembly-voting-fixes.js','utf8');
const voting = fs.readFileSync('assembly-voting.js','utf8');

test('assembly edit uses rich text for agenda and minutes', () => {
  assert.match(fixes,/name="agenda" data-rich-text/);
  assert.match(fixes,/name="notes" data-rich-text/);
  assert.match(fixes,/Itens, assuntos e contexto da assembleia/);
  assert.match(fixes,/Registre observações, decisões e informações da ata/);
});

test('assembly workspace renders agenda and minutes through sanitized rich renderer', () => {
  assert.match(voting,/rich\(a\.agenda\)/);
  assert.match(voting,/rich\(a\.minutes_notes\)/);
  assert.match(voting,/gc-rich-output/);
  assert.match(voting,/Observações \/ ata/);
});
