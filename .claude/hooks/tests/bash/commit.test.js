import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCommit } from '../../bash/commit.js';

const passa = (comando) => assert.equal(validateCommit(comando), null, comando);
const barra = (comando, trecho) => {
  const motivo = validateCommit(comando);
  assert.ok(motivo, `deveria barrar: ${comando}`);
  assert.match(motivo, trecho);
};

test('ignora comando que não é commit', () => {
  passa('git status');
  passa('git log --oneline -5');
  passa('echo "nada aqui"');
});

test('ignora commit sem mensagem na linha de comando', () => {
  passa('git commit');
  passa('git commit --amend --no-edit');
});

test('aceita assunto semântico em pt-BR', () => {
  passa('git commit -m "feat(morador): adiciona flag de síndico"');
  passa('git commit -m "fix: corrige cálculo do vencimento"');
  passa('git commit -m "refatora(auth)!: unifica cadastro e permissão"');
  passa('git commit --message="docs: registra telas órfãs"');
  passa('git commit -m"tarefa: move implementação antiga para .old"');
});

test('aceita commit dentro de comando composto', () => {
  passa('git add -A && git commit -m "feat(gas): lista medidores vencidos"');
});

test('barra descrição em inglês', () => {
  barra('git commit -m "feat: add sindico flag"', /inglês/);
  barra('git add -A && git commit -m "fix: update router"', /inglês/);
});

test('barra assunto fora do padrão semântico', () => {
  barra('git commit -m "ajusta cadastro de pessoas"', /semântico/);
  barra('git commit -m "feat adiciona sem dois pontos"', /semântico/);
  barra('git commit -m "chore: tipo em inglês"', /semântico/);
});

test('barra trailer de coautoria', () => {
  barra('git commit -m "fix: corrige rota\n\nCo-Authored-By: Claude <x@y>"', /coautoria/);
  barra('git commit -m "fix: corrige rota\n\n🤖 Generated with [Claude Code]"', /coautoria/);
});

test('lê assunto de heredoc', () => {
  passa(`git commit -m "$(cat <<'EOF'\nfeat(admin): liga flag de síndico\n\ncorpo qualquer\nEOF\n)"`);
  barra(`git commit -m "$(cat <<'EOF'\nadd flag\nEOF\n)"`, /semântico/);
});

test('não confunde palavra que existe nos dois idiomas', () => {
  passa('git commit -m "tarefa: move implementação antiga para .old"');
  passa('git commit -m "refatora: usa o helper que já existe"');
  passa('git commit -m "feat: envia em pt"');
});

test('não confunde -m no meio de um caminho com a flag de mensagem', () => {
  passa('git add hooks/use-is-mobile.ts && git commit');
  passa('git add app/nav-mobile.tsx tests/mobile.test.ts && git commit');
  passa('git add lib/format-money.ts && git commit');
});
