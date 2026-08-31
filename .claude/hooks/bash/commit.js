/**
 * Validates a `git commit` message before the command runs.
 * Commit messages stay in pt-BR — see `.claude/skills/commit/SKILL.md`.
 */

const TYPES = ['feat', 'fix', 'docs', 'estilo', 'refatora', 'perf', 'teste', 'build', 'ci', 'tarefa', 'reverte'];

const IS_COMMIT = /\bgit\b[^\n]*?\bcommit\b/;
const COAUTHORSHIP = /co-authored-by|generated with \[?claude/i;
const SUBJECT = new RegExp(`^(${TYPES.join('|')})(\\([a-z0-9\\-./]+\\))?!?: (.+)`);
const ENGLISH = /^(add|adds|added|remove[ds]?|fix(es|ed)?|update[ds]?|create[ds]?|implement(s|ed)?|refactor(s|ed)?|change[ds]?|improve[ds]?|delete[ds]?|makes?|moves|moved|bump|introduce[ds]?|allow|enable|initial|setup|uses|used|cleanup)\b/i;

const HEREDOC_PREFIX = /^\$?\(?\s*cat\s*<<-?\s*['"]?\w+['"]?\s*/;

/** Extracts the subject passed via -m/--message, or `undefined` when absent. */
function extractSubject(command) {
  // `-m` só conta como flag no começo de um argumento: sem isso um caminho como
  // `use-is-mobile.ts` seria lido como a mensagem do commit.
  const raw = command.match(/(?:^|\s)(?:--message=|-m\s*)("([^"]*)"|'([^']*)'|(\S+))/s);
  if (!raw) return undefined;
  const value = raw[2] ?? raw[3] ?? raw[4] ?? '';
  const lines = value.replace(HEREDOC_PREFIX, '').split('\n');
  return lines.find((line) => line.trim())?.trim() ?? '';
}

/**
 * @param {string} command command line about to run
 * @returns {string|null} reason for refusal, or null when everything is fine
 */
export function validateCommit(command) {
  if (!IS_COMMIT.test(command)) return null;

  if (COAUTHORSHIP.test(command)) {
    return 'Este projeto não usa trailer de coautoria. Remova a linha de coautoria da mensagem.';
  }

  const subject = extractSubject(command);
  if (subject === undefined) return null; // message will come from the editor

  const parts = SUBJECT.exec(subject);
  if (!parts) {
    return `Assunto fora do padrão semântico: "${subject}". Use "tipo(escopo): descrição em pt-BR" com tipo em: ${TYPES.join(', ')}.`;
  }

  const description = parts[3];
  if (ENGLISH.test(description)) {
    return `Descrição em inglês: "${description}". A mensagem de commit é em pt-BR.`;
  }

  return null;
}

// Run by the PreToolUse hook: reads the call JSON from stdin, denies or stays quiet.
if (import.meta.main) {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => (input += chunk));
  process.stdin.on('end', () => {
    let command;
    try {
      command = JSON.parse(input)?.tool_input?.command ?? '';
    } catch {
      return; // invalid JSON: not the hook's job to fail the call
    }

    const reason = validateCommit(command);
    if (!reason) return;

    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }));
  });
}
