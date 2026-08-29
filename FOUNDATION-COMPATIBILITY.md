# Foundation compatibility guarantees

Esta branch evolui a fundação sem quebrar os fluxos existentes do sistema em produção.

## Regras de compatibilidade

- O login atual continua usando Supabase Auth e `auth-extension.js`.
- Usuários e senhas existentes não são recriados.
- `condominium_members` continua sendo a fonte de vínculo entre usuário e condomínio.
- Os papéis existentes permanecem válidos: `syndic`, `staff`, `council`, `resident`.
- O `main` não recebe mudanças até a branch ser validada.
- Novos módulos devem usar `window.CondoAccess` para decisões de interface, mas o banco continua sendo a autoridade real por RLS.
- Nenhuma regra de frontend substitui RLS.

## Matriz atual de capacidades

| Capacidade | syndic | staff | council | resident |
| --- | --- | --- | --- | --- |
| Visualizar condomínio | sim | sim | sim | sim |
| Gerenciar condomínio | sim | não | não | não |
| Gerenciar unidades | sim | sim | não | não |
| Gerenciar moradores | sim | não | não | não |
| Operar tarefas/manutenções | sim | sim | não | não |
| Revisar operações | sim | sim | sim | não |
| Gerenciar documentos | sim | sim | não | não |
| Gerenciar assembleias | sim | sim | não | não |
| Gerenciar comunicação | sim | sim | não | não |
| Gerenciar financeiro | sim | não | não | não |
| Revisar financeiro | sim | não | sim | não |

## Proteções adicionadas nesta etapa

1. `council` mantém leitura/revisão de tarefas e manutenções, mas não pode inserir, editar ou excluir.
2. `syndic` e `staff` podem editar registros operacionais antigos autorizados no condomínio.
3. `created_by` de tarefas e manutenções é imutável após criação.
4. `unit_id` é validado contra `condominium_id` no banco em:
   - `condominium_members`
   - `resident_invites`
   - `service_requests`
   - `gas_controls`
5. Tentativas de associar unidade de outro condomínio são rejeitadas pelo Postgres, mesmo por requisição manual.

## Estado dos dados no momento da validação

- Nenhuma duplicidade ativa de vínculo `condominium + user + role` encontrada.
- Nenhum vínculo de membro com unidade de outro condomínio encontrado.
- Nenhum convite, chamado ou controle de gás com unidade de outro condomínio encontrado.
- As migrations desta etapa não recriam contas nem alteram credenciais.

## Próximo bloco

Continuar a fundação com gestão de condomínio e membros usando estas garantias como contrato de compatibilidade antes de avançar para módulos novos.
