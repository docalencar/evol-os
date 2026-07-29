# ADR 0007 — Planning Snapshot Lineage

## Status

Accepted

## Context

Planning precisa evoluir uma organização com rastreabilidade, sem reconstruir o
passado a partir das tabelas operacionais durante a publicação.

## Decision

Cada Workspace possui um Baseline Snapshot imutável criado atomicamente durante o
bootstrap. Cenários referenciam um Snapshot base e persistem suas alterações como
Canonical Change Sets. Uma publicação aprovada cria um novo Projection Snapshot
contendo a organização projetada e mantém a linhagem por versão.

A organização operacional é consultada somente para criar o Baseline. Depois do
bootstrap, a evolução ocorre exclusivamente de Snapshot mais Change Sets para um
novo Snapshot.

## Consequences

- Publicações são reproduzíveis e auditáveis.
- Baseline e Projection Snapshot usam o mesmo contrato organizacional.
- Snapshots legados sem organização continuam legíveis, mas não são publicáveis.
- Workspace e Baseline precisam ser criados atomicamente.
- Change Sets precisam permanecer canônicos e ordenáveis.

## Rejected alternatives

- Reconstruir a organização operacional durante cada publicação.
- Persistir a mesma organização em formatos paralelos.
- Criar Baseline implicitamente durante a publicação.
