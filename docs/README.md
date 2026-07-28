# Evol OS Documentation

> O sistema operacional para organizações.

---

# Visão Geral

O Evol OS é uma plataforma para compreender, planejar, simular, executar, monitorar e evoluir organizações.

A documentação está organizada para servir quatro públicos:

- Produto
- Engenharia
- Arquitetura
- Inteligência Artificial

Todo o projeto segue os princípios definidos na Constituição do Evol OS e na arquitetura baseada em Engines.

---

# Ordem recomendada de leitura

## 1. Fundação

- 01-constitution/EOSC-000-evol-os-constitution.md
- VISION.md
- PRODUCT_PRINCIPLES.md
- ROADMAP.md

---

## 2. Arquitetura

- architecture/ARCHITECTURE.md
- architecture/organization-sync-engine.md
- architecture/FRONTEND_ARCHITECTURE.md

---

## 3. Engenharia

- engineering/ENGINEERING_GUIDE.md
- engineering/EVOL_ENGINEERING_PRINCIPLES.md
- engineering/development-workflow.md
- engineering/backend-standards.md
- engineering/frontend-standards.md
- engineering/database-standards.md

---

## 4. Produto

- Product/PRODUCT_VISION.md
- Product/MANIFESTO.md
- Product/UX_PHILOSOPHY.md
- Product/DESIGN_PRINCIPLES.md
- Product/USER_JOURNEYS.md

---

## 5. Domínios

- domain/PERFORMANCE_DOMAIN.md

Novos domínios deverão seguir o mesmo padrão arquitetural.

---

## 6. ADRs

Todos os Architectural Decision Records encontram-se em:

```
docs/adr/
```

Eles registram decisões permanentes de arquitetura.

---

## 7. Playbooks

Os playbooks documentam a forma oficial de implementar funcionalidades.

```
docs/playbooks/
```

---

## Arquitetura do Produto

O Evol OS é estruturado em Engines independentes.

Cada Engine possui:

- contratos canônicos;
- regras determinísticas;
- projeções;
- análises;
- decisões;
- execução;
- monitoramento.

A UI nunca contém regras de negócio.

---

## Fluxo arquitetural

```text
Organização
      │
      ▼
Modelagem
      │
      ▼
Planning Engine
      │
      ▼
Projection Engine
      │
      ▼
Scenario Analysis
      │
      ▼
Decision Engine
      │
      ▼
Execution Engine
      │
      ▼
Monitoring Engine
      │
      ▼
Continuous Improvement
```

---

## Princípios

- Business First
- Engine First
- Canonical Contracts
- ViewModels para UI
- Determinismo
- Baixo acoplamento
- IA como copiloto
- Zero treinamento sempre que possível

---

## Objetivo

O Evol OS deve permitir que uma organização seja:

- compreendida;
- simulada;
- analisada;
- otimizada;
- executada;
- monitorada;
- continuamente aprimorada.

Toda evolução da plataforma deve preservar esses princípios.