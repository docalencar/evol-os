# Evol OS Engineering Guide

> Guia oficial de engenharia do Evol OS.

---

# Objetivo

Este documento define os padrões obrigatórios para desenvolvimento do Evol OS.

Todo código produzido deve preservar:

- qualidade;
- previsibilidade;
- baixo acoplamento;
- alta coesão;
- facilidade de manutenção;
- escalabilidade.

---

# Filosofia

O Evol OS não é um conjunto de telas.

É um conjunto de Engines capazes de representar e operar organizações.

Toda implementação deve fortalecer essa visão.

---

# Princípios

## Business First

As regras pertencem ao domínio.

Nunca à interface.

---

## Engine First

Toda capacidade relevante deve existir em uma Engine.

A UI apenas consome seus resultados.

---

## Canonical Contracts

Toda comunicação ocorre através de contratos estáveis.

Exemplos:

- Organization
- PlanningScenario
- ProjectionContext
- ChangeSet
- ScenarioAnalysis
- Decision
- ExecutionResult

---

## UI Fina

A interface:

- não calcula;
- não decide;
- não valida regras complexas;
- apenas apresenta informações.

---

# Arquitetura

```text
UI
 ↓
Actions / Queries
 ↓
Services
 ↓
Engines
 ↓
Domain
 ↓
Repositories
 ↓
Supabase
```

---

# Organização do Código

Cada feature deve possuir estrutura semelhante a:

```text
feature/
    actions/
    components/
    queries/
    repositories/
    services/
    presenters/
    schemas/
    types/
    constants/
```

Cada pasta possui responsabilidade única.

---

# Engines

As Engines:

- não dependem da UI;
- não conhecem React;
- não conhecem componentes;
- operam exclusivamente sobre contratos.

---

# Actions

Actions executam operações.

Exemplos:

- criar
- atualizar
- arquivar
- executar

---

# Queries

Queries apenas consultam informações.

Nunca modificam dados.

---

# Services

Services concentram lógica reutilizável.

Não executam persistência diretamente.

---

# Repositories

Responsáveis exclusivamente pelo acesso aos dados.

Não implementam regras de negócio.

---

# Presenters

Transformam modelos internos em ViewModels para a interface.

---

# ViewModels

A UI consome apenas ViewModels.

Nunca entidades diretamente.

---

# Tipagem

Todo objeto importante deve possuir:

- TypeScript Type
- Schema
- Validação

---

# Nomeação

Utilizar nomes explícitos.

Preferir:

- executeScenario()
- createDepartment()
- calculateSpan()

Evitar:

- doStuff()
- process()
- helper()

---

# Componentes

Componentes devem ser pequenos.

Cada componente deve possuir apenas uma responsabilidade.

---

# Testes

Sempre que possível:

- testar Engines;
- testar Services;
- testar regras determinísticas.

Priorizar testes do domínio em vez da interface.

---

# Inteligência Artificial

IA é utilizada para:

- explicar;
- resumir;
- sugerir;
- interpretar linguagem natural.

Nunca para substituir regras determinísticas.

---

# Processo de Desenvolvimento

Toda funcionalidade deve seguir:

```text
Problema
      ↓
Modelo de domínio
      ↓
Contrato
      ↓
Engine
      ↓
Service
      ↓
Repository
      ↓
Action / Query
      ↓
Presenter
      ↓
UI
```

---

# Checklist

Antes de concluir uma funcionalidade verificar:

- domínio definido;
- contratos claros;
- Engine implementada;
- UI sem regras de negócio;
- tipagem consistente;
- build executado;
- lint sem erros críticos;
- documentação atualizada.

---

# Objetivo Final

Toda implementação deve contribuir para que o Evol OS seja capaz de:

- compreender organizações;
- simular mudanças;
- analisar impactos;
- apoiar decisões;
- executar transformações;
- monitorar resultados;
- evoluir continuamente.

Este guia deve orientar toda contribuição ao projeto.