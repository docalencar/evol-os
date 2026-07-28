# Organization Sync Engine

## Objetivo

Comparar o estado atual e o estado desejado da organização e produzir um plano antes de qualquer alteração persistente.

## Entrada

- CurrentOrganizationSnapshot
- DesiredOrganizationSnapshot

## Saída

- OrganizationSyncPlan

## Entidades iniciais

- Department
- Team
- Position
- Employee

## Operações iniciais

- Create
- Update
- Move
- Archive
- Restore
- Unchanged
- Conflict

## Restrições

O Engine não acessa banco, não conhece arquivos, não renderiza interface e não decide conflitos pelo usuário.

## Limite entre Client e Server

A API pública em `organization/sync/index.ts` deve conter apenas contratos, presenters, view-models, componentes e engines puros.

Código que acessa repositories, Supabase, cookies, headers ou outras APIs exclusivas do servidor deve ser importado por `organization/sync/server.ts`.

Essa separação impede que dependências de servidor sejam incluídas acidentalmente em componentes cliente.
