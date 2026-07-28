# Scenario Intelligence

> Porta de entrada oficial do módulo **Scenario Intelligence** do Evol OS.

Este documento apresenta o que é o Scenario Intelligence, onde ele se posiciona no
fluxo do Evol OS, quais são suas responsabilidades e seus limites. É o ponto de
partida de leitura do módulo.

---

## O que é o Scenario Intelligence

O Scenario Intelligence é a etapa do Evol OS responsável por **interpretar os
resultados de uma projeção organizacional**. Ele recebe o estado futuro simulado
pela Projection Engine e o traduz em informação útil para decisão: o que muda no
cenário, qual é o seu impacto principal e se ele aparenta ser recomendável.

O Scenario Intelligence não simula, não decide e não executa. Ele **interpreta**.

Sua pergunta central, no MVP, é:

> "O que muda neste cenário, qual é seu impacto principal e ele parece recomendável?"

---

## Posição no fluxo do Evol OS

O Evol OS é um **Organization Operating System**. Uma organização é representada,
planejada, simulada, interpretada, decidida, executada e monitorada de forma
contínua. O Scenario Intelligence ocupa a etapa de interpretação:

```text
Organization
     ↓
Planning
     ↓
Projection
     ↓
Scenario Intelligence
     ↓
Decision
     ↓
Execution
     ↓
Monitoring
     ↓
Continuous Improvement
```

Recorte imediato do módulo:

```text
Projection
     ↓
Scenario Intelligence
     ↓
Decision
     ↓
Execution
```

- **Projection** simula: aplica os ChangeSets sobre uma cópia lógica da organização
  e produz um estado futuro isolado.
- **Scenario Intelligence** interpreta: mede o impacto do estado projetado, produz
  métricas, um score explicável, uma recomendação principal e alertas essenciais.
- **Decision** escolhe: consome a interpretação e registra a decisão humana.
- **Execution** executa: aplica no mundo real o cenário aprovado.

---

## Responsabilidades

O Scenario Intelligence é responsável por:

- interpretar o resultado da Projection Engine;
- calcular as métricas organizacionais principais do cenário;
- estimar o impacto financeiro básico, quando houver dados confiáveis;
- produzir um score geral **sempre acompanhado de explicação**;
- gerar uma recomendação principal;
- emitir alertas essenciais;
- produzir um resumo executivo determinístico;
- expor o resultado à interface por meio de um ViewModel;
- entregar um resultado adequado para consumo posterior pelo Decision Engine.

---

## Limites

O Scenario Intelligence **não**:

- altera dados reais da organização;
- cria ou modifica cenários (isso pertence à Planning Engine);
- simula estados futuros (isso pertence à Projection Engine);
- toma ou registra decisões (isso pertence ao Decision Engine);
- executa mudanças (isso pertence à Execution Engine);
- depende de IA generativa no MVP;
- implementa regra de negócio na UI.

Todo score, alerta ou recomendação precisa ser **explicável**. Nenhum score existe
sem as razões que o justificam.

---

## Diferença entre Projection e Scenario Intelligence

A **Projection Engine** responde "como a organização ficaria" se o cenário fosse
aplicado. Ela produz um estado projetado, de forma determinística e isolada, sem
julgar esse estado.

O **Scenario Intelligence** responde "o que esse estado projetado significa". Ele
compara o estado atual com o projetado, mede impactos e produz uma leitura
interpretada e explicável. A Projection descreve; o Scenario Intelligence
interpreta.

---

## Diferença entre Scenario Intelligence e Decision

O **Scenario Intelligence** interpreta e recomenda, mas não decide. Ele entrega
métricas, score, recomendação principal e alertas.

O **Decision Engine** consome essa interpretação, aplica critérios de decisão,
preserva a evidência e registra a escolha — que permanece humana. Recomendação não
equivale a aprovação.

---

## Estado atual

Esta é a documentação-base do módulo, estabelecida pela **PR-083C.0**. Nesta etapa
existe apenas documentação: o escopo do MVP, a visão de produto de longo prazo, o
backlog de evolução e o registro da decisão.

A implementação da Engine, dos contratos técnicos e dos tipos é planejada para PRs
subsequentes e não faz parte desta entrega.

---

## Princípio: MVP First, Evolution Second

O Scenario Intelligence é entregue em duas camadas oficiais:

1. **Scenario Intelligence MVP** — completa o fluxo do produto ponta a ponta, de
   forma enxuta, determinística e explicável.
2. **Scenario Intelligence Product Vision** — preserva todo o potencial estratégico
   da plataforma, sem aumentar o caminho crítico do MVP.

Primeiro entregamos o núcleo que fecha o fluxo. A visão avançada é preservada em
documentação e backlog, e evolui depois. Nada é descartado; o que não pertence ao
MVP é registrado no backlog de evolução.

---

## Documentos relacionados

- [MVP_SCOPE.md](./MVP_SCOPE.md) — escopo oficial e controlado da PR-083C.
- [PRODUCT_VISION.md](./PRODUCT_VISION.md) — visão completa de longo prazo.
- [EVOLUTION_BACKLOG.md](./EVOLUTION_BACKLOG.md) — visão futura transformada em
  backlog rastreável por horizontes.
- [DECISION_LOG.md](./DECISION_LOG.md) — registro formal da decisão de produto e
  arquitetura.
