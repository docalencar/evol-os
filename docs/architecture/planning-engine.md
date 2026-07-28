# Planning Engine

> Engine responsável por modelar mudanças organizacionais antes da execução.

## Objetivo

A Planning Engine permite criar, organizar e versionar cenários de mudança sem alterar a organização real.

## Responsabilidades

- criar cenários;
- registrar mudanças propostas;
- organizar ChangeSets;
- preservar versões;
- controlar estados do planejamento;
- preparar dados para projeção e análise.

## Contratos principais

- PlanningScenario
- ChangeSet
- ScenarioVersion
- ScenarioStatus
- PlanningMetadata

## Exemplos de mudanças

- department.create
- department.update
- department.archive
- team.create
- team.update
- team.archive
- position.create
- position.update
- position.move
- position.archive
- employee.hire
- employee.move
- employee.promote
- employee.terminate

## Ciclo de vida

```text
Draft
  ↓
Ready for Analysis
  ↓
Analyzed
  ↓
Approved or Rejected
  ↓
Ready for Execution
```

## Regras

- cenários não modificam dados reais;
- cada mudança deve possuir tipo e payload válidos;
- contratos devem ser estáveis e versionáveis;
- o histórico do cenário deve ser preservado;
- a UI consome ViewModels de planejamento.

## Integração

```text
Organization Engine
        ↓
Planning Engine
        ↓
Projection Engine
```

## Resultado esperado

Um plano explícito, validável e auditável que possa ser projetado, analisado, decidido e executado.
