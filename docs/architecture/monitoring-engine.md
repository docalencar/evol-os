# Monitoring Engine

> Engine responsável por acompanhar continuamente o estado e os resultados da organização.

## Objetivo

A Monitoring Engine observa indicadores, metas, eventos e desvios após a execução das decisões.

## Responsabilidades

- acompanhar indicadores em tempo real ou por ciclos;
- comparar realizado e planejado;
- detectar desvios;
- gerar alertas;
- acompanhar metas;
- avaliar impactos pós-execução;
- alimentar o ciclo de melhoria contínua.

## Contratos principais

- MonitoringMetric
- MonitoringSnapshot
- MonitoringTarget
- MonitoringAlert
- MonitoringTrend
- MonitoringResult

## Indicadores possíveis

- headcount;
- turnover;
- absenteísmo;
- custo;
- desempenho;
- produtividade;
- vagas;
- capacidade;
- riscos;
- evolução de competências.

## Fluxo

```text
Organization State
        +
Targets
        +
Operational Events
        ↓
Monitoring Engine
        ↓
Snapshots, Trends and Alerts
```

## Regras

- métricas devem possuir definição canônica;
- alertas devem ser explicáveis;
- tendências devem preservar histórico;
- a UI não calcula indicadores;
- dados pessoais devem respeitar permissões e privacidade.

## Resultado esperado

Visibilidade contínua sobre a saúde organizacional e os resultados das mudanças executadas.
