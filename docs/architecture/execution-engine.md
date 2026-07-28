# Execution Engine

> Engine responsável por aplicar no mundo real um cenário aprovado.

## Objetivo

A Execution Engine converte ChangeSets aprovados em mutações reais, consistentes, auditáveis e controladas.

## Responsabilidades

- validar pré-condições;
- ordenar operações;
- executar ChangeSets;
- controlar transações;
- registrar resultados;
- produzir trilha de auditoria;
- tratar falhas;
- suportar compensação quando aplicável.

## Contratos principais

- ExecutionPlan
- ExecutionStep
- ExecutionContext
- ExecutionResult
- ExecutionIssue
- ExecutionAudit
- CompensationResult

## Fluxo

```text
Approved Scenario
       ↓
Execution Plan
       ↓
Preflight Validation
       ↓
Ordered Execution
       ↓
Persistence
       ↓
Audit and Result
```

## Estados

```text
pending
running
completed
completed_with_warnings
failed
compensated
```

## Regras

- somente cenários aprovados podem ser executados;
- nenhuma etapa deve ser silenciosa;
- falhas devem gerar resultados explícitos;
- persistência ocorre por Repositories;
- a UI apenas acompanha e apresenta o processo;
- toda execução deve ser auditável.

## Resultado esperado

A aplicação segura e verificável da mudança organizacional aprovada.
