# Scenario Intelligence — Registro de Decisão

> Registro formal da decisão de produto e arquitetura do Scenario Intelligence.
> Formato inspirado em ADR (Architecture Decision Record).

---

## Título

Entregar primeiro um Scenario Intelligence MVP enxuto e preservar a visão avançada em
documentação e backlog.

## Status

Aceita — estabelecida pela PR-083C.0 (documentação). A implementação do MVP é
planejada para PRs subsequentes.

## Contexto

O Evol OS é um Organization Operating System cujo fluxo vai de Organization a
Continuous Improvement. A etapa de **Projection** já produz o estado futuro simulado
de um cenário, mas não existe ainda uma etapa oficial que **interprete** esse
resultado. Sem interpretação, o fluxo do produto não fecha ponta a ponta: falta a
leitura que conecta a projeção à decisão.

Ao mesmo tempo, foi mapeada uma visão ampla e estratégica para o Scenario
Intelligence — scores multidimensionais, risk intelligence, financial intelligence,
trade-offs, narrativas executivas, alertas inteligentes, comparação e ranking de
cenários, integração com o Decision Engine e com o AI Copilot, e uma futura
Organizational Intelligence Platform.

## Problema

Como entregar valor de forma responsável sem comprometer nem a entrega nem a visão?
De um lado, implementar toda a inteligência avançada agora aumentaria tempo,
complexidade e risco, e adiaria o fechamento do fluxo. De outro, descartar as ideias
avançadas para focar apenas no básico perderia direção estratégica e geraria
retrabalho futuro.

## Opções consideradas

### Opção A — Implementar toda a inteligência avançada agora
Construir, já nesta etapa, scores multidimensionais, risk e financial intelligence,
narrativas, comparação e ranking de cenários, entre outros.

### Opção B — Remover as ideias avançadas e focar apenas no básico
Entregar somente o mínimo e descartar a visão avançada da documentação.

### Opção C — Implementar o núcleo do MVP e preservar a visão futura
Entregar um Scenario Intelligence MVP enxuto, determinístico e explicável que fecha o
fluxo do produto, e preservar toda a visão avançada em documentação e backlog
rastreável.

## Decisão

Adotar a **Opção C**.

Entregar primeiro uma versão enxuta e funcional do Scenario Intelligence para
completar o fluxo do MVP, preservando a visão avançada em documentação e backlog.

O MVP responde à pergunta central "o que muda neste cenário, qual é seu impacto
principal e ele parece recomendável?", é determinístico, explicável, testável,
desacoplado da UI, baseado na Projection Engine e adequado ao consumo posterior pelo
Decision Engine. A visão avançada fica preservada em
[PRODUCT_VISION.md](./PRODUCT_VISION.md) e detalhada em
[EVOLUTION_BACKLOG.md](./EVOLUTION_BACKLOG.md); o escopo controlado está em
[MVP_SCOPE.md](./MVP_SCOPE.md).

### Justificativa das opções descartadas

- **Opção A** aumentaria tempo, complexidade e risco, e ampliaria o caminho crítico
  do MVP, atrasando o fechamento do fluxo.
- **Opção B** perderia a visão estratégica e geraria retrabalho, além de descartar
  ideias que têm valor de produto.
- **Opção C** mantém a direção arquitetural e estratégica sem impedir a entrega do
  MVP.

## Consequências positivas

- O fluxo do produto passa a fechar ponta a ponta com uma etapa de interpretação.
- A entrega permanece enxuta, determinística e de baixo risco.
- A visão estratégica é preservada integralmente e permanece rastreável.
- O resultado do MVP já nasce adequado ao consumo pelo Decision Engine.

## Consequências negativas

- Parte do valor estratégico fica adiado para horizontes futuros.
- É necessário disciplina contínua para manter a separação entre MVP e visão futura.
- A documentação precisa ser mantida em dia à medida que o backlog evolui.

## Riscos

- **Aumento de escopo (scope creep):** pressão para antecipar itens avançados dentro
  do MVP.
- **Overengineering:** introduzir fórmulas, pesos ou modelos sofisticados sem dados de
  domínio suficientes.
- **Divergência terminológica:** uso inconsistente dos termos oficiais entre
  documentos e código.

## Mitigação

- [MVP_SCOPE.md](./MVP_SCOPE.md) define explicitamente o que está fora do escopo e as
  regras contra overengineering.
- Todo item avançado que surgir é registrado em
  [EVOLUTION_BACKLOG.md](./EVOLUTION_BACKLOG.md), nunca implementado por impulso e
  nunca descartado.
- A terminologia oficial é mantida consistente entre os documentos do módulo.
- O MVP permanece determinístico e sem dependência de IA generativa.

## Impacto no roadmap

Esta decisão insere o Scenario Intelligence MVP como a etapa que fecha o fluxo do
produto entre Projection e Decision. Os itens avançados são posicionados nos
horizontes de evolução (pós-MVP imediato, médio prazo, longo prazo e plataforma),
sem datas nem cronogramas, preservando a rota até a Organizational Intelligence
Platform e o AI Copilot.

## Critérios para revisitar a decisão

- O MVP se mostrar insuficiente para fechar o fluxo do produto de forma útil.
- Surgirem dados de domínio confiáveis que viabilizem antecipar itens hoje no
  backlog.
- O Decision Engine exigir do Scenario Intelligence um contrato mais rico do que o
  previsto para o MVP.
- A evolução da arquitetura das Engines alterar as fronteiras entre interpretação,
  decisão e inteligência transversal.
