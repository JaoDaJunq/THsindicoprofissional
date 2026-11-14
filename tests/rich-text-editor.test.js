const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('index.html','utf8');
const editor = fs.readFileSync('rich-text-editor.js','utf8');
const communication = fs.readFileSync('communication-workflow.js','utf8');
const tasks = fs.readFileSync('task-quick-edit.js','utf8');
const requests = fs.readFileSync('service-requests-ui.js','utf8');
const documents = fs.readFileSync('document-workflow.js','utf8');
const assemblies = fs.readFileSync('assembly-voting.js','utf8');
const maintenance = fs.readFileSync('maintenance-workflow.js','utf8');

test('rich text assets load before feature modules and accessibility remains final CSS', () => {
  assert.ok(index.indexOf('./rich-text-editor.js') > index.indexOf('./app.js'));
  assert.ok(index.indexOf('./rich-text-editor.js') < index.indexOf('./communication-workflow.js'));
  assert.ok(index.indexOf('./rich-text-editor.css') < index.indexOf('./design-system-accessibility.css'));
});

test('editor allows formatting but sanitizes dangerous markup', () => {
  assert.match(editor,/bold/);
  assert.match(editor,/italic/);
  assert.match(editor,/underline/);
  assert.match(editor,/insertUnorderedList/);
  assert.match(editor,/insertOrderedList/);
  assert.match(editor,/createLink/);
  assert.match(editor,/DROP_CONTENT/);
  assert.match(editor,/SCRIPT/);
  assert.match(editor,/normalizeHref/);
  assert.match(editor,/noopener noreferrer/);
});

test('major long-form operational fields opt into rich text', () => {
  assert.match(communication,/name="body" required data-rich-text/);
  assert.match(tasks,/name="description" rows="4" data-rich-text/);
  assert.match(requests,/name="body" required data-rich-text/);
  assert.match(documents,/name="notes" data-rich-text/);
  assert.match(assemblies,/name="description" data-rich-text/);
  assert.match(maintenance,/name="notes" data-rich-text/);
});

test('formatted content is rendered through the sanitizer instead of raw HTML', () => {
  assert.match(communication,/GCRichText\?\.render/);
  assert.match(requests,/GCRichText\?\.render/);
  assert.match(documents,/GCRichText\?\.render/);
  assert.match(assemblies,/GCRichText\?\.render/);
  assert.match(maintenance,/GCRichText\?\.render/);
});
