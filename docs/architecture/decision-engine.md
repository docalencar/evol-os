# Decision Engine

> Engine responsável por transformar análises em decisões organizacionais explicáveis.

## Objetivo

A Decision Engine consolida evidências, políticas e critérios para recomendar ou registrar uma decisão sobre um cenário.

## Responsabilidades

- consumir ScenarioAnalysis;
- aplicar critérios de decisão;
- registrar justificativas;
- classificar riscos;
- produzir recomendações;
- preservar decisão humana;
- preparar cenários aprovados para execução.

## Contratos principais

- ScenarioDecision
- DecisionRecommendation
- DecisionCriterion
- DecisionEvidence
- DecisionStatus
- DecisionRecord

## Resultados possíveis

- approve;
- approve_with_conditions;
- revise;
- reject;
- postpone.

## Fluxo

```text
ScenarioAnalysis
       ↓
Decision Criteria
       ↓
Recommendation
       ↓
Human Decision
       ↓
DecisionRecord
```

## Regras

- decisões críticas devem ser explicáveis;
- evidências devem ser preservadas;
- recomendação não equivale a aprovação;
- a decisão humana deve permanecer explícita;
- somente cenários aprovados seguem para execução.

## Resultado esperado

Uma decisão rastreável, fundamentada e pronta para governança.
