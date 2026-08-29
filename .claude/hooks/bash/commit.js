/**
 * Valida a mensagem de um `git commit` antes de ele rodar.
 * Ver `.claude/skills/commit/SKILL.md` para o padrão.
 */

const TIPOS = ['feat', 'fix', 'docs', 'estilo', 'refatora', 'perf', 'teste', 'build', 'ci', 'tarefa', 'reverte'];

const EH_COMMIT = /\bgit\b[^\n]*?\bcommit\b/;
const COAUTORIA = /co-authored-by|generated with \[?claude/i;
const ASSUNTO = new RegExp(`^(${TIPOS.join('|')})(\\([a-z0-9\\-./]+\\))?!?: (.+)`);
const INGLES = /^(add|adds|added|remove[ds]?|fix(es|ed)?|update[ds]?|create[ds]?|implement(s|ed)?|refactor(s|ed)?|change[ds]?|improve[ds]?|delete[ds]?|makes?|moves|moved|bump|introduce[ds]?|allow|enable|initial|setup|uses|used|cleanup)\b/i;

const PREFIXO_HEREDOC = /^\$?\(?\s*cat\s*<<-?\s*['"]?\w+['"]?\s*/;

/** Extrai o assunto passado em -m/--message, ou `undefined` se não houver. */
function extrairAssunto(comando) {
  const bruto = comando.match(/(?:--message=|-m\s*)("([^"]*)"|'([^']*)'|(\S+))/s);
  if (!bruto) return undefined;
  const valor = bruto[2] ?? bruto[3] ?? bruto[4] ?? '';
  const linhas = valor.replace(PREFIXO_HEREDOC, '').split('\n');
  return linhas.find((linha) => linha.trim()) ?.trim() ?? '';
}

/**
 * @param {string} comando linha de comando prestes a rodar
 * @returns {string|null} motivo da recusa, ou null se estiver tudo certo
 */
export function validarCommit(comando) {
  if (!EH_COMMIT.test(comando)) return null;

  if (COAUTORIA.test(comando)) {
    return 'Este projeto não usa trailer de coautoria. Remova a linha Co-Authored-By / Generated with Claude Code.';
  }

  const assunto = extrairAssunto(comando);
  if (assunto === undefined) return null; // mensagem virá do editor

  const partes = ASSUNTO.exec(assunto);
  if (!partes) {
    return `Assunto fora do padrão semântico: "${assunto}". Use "tipo(escopo): descrição em pt-BR" com tipo em: ${TIPOS.join(', ')}.`;
  }

  const descricao = partes[3];
  if (INGLES.test(descricao)) {
    return `Descrição em inglês: "${descricao}". Escreva a mensagem em pt-BR.`;
  }

  return null;
}

// Executado direto pelo hook PreToolUse: lê o JSON da chamada em stdin, nega ou cala.
if (import.meta.main) {
  let entrada = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (pedaco) => (entrada += pedaco));
  process.stdin.on('end', () => {
    let comando;
    try {
      comando = JSON.parse(entrada)?.tool_input?.command ?? '';
    } catch {
      return; // JSON inválido: não é papel do hook derrubar a chamada
    }

    const motivo = validarCommit(comando);
    if (!motivo) return;

    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: motivo,
      },
    }));
  });
}
