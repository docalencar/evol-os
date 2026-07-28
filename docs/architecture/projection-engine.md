# Projection Engine

> Engine responsável por materializar virtualmente um cenário organizacional.

## Objetivo

A Projection Engine aplica ChangeSets sobre uma cópia lógica da organização atual e produz um estado projetado isolado.

Ela nunca altera a organização real.

## Responsabilidades

- criar o ProjectionContext;
- clonar o estado organizacional necessário;
- aplicar ChangeSets em ordem determinística;
- produzir entidades projetadas;
- registrar erros e avisos;
- entregar o estado final para análise.

## Contratos principais

- ProjectionContext
- ProjectedOrganization
- ProjectedDepartment
- ProjectedTeam
- ProjectedPosition
- ProjectedEmployee
- ProjectionResult
- ProjectionIssue

## Fluxo

```text
Organization
    +
PlanningScenario
    ↓
ProjectionContext
    ↓
ChangeSet Executors
    ↓
ProjectedOrganization
```

## Executors

Cada tipo de mudança deve possuir um executor específico.

```text
ChangeSet
    ↓
ChangeSetExecutor
    ↓
MutationResult
```

## Regras

- execução determinística;
- ausência de efeitos colaterais;
- aplicação ordenada;
- contratos canônicos;
- erros explícitos;
- nenhum acesso direto à UI.

## Resultado esperado

Uma representação virtual completa do impacto estrutural de um cenário.
