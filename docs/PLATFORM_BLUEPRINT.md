# Evol OS — Platform Blueprint

**Status:** Canonical  
**Responsabilidade:** Constituição estrutural da plataforma

## Propósito

Este documento conecta visão, experiências, domínios, arquitetura, ADRs, padrões de engenharia e implementação.

## Definição

O Evol OS é um sistema operacional organizacional. Ele deve representar:

- estrutura atual;
- histórico de mudanças;
- relações entre pessoas, cargos, times e departamentos;
- competências e capacidades;
- riscos e oportunidades;
- cenários futuros;
- decisões;
- workflows de execução.

O estado atual, o histórico e os cenários futuros possuem valor.

## Princípios constitucionais

### A organização é viva

A empresa não é uma fotografia estática. Mudanças devem preservar contexto e histórico.

### Mudanças relevantes são explícitas

Devem possuir intenção, origem, impacto, responsável, data, estado e auditoria.

### Projeção não altera a realidade

Cenários são isolados até decisão e execução autorizadas.

### Inteligência deriva de fatos

Indicadores e recomendações devem nascer de dados e regras rastreáveis.

### A IA é copiloto

Explica, resume, contextualiza e recomenda. Não substitui autorização humana nem cálculos determinísticos essenciais.

### Capacidades precedem interfaces

Web, mobile, APIs, automações e integrações consomem capacidades reutilizáveis.

### O Kernel é independente da experiência

O núcleo não depende de React, Next.js, Supabase, rotas, formulários ou componentes visuais.

### Histórico pertence ao domínio

Auditoria e rastreabilidade não são apenas logs técnicos.

## Arquitetura em camadas

```text
Experiences
    ↓
Applications and Interfaces
    ↓
Capabilities
    ↓
Platform Engines
    ↓
Kernel Domains
    ↓
Infrastructure Adapters
    ↓
External Systems
```

## Kernel

Domínios planejados:

- Identity
- Organization
- Projection
- Intelligence
- Decision
- Workflow
- Rules
- Events

A presença no Blueprint não exige extração imediata para `packages/`.

## Capabilities

Capacidades iniciais ou planejadas:

- Organization Management
- People Management
- Workforce Planning
- Recruitment
- Onboarding
- Performance and Assessments
- Feedback
- Competency Management
- Development
- Career and Succession
- Compensation
- Workforce Analytics
- Offboarding
- Organizational Intelligence
- AI Copilot

## Engines

Princípios comuns:

- entrada e contexto explícitos;
- pipeline previsível;
- estágios isolados;
- resultados tipados;
- testes;
- independência da UI;
- rastreabilidade;
- erros explícitos.

Engines planejados:

- Projection Engine
- Intelligence Engine
- Decision Engine
- Workflow Engine
- Rules Engine
- Analytics Engine

## Eventos

Eventos representam fatos relevantes e usam nomes no passado, como `EmployeeMoved`, `ProjectionCalculated` e `DecisionRecorded`.

Devem carregar identificador, tipo, versão, data, actor, tenant ou company, payload e metadados.

## Estados organizacionais

```text
Current State
    ↓
Projection
    ↓
Intelligence
    ↓
Decision
    ↓
Workflow
    ↓
Executed State
```

A plataforma distingue estado atual, projetado, decidido e executado.

## Experiência

A experiência deve utilizar linguagem humana, divulgação progressiva, busca, filtros simples, indicadores explicáveis, confirmação antes de impactos, acessibilidade, mobile e IA opcional.

## Segurança e multi-tenancy

Toda operação sensível considera tenant, company, actor, permissão, escopo, origem, impacto e auditoria.

Autenticação não substitui autorização. Ocultar um botão não substitui controle de permissão.

## Evolução incremental

1. Estabilizar contratos nas features.
2. Criar testes determinísticos.
3. Reduzir dependências de infraestrutura.
4. Identificar reutilização real.
5. Extrair apenas com evidência.
6. Preservar compatibilidade durante migrações.

## Princípio final

O Evol OS deve crescer por composição de capacidades coerentes, não por acumulação de telas e cadastros.
