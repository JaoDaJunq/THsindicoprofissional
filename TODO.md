# TODO

Uma tarefa por tela. Conforme cada tela for sendo trabalhada, as variações e casos
específicos entram como sub-itens **dentro** da própria tarefa — não como tarefas novas.

Legenda: `[ ]` a fazer · `[~]` existe mas precisa de ajuste · `[x]` pronto

> **Reescrita em andamento.** A stack mudou para Next.js + HeroUI + Postgres, e os
> arquivos citados abaixo (`app.js`, `admin-panel.js`…) são da implementação anterior,
> em `.old/`. Conforme cada tela é refeita, a referência passa a apontar para o
> caminho novo. O padrão de camadas está em `docs/architecture.md`.

---

## Acesso e primeiro uso

- [x] **Criar conta** — deixou de existir: a pessoa é criada no primeiro acesso
  - [x] papel não se auto-atribui — todo mundo nasce morador
- [x] **Login** — `app/signin/` · Google ou usuário e senha
  - [x] troca de senha obrigatória no primeiro acesso — `app/change-password/`
- [~] **Onboarding 1 · Primeiro condomínio** — `auth-extension.js`
- [x] **Onboarding 2 · Rotinas sugeridas** — `app.js`
- [x] **Onboarding 3 · Conclusão** — `app.js`
- [x] **Admin do sistema · Login** — `admin-panel.js`
- [~] **Cadastro de usuários** — `app/(app)/users/`
  - [x] listar as pessoas com busca, filtros e paginação
  - [x] colunas de síndico e status
  - [ ] celular
  - [x] vínculo com o condomínio
- [x] **Usuário · detalhe e permissões** — `app/(app)/users/[id]/`
  - [x] único lugar onde o papel é definido, e só o administrador o define
  - [x] editar contato básico — nome e e-mail
  - [x] definir usuário e senha de outra pessoa
  - [x] só síndico edita outra pessoa

## Painel do síndico (multi-condomínio)

- [x] **Visão geral** — `app.js` · métricas + alertas por urgência
- [x] **Condomínios** — `app/(app)/condominiums/` · lista com busca, filtros e paginação
  - [x] criar e editar pelo drawer, com CNPJ único entre os ativos
  - [x] desativar e ativar em vez de excluir
  - [x] vínculo n↔n com usuários, com papel de morador ou síndico do condomínio
  - [x] a coluna Moradores conta os vínculos ativos, em vez de um número digitado
  - [ ] unidades como entidade
  - [x] síndico do condomínio governa o acesso àquele condomínio
  - [x] portal do morador: o RESIDENT entra em `/portal` em vez de bater em 403
- [x] **Calendário** — `app.js` · grade mensal
- [~] **Manutenções (consolidado)** — `transition-ui.js` sobrescreve `app.js`
  - [ ] decidir qual versão fica e apagar a outra
- [~] **Chamados (consolidado)** — `operations-ui.js` sobrescreve `app.js`
  - [ ] decidir qual versão fica e apagar a outra
- [~] **Tarefas (consolidado)** — `transition-ui.js` sobrescreve `app.js`
  - [ ] decidir qual versão fica e apagar a outra
- [~] **Integrações** — `integrations-ui.js`
  - [ ] não tem link na sidebar; só chega por URL
- [~] **Notificações** — `integrations-ui.js`
  - [ ] não tem link na sidebar; só chega por URL
  - [ ] o sino do topbar leva para Manutenções (`app.js:95`), deveria vir para cá

## Workspace do condomínio

- [x] **Resumo** — `app.js`
- [x] **Calendário** — `app.js`
- [x] **Manutenções** — `transition-ui.js`
- [x] **Tarefas** — `transition-ui.js`
- [x] **Chamados** — `operations-ui.js`
- [x] **Documentos** — `operations-ui.js` · vencimento vira evento no calendário
- [x] **Base de dados (arquivos)** — `cloud-file-library.js`
- [x] **Histórico** — `app.js`
- [~] **Comunicados** — `announcements-ui.js`
  - [ ] fora da sub-nav (`app.js:88`)
- [~] **Assembleias** — `operations-ui.js`
  - [ ] fora da sub-nav
- [~] **Gás** — `transition-ui.js`
  - [ ] fora da sub-nav
- [~] **Moradores e unidades** — `resident-management.js`
  - [ ] fora da sub-nav

## Portal do morador

- [x] **Início** — `app/(resident)/portal/` · meus dados e meus condomínios
  - [x] editar o próprio contato — `app/(resident)/portal/dados/`
  - [ ] comunicados, chamados, documentos e calendário: nenhum existe no banco ainda
- [x] **Início (anterior)** — `resident-portal.js`
- [x] **Comunicados** — `resident-portal.js`
- [x] **Meus chamados** — `resident-portal.js`
- [~] **Calendário** — `resident-portal.js`
  - [ ] é lista; o síndico vê grade. Unificar num componente só
- [x] **Documentos** — `resident-portal.js`
- [~] **Minha unidade** — `resident-portal.js`
  - [ ] somente leitura; sem editar contato
- [x] **Notificações** — `resident-portal.js`

## Transversal

- [ ] **Navegação** — colocar as 6 telas órfãs em menu (`app.js:88` e `app.js:95`)
- [ ] **Duplicação local × nuvem** — 5 telas existem em duas versões; consolidar
