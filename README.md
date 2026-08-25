# Gestão Condominial - GitHub Pages V2

Protótipo frontend responsivo para síndico profissional administrar múltiplos condomínios.

## Fluxo inicial

No primeiro acesso o sistema executa um onboarding:

1. Pergunta o nome do síndico.
2. Solicita o cadastro do primeiro condomínio.
3. Mostra recomendações de manutenções e tarefas recorrentes.
4. Permite alterar a primeira data e escolher quais recomendações adicionar.
5. Deixa explícito que novas manutenções e tarefas podem ser criadas manualmente depois.
6. Permite cadastrar outros condomínios antes de entrar no painel.

## Funcionalidades principais

- Dashboard geral
- Múltiplos condomínios
- Workspace individual por condomínio
- Calendário
- Manutenções recorrentes
- Alertas de 7 dias, 2 dias, 1 dia e vencidos
- Tarefas recorrentes
- Chamados
- Documentos com vencimento
- Histórico da gestão

## Base de Dados / Arquivos por condomínio

Cada Workspace possui a aba **Base de dados**.

É possível:

- Criar pastas
- Criar subpastas
- Enviar múltiplos arquivos
- Guardar fotos, vídeos, PDFs, Word, planilhas e outros formatos
- Abrir arquivos salvos
- Excluir arquivos
- Criar automaticamente um registro de manutenção com subpastas `Documentos`, `Fotos` e `Vídeos`

Exemplo:

```
Manutenção dos Elevadores - 20/05/2026/
├── Documentos/
├── Fotos/
└── Vídeos/
```

### Como os arquivos são armazenados nesta versão

Como o projeto roda somente no GitHub Pages e não possui backend, os arquivos são armazenados localmente no navegador utilizando **IndexedDB**.

Isso significa que eles permanecem naquele navegador/dispositivo, mas ainda não são compartilhados entre usuários ou computadores.

Para a versão de produção, a evolução recomendada é utilizar Supabase Storage ou outro armazenamento em nuvem.

## Publicar no GitHub Pages

1. Extraia o ZIP.
2. Envie `index.html`, `styles.css`, `app.js`, `favicon.svg` e `README.md` para a raiz do repositório.
3. No GitHub abra `Settings > Pages`.
4. Em `Build and deployment`, selecione `Deploy from a branch`.
5. Escolha a branch `main` e `/ (root)`.
6. Salve.

Não é necessário Node.js ou npm.
