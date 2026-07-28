# Evol OS Architecture

> Arquitetura oficial do Evol OS.

---

# Objetivo

O Evol OS é um Sistema Operacional Organizacional.

Sua arquitetura foi projetada para representar empresas de forma determinística, permitindo compreender, simular, analisar, executar e evoluir organizações continuamente.

A arquitetura privilegia:

- modularidade;
- previsibilidade;
- baixo acoplamento;
- alta coesão;
- contratos canônicos;
- Engines independentes.

---

# Princípios Arquiteturais

Toda evolução da plataforma deve preservar:

- Business First
- Engine First
- Canonical Contracts
- Determinismo
- ViewModels para UI
- IA como Copiloto
- Progressive Disclosure
- Zero Treinamento sempre que possível

---

# Arquitetura em Camadas

```text
┌─────────────────────────────────────────────┐
│ Presentation Layer                          │
│ Next.js · React · ViewModels                │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│ Application Layer                           │
│ Actions · Queries · Services                │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│ Engine Layer                                │
│ Organização · Planejamento · Execução       │
│ Projeção · Análise · Decisão                │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│ Domain Layer                                │
│ Entidades · Regras · Contratos              │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│ Infrastructure Layer                        │
│ Supabase · Storage · APIs                   │
└─────────────────────────────────────────────┘
```

---

# Engines

Cada capacidade do sistema é implementada por uma Engine independente.

## Organization Engine

Responsável pela representação estrutural da empresa.

Modela:

- empresas;
- departamentos;
- equipes;
- cargos;
- colaboradores;
- competências;
- relações hierárquicas.

---

## Planning Engine

Responsável pelo planejamento organizacional.

Cria cenários contendo mudanças futuras.

Exemplos:

- criação de cargos;
- movimentações;
- promoções;
- admissões;
- desligamentos;
- reorganizações.

---

## Projection Engine

Transforma cenários em uma organização projetada.

Não altera os dados reais.

Produz uma projeção completamente isolada.

---

## Scenario Analysis Engine

Analisa cenários projetados.

Calcula impactos como:

- span of control;
- custo;
- capacidade;
- distribuição de pessoas;
- riscos;
- indicadores organizacionais.

---

## Decision Engine

Consolida análises e produz recomendações.

Pode sugerir:

- aprovar;
- revisar;
- rejeitar;
- adiar.

As decisões permanecem explicáveis.

---

## Execution Engine

Converte um cenário aprovado em alterações reais.

Responsabilidades:

- validar mudanças;
- executar ChangeSets;
- garantir consistência;
- registrar auditoria;
- permitir rollback quando aplicável.

---

## Monitoring Engine

Acompanha continuamente os indicadores organizacionais.

Exemplos:

- turnover;
- headcount;
- absenteísmo;
- desempenho;
- produtividade;
- riscos.

---

## Intelligence Engine

Centraliza inteligência analítica.

Integra:

- indicadores;
- tendências;
- insights;
- IA generativa;
- recomendações.

---

# Fluxo Principal

```text
Organização
      │
      ▼
Planning
      │
      ▼
Projection
      │
      ▼
Scenario Analysis
      │
      ▼
Decision
      │
      ▼
Execution
      │
      ▼
Monitoring
      │
      ▼
Continuous Improvement
```

---

# Contratos Canônicos

Toda comunicação entre Engines ocorre através de contratos estáveis.

Exemplos:

- Organization
- PlanningScenario
- ProjectionContext
- ChangeSet
- ScenarioAnalysis
- Decision
- ExecutionResult

Esses contratos representam a linguagem oficial da plataforma.

---

# Interface

A interface possui responsabilidade exclusivamente visual.

A UI:

- nunca implementa regras de negócio;
- nunca calcula indicadores;
- nunca modifica entidades diretamente.

A UI apenas consome:

- Queries;
- ViewModels;
- Actions.

---

# Inteligência Artificial

A IA atua como copiloto.

Pode:

- responder perguntas;
- explicar decisões;
- resumir cenários;
- gerar recomendações;
- identificar padrões.

Nunca substitui as Engines determinísticas.

---

# Escalabilidade

Novas Engines podem ser adicionadas sem alterar as existentes.

Cada Engine deve:

- possuir domínio próprio;
- publicar contratos claros;
- depender apenas de interfaces públicas.

---

# Objetivo Arquitetural

O Evol OS deve permitir que uma organização seja:

- compreendida;
- simulada;
- analisada;
- otimizada;
- executada;
- monitorada;
- continuamente aprimorada.

Toda decisão arquitetural deve reforçar esse objetivo.