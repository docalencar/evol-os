# ADR 0008 — Deterministic Planning Projection

## Status

Accepted

## Context

Cenários precisam ser avaliados antes de qualquer alteração no estado operacional
ou na persistência.

## Decision

A Projection Engine é a única responsável por aplicar Change Sets sobre um
Snapshot em memória. Ela recebe contratos completos, ordena as mudanças, despacha
executores por tipo, valida invariantes e produz uma `ProjectedOrganization`
imutável com eventos, issues, warnings e métricas.

A engine não acessa banco, RPC, UI ou relógio global. Change Sets sem executor são
marcados como unhandled e não são classificados como executados.

## Consequences

- Projeções são determinísticas e testáveis sem infraestrutura.
- Publication e outros consumidores reutilizam a mesma semântica.
- Novos tipos de Change Set exigem parser, executor e testes explícitos.
- A persistência recebe o resultado da engine; não replica suas regras.

## Rejected alternatives

- Aplicar alterações diretamente nos repositories.
- Implementar projeções diferentes para UI e publicação.
- Considerar executado um Change Set reconhecido por um executor sem efeito.
