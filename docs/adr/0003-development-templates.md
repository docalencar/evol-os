# ADR 0003 — Development Templates

## Status

Accepted

---

## Context

O módulo Development do Evol OS permite criar planos de desenvolvimento
individuais para colaboradores.

Para acelerar a criação desses planos, o produto precisa oferecer templates
reutilizáveis contendo:

- objetivos sugeridos;
- competências relacionadas;
- níveis-alvo sugeridos;
- ações de desenvolvimento;
- prazos relativos;
- ordenação de objetivos e ações.

Os templates podem ser fornecidos pelo próprio Evol OS ou criados por uma
empresa específica.

A modelagem deve preservar o isolamento entre empresas e permitir que
templates globais sejam disponibilizados sem pertencer a uma empresa.

---

## Decision

O domínio será composto por três entidades:

```text
DevelopmentTemplate
    1
    ↓
    N DevelopmentTemplateGoal
        1
        ↓
        N DevelopmentTemplateAction
        