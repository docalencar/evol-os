# Scenario Analysis Engine

> Engine responsável por medir os impactos de uma organização projetada.

## Objetivo

A Scenario Analysis Engine transforma projeções em indicadores, riscos, alertas e explicações.

## Responsabilidades

- comparar estado atual e projetado;
- calcular impactos estruturais;
- calcular impactos financeiros;
- detectar riscos;
- identificar ganhos e perdas;
- produzir análises explicáveis.

## Contratos principais

- ScenarioAnalysis
- AnalysisMetric
- AnalysisFinding
- AnalysisRisk
- AnalysisRecommendation
- ScenarioComparison

## Dimensões de análise

- headcount;
- custo;
- span of control;
- níveis hierárquicos;
- capacidade;
- vagas;
- movimentações;
- concentração de liderança;
- competências;
- riscos operacionais.

## Fluxo

```text
Current Organization
        +
Projected Organization
        ↓
Analysis Calculators
        ↓
ScenarioAnalysis
```

## Regras

- cálculos determinísticos;
- fórmulas explícitas;
- resultados reproduzíveis;
- indicadores sem lógica na UI;
- separação entre fato, risco e recomendação.

## IA

A IA pode explicar e resumir a análise, mas não substitui os cálculos determinísticos.

## Resultado esperado

Uma avaliação objetiva e compreensível das consequências do cenário.
