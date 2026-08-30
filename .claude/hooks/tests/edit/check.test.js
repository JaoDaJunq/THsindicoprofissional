import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkFor } from '../../edit/check.js';

const ignores = (filePath) => assert.equal(checkFor(filePath), null, filePath);

test('ignores files that are not TypeScript', () => {
  ignores('/project/TODO.md');
  ignores('/project/package.json');
  ignores('/project/app/globals.css');
});

test('ignores the previous implementation, kept only as reference', () => {
  ignores('/project/.old/app.js');
});

test('ignores generated and installed code', () => {
  ignores('/project/node_modules/next/dist/thing.ts');
  ignores('/project/generated/prisma/client.ts');
});

test('checks lint and tests for the touched file', () => {
  const command = checkFor('/project/components/google-signin-button.tsx');

  assert.match(command, /eslint/);
  assert.match(command, /vitest related/);
  assert.match(command, /components\/google-signin-button\.tsx/);
});

test('treats a test file as a file worth checking', () => {
  assert.match(checkFor('/project/tests/app/page.test.tsx'), /page\.test\.tsx/);
});
