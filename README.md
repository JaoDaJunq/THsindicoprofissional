# Gestão Condominial

Sistema web para gestão profissional de múltiplos condomínios, com área administrativa e Portal do Morador.

## Arquitetura atual

```text
GitHub Pages (frontend público)
        ↓
Supabase Auth
        ↓
Postgres + Row Level Security (RLS)
        ↓
Supabase Storage privado + Edge Functions
        ↓
Integrações externas controladas
```

O frontend utiliza apenas a URL pública do projeto Supabase e uma `publishable key`. Nenhuma `service_role`, secret key, webhook do Discord ou token da ponte de integrações deve ser versionado neste repositório.

A autorização real dos dados é feita no Supabase através de Auth + RLS. Não é baseada em esconder o código JavaScript.

## Acessos

- Gestores/síndicos precisam ser autorizados pelo sistema.
- Uma conta comum não pode se promover a gestor apenas pelo navegador.
- Moradores entram por convite do síndico e ficam vinculados ao condomínio e, quando aplicável, à própria unidade.
- Cada operação do banco é filtrada por condomínio e papel do usuário.

## Funcionalidades principais

- Dashboard geral
- Múltiplos condomínios
- Workspace por condomínio
- Calendário central
- Manutenções recorrentes
- Tarefas
- Chamados com fluxo de status
- Documentos e vencimentos
- Assembleias
- Comunicados
- Histórico da gestão
- Moradores e unidades
- Portal do Morador
- Notificações internas
- Base de arquivos em nuvem

## Arquivos

Os arquivos são armazenados no bucket privado `condo-files` do Supabase Storage.

A Base de Dados permite criar pastas e subpastas, enviar fotos, vídeos e documentos e definir visibilidade para gestão ou moradores. Downloads são protegidos por RLS e, quando necessário, usam URLs assinadas temporárias.

Exemplo:

```text
Manutenção dos Elevadores - 20/05/2026/
├── Documentos/
├── Fotos/
└── Vídeos/
```

## Integração de alertas

Os eventos do sistema ficam no Supabase. Uma Edge Function prepara alertas com deduplicação e uma automação externa consulta essa ponte em horários definidos para entregar notificações no Discord.

Credenciais privadas dessa integração não ficam neste repositório.

## Segurança

Princípios atuais:

- RLS habilitado nas tabelas de aplicação.
- Dados administrativos separados por `condominium_id`.
- Moradores não recebem acesso administrativo.
- Storage privado com policies próprias.
- `integration_deliveries` é backend-only.
- Edge Function de convite exige JWT válido e confirma que o chamador é síndico do condomínio.
- Funções `SECURITY DEFINER` usam `search_path` restrito.
- Chaves administrativas do Supabase nunca devem ser usadas no frontend.

## Publicação

O frontend é estático e pode ser servido pelo GitHub Pages. O fato de o repositório ser público não deve ser tratado como mecanismo de segurança: qualquer dado sensível precisa continuar protegido no backend por Auth, RLS e secrets fora do GitHub.
