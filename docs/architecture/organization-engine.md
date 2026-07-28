# Organization Engine

> Engine responsável por representar digitalmente a estrutura organizacional.

## Objetivo

A Organization Engine é a fonte canônica da estrutura organizacional do Evol OS.

Ela representa empresas, departamentos, equipes, cargos, colaboradores, competências e relações hierárquicas. As demais Engines consomem essa representação, mas não a modificam diretamente.

## Responsabilidades

- manter a estrutura atual da organização;
- preservar vínculos e relações hierárquicas;
- publicar contratos canônicos;
- garantir consistência e auditabilidade;
- fornecer a base para planejamento, projeção, análise, execução e monitoramento.

## Entidades principais

```text
Company
├── Department
│   ├── Team
│   └── Position
│       └── Employee
└── Competency
```

## Contratos publicados

- Organization
- Company
- Department
- Team
- Position
- Employee
- Competency

## Regras

- a Engine não depende da interface;
- a UI não altera entidades diretamente;
- mudanças reais passam por Actions, Services e Repositories;
- alterações planejadas pertencem à Planning Engine;
- alterações aprovadas são aplicadas pela Execution Engine.

## Dependências

A Organization Engine não depende das demais Engines.

```text
Organization Engine
├── Planning Engine
├── Projection Engine
├── Scenario Analysis Engine
├── Decision Engine
├── Execution Engine
└── Monitoring Engine
```

## Resultado esperado

Uma representação confiável da organização atual, capaz de sustentar todo o ciclo operacional do Evol OS.
