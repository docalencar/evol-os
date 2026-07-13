# ADR 0002 — Development Domain

## Status

Accepted

---

## Context

O módulo Development será responsável por representar os Planos de Desenvolvimento Individual (PDI).

O objetivo não é implementar um gerenciador de tarefas, mas um domínio orientado ao desenvolvimento de competências.

---

## Decision

O domínio será composto por três entidades principais.

```
Development Plan

↓

Development Goal

↓

Development Action
```

### Development Plan

Representa o plano completo de desenvolvimento de um colaborador.

### Development Goal

Representa um objetivo ligado a uma competência específica.

Cada Goal registra:

- competência
- nível atual
- nível esperado
- nível alvo

### Development Action

Representa ações concretas para atingir um Goal.

Exemplos:

- Curso
- Livro
- Mentoria
- Projeto
- Workshop
- Feedback

---

## Future Decisions

Evidências não fazem parte de DevelopmentAction.

Caso seja necessário anexar certificados, imagens, links ou documentos, será criada uma entidade própria denominada DevelopmentActionEvidence.

---

## Consequences

### Positivas

- Separação clara entre objetivo e ação.
- Compatível com geração automática de PDI.
- Compatível com IA.
- Compatível com dashboards.

### Negativas

- Modelo inicial mais complexo.
---

# Decisão Arquitetural — Estrutura Profissional do Cargo

O Cargo passa a representar uma entidade organizacional completa e não apenas um cadastro simples.

Foram adicionados:

- Departamento responsável (`department_id`);
- Nível hierárquico (`hierarchical_level`);
- Status próprio (`status`).

## Decisões

- O status do Cargo permanece independente do status do Colaborador.
- O relacionamento com Departamento utiliza `ON DELETE SET NULL`, preservando o histórico dos cargos durante reorganizações da empresa.
- Os domínios são validados tanto no banco (CHECK constraints) quanto na aplicação (TypeScript + Zod).