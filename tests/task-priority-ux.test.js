const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('task-quick-edit.js','utf8');

test('task list prioritizes actionable work before completed items', () => {
  assert.match(source,/taskSortRank/);
  assert.match(source,/if \(!\['done','cancelled'\]\.includes\(task\?\.status\) && days !== null && days < 0\) return 0/);
  assert.match(source,/if \(task\?\.status === 'in_progress'\) return 1/);
  assert.match(source,/if \(task\?\.status === 'pending'\) return 2/);
  assert.match(source,/if \(task\?\.status === 'done'\) return 4/);
  assert.match(source,/sort\(compareTasks\)/);
});

test('completed tasks are visually separated and highlighted', () => {
  assert.match(source,/task-row--done/);
  assert.match(source,/task-section-divider/);
  assert.match(source,/Concluídas/);
  assert.match(source,/task-status-badge/);
  assert.match(source,/safe\(cls\)/);
  assert.match(source,/\.task-status-badge\.done\{background:#e6f6eb;color:#2c7a47\}/);
});

test('task list keeps search and status filters', () => {
  assert.match(source,/data-task-search/);
  assert.match(source,/data-task-status-filter/);
  assert.match(source,/value="late"/);
  assert.match(source,/value="in_progress"/);
  assert.match(source,/value="pending"/);
  assert.match(source,/value="done"/);
  assert.match(source,/clearTaskListFilters/);
});
