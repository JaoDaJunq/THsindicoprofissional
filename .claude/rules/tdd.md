# Regra: TDD obrigatório

Todo pedido de implementação — feature, correção de bug, ajuste de comportamento —
passa pelo ciclo abaixo. **Nenhum passo é pulável.** Não existe "esse é simples
demais", "já sei que funciona" ou "escrevo o teste depois". Se pulou, refaça.

## O ciclo

### 1. Escrever o teste
Escrever **só o teste**, antes de qualquer linha de implementação. O teste descreve
o comportamento que o usuário pediu, com nomes em pt-BR.
Uma coisa por teste; se a descrição precisa de "e", são dois testes.

### 2. Ver falhar — não é pulável
Rodar e **mostrar a saída da falha**. Confirmar que falhou pelo motivo certo:
a asserção do comportamento, não um erro de import, sintaxe ou arquivo faltando.
Um teste que nunca falhou não prova nada — pode estar testando o vazio.

### 3. Implementar
O mínimo que faz o teste passar. Nada especulativo, nada "que vai precisar depois".

### 4. Ver passar
Rodar e **mostrar a saída verde**. A suíte inteira, não só o teste novo — nada
pode ter quebrado no caminho.

### 5. Refatorar — não é pulável
Com o teste verde protegendo, olhar o que acabou de ser escrito e melhorar:

- **Coesão** — cada função com um assunto só; o que mudou junto fica junto.
- **Encurtar** — apagar o que sobra; menos código é a entrega, não o efeito colateral.
- **Reaproveitar** — antes de escrever um helper, procurar o que já existe no projeto.
  Duplicação recém-nascida vira o helper agora, não depois.
- **Padrões** — seguir o que o código em volta já faz: nomes, formato, idioma, estrutura.

Se não houver nada a melhorar, dizer explicitamente o que foi avaliado e por que
já está bom. "Refatorar" não é etapa opcional — o exame é obrigatório mesmo quando
o resultado é "nada a mudar".

### 6. Ver passar de novo — não é pulável
Rodar de novo e **mostrar a saída**. Refatoração que não foi reverificada é
refatoração não entregue.

## Relatar

Nunca afirmar que passou sem ter colado a saída. Se falhou, dizer que falhou e
mostrar. Evidência antes de afirmação, sempre.

## Escopo

Vale para código de produção. Não vale para: mexer em documentação, `TODO.md`,
configuração, ou explorar/ler o código sem alterá-lo.
