# Evol OS Core Architecture v1

## Visão

O Evol OS é um **Organization Operating System**, cujo objetivo é
permitir que empresas modelem, simulem, analisem, decidam, executem e
acompanhem mudanças organizacionais com governança e rastreabilidade.

## Princípios

-   Business First
-   Engine First
-   Contratos Canônicos
-   UI consome apenas ViewModels
-   Nenhuma regra de negócio na UI
-   Testes antes da UI
-   Build sempre validado
-   Arquivos completos nas entregas

## Engines

### 1. Organization Engine

Fonte única da estrutura organizacional.

### 2. Planning Engine

Criação de cenários e Change Sets.

### 3. Projection Engine

Executa os Change Sets e produz a organização projetada.

### 4. Analysis Engine

Produz exclusivamente o contrato `ScenarioAnalysis`.

### 5. Decision Engine

Transforma `ScenarioAnalysis` em `ScenarioDecision`, com justificativas
auditáveis.

### 6. Execution Engine

Transforma decisões em `ExecutionPlan`, contendo ações, responsáveis,
dependências, SLAs, riscos e prioridades.

### 7. Monitoring Engine

Acompanha KPIs, saúde organizacional e resultados da execução.

### 8. Governance Engine

Mantém auditoria, aprovações, versionamento e trilha de decisões.

### 9. Learning Engine

Aprende com reorganizações anteriores para apoiar futuras decisões.

## Fluxo Canônico

``` text
Organization
    ↓
Planning
    ↓
Projection
    ↓
Analysis
    ↓
Decision
    ↓
Execution
    ↓
Monitoring
    ↓
Learning
```

## Contratos Canônicos

-   OrganizationSnapshot
-   ProjectionContract
-   ScenarioAnalysis
-   ScenarioDecision
-   ExecutionPlan

## Regras Arquiteturais

-   Apenas Engines calculam regras de negócio.
-   Queries apenas orquestram e adaptam ViewModels.
-   UI nunca recalcula indicadores.
-   Cada Engine possui testes e contratos próprios.

## Roadmap

### Concluído

-   Organization
-   Planning
-   Projection
-   Analysis
-   Decision

### Próximos

-   Execution
-   Workflow
-   Monitoring
-   Governance
-   Learning
-   AI Copilot
-   Digital Twin

## Objetivo Final

Transformar o Evol OS em um Digital Twin Organizacional capaz de
simular, recomendar, executar e aprender continuamente sobre a
organização.
