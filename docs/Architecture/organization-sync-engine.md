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
