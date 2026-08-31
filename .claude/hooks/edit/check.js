/**
 * Decides what to run after an edit, for the PostToolUse hook.
 * Lint and tests for the touched file; the whole suite is the pre-commit's job.
 */

const TYPESCRIPT = /\.tsx?$/;
const OUT_OF_SCOPE = /\/(\.old|node_modules|\.next|coverage|generated)\//;

/**
 * @param {string} filePath file that was just written
 * @returns {string|null} command to run, or null when the file is irrelevant
 */
export function checkFor(filePath) {
  if (!TYPESCRIPT.test(filePath)) return null;
  if (OUT_OF_SCOPE.test(filePath)) return null;

  return `npx eslint --max-warnings 0 "${filePath}" && npx vitest related --run "${filePath}"`;
}

// Run by the PostToolUse hook: reads the call JSON from stdin and runs the check.
if (import.meta.main) {
  const { execSync } = await import('node:child_process');

  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => (input += chunk));
  process.stdin.on('end', () => {
    let filePath;
    try {
      filePath = JSON.parse(input)?.tool_input?.file_path ?? '';
    } catch {
      return; // invalid JSON: not the hook's job to fail the edit
    }

    const command = checkFor(filePath);
    if (!command) return;

    try {
      execSync(command, { cwd: process.env.CLAUDE_PROJECT_DIR, stdio: 'pipe' });
    } catch (error) {
      const output = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim();
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: `Lint or test failed in ${filePath}:\n${output}`,
        },
      }));
    }
  });
}
