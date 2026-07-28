# Scenario Intelligence — Contratos

> Porta de entrada da especificação do Canonical Contract do Scenario Intelligence
> Engine.

Esta pasta contém a **especificação conceitual** do contrato do Scenario Intelligence
Engine. Ela descreve *o que* é o Scenario Intelligence — seu propósito,
responsabilidades, entradas, saídas, consumidores, dependências e invariantes — e
**não** descreve *como* ele é implementado.

---

## Objetivo da pasta

Registrar o conhecimento oficial de domínio do contrato do Scenario Intelligence
Engine, de forma estável e independente de tecnologia. É a referência canônica que
outras Engines, dashboards e documentos devem respeitar ao interpretar o significado
do Scenario Intelligence.

---

## Relação com a documentação existente

Esta pasta aprofunda o módulo já descrito em
[../README.md](../README.md). A separação de responsabilidades é:

- [../README.md](../README.md) — porta de entrada do módulo Scenario Intelligence.
- [../MVP_SCOPE.md](../MVP_SCOPE.md) — escopo controlado do MVP (PR-083C).
- [../PRODUCT_VISION.md](../PRODUCT_VISION.md) — visão de produto de longo prazo.
- [../EVOLUTION_BACKLOG.md](../EVOLUTION_BACKLOG.md) — backlog de evolução por
  horizontes.
- [../DECISION_LOG.md](../DECISION_LOG.md) — registro das decisões.
- **contracts/** (esta pasta) — a especificação canônica conceitual do contrato.

---

## Diferença entre documentação funcional e implementação

A **documentação funcional** — como a desta pasta — descreve o significado do domínio:
o que a Engine representa, o que recebe, o que produz e quais regras permanecem
sempre verdadeiras. Ela é estável e não muda quando a tecnologia muda.

A **implementação** descreve como isso é construído em código: estruturas de dados,
interfaces, algoritmos, serialização e integração técnica. A implementação pertence
ao código e à documentação de engenharia, não a esta pasta.

Esta pasta trata exclusivamente do primeiro nível.

---

## O que esta pasta contém

- contratos conceituais do Scenario Intelligence Engine.

## O que esta pasta não contém

- código;
- interfaces TypeScript;
- JSON;
- APIs;
- implementação.

---

## Documentos relacionados

- [scenario-intelligence-contract.md](./scenario-intelligence-contract.md) —
  especificação canônica do contrato do Scenario Intelligence Engine.
