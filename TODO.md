# TODO

Uma tarefa por tela. Conforme cada tela for sendo trabalhada, as variações e casos
específicos entram como sub-itens **dentro** da própria tarefa — não como tarefas novas.

Legenda: `[ ]` a fazer · `[~]` existe mas precisa de ajuste · `[x]` pronto

---

## Acesso e primeiro uso

- [~] **Criar conta** — `auth-extension.js`
  - [ ] fundir a tela de cadastro de síndico nesta; só nome, e-mail, celular, senha
  - [ ] remover a escolha de papel — papel não se auto-atribui
- [x] **Login** — `auth-extension.js` · roteia por papel
- [~] **Onboarding 1 · Primeiro condomínio** — `auth-extension.js`
- [x] **Onboarding 2 · Rotinas sugeridas** — `app.js`
- [x] **Onboarding 3 · Conclusão** — `app.js`
- [x] **Admin do sistema · Login** — `admin-panel.js`
- [~] **Cadastro de usuários** — `admin-panel.js`
  - [ ] listar todas as pessoas com celular e vínculo, com busca
  - [ ] coluna com o toggle de síndico
- [ ] **Usuário · detalhe e permissões** — tela nova
  - [ ] único lugar onde a flag de síndico é ligada
  - [ ] editar contato básico

## Painel do síndico (multi-condomínio)

- [x] **Visão geral** — `app.js` · métricas + alertas por urgência
- [x] **Condomínios** — `app.js`
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

- [x] **Início** — `resident-portal.js`
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
