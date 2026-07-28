# Scenario Intelligence — Escopo do MVP

> Escopo oficial e controlado do Scenario Intelligence entregue pela **PR-083C**.

Este documento define, de forma controlada, o que o Scenario Intelligence MVP faz e,
sobretudo, o que ele **não** faz nesta etapa. É a referência para impedir aumento de
escopo. A visão de longo prazo está preservada em
[PRODUCT_VISION.md](./PRODUCT_VISION.md) e o que fica para depois está registrado em
[EVOLUTION_BACKLOG.md](./EVOLUTION_BACKLOG.md).

---

## Problema que o MVP resolve

Hoje o fluxo do Evol OS chega até a projeção de um cenário, mas não há uma etapa que
**interprete** esse resultado de forma objetiva. Sem interpretação, o usuário precisa
ler o estado projetado e concluir sozinho o que ele significa. O MVP resolve esse
vazio: fecha o fluxo do produto ponta a ponta ao transformar a projeção em uma
leitura clara — impacto principal, score explicável e recomendação.

---

## Usuário beneficiado

- Líderes e gestores que planejam mudanças organizacionais e precisam entender o
  impacto de um cenário sem interpretar dados brutos.
- Profissionais de RH que conduzem reorganizações e precisam de uma leitura objetiva
  e explicável para apoiar a conversa de decisão.

---

## Resultado esperado

O usuário visualiza, a partir de um cenário projetado, uma interpretação enxuta e
explicável: o que muda, qual o impacto principal, um score geral com suas razões,
uma recomendação principal, alertas essenciais e um resumo executivo — tudo
determinístico e pronto para alimentar a etapa de decisão.

---

## Entradas

- O resultado da **Projection Engine** (organização projetada e a comparação
  implícita com o estado atual).
- Os dados organizacionais necessários já disponíveis (estrutura, mudanças do
  cenário e, quando existirem e forem confiáveis, dados de custo).

O Scenario Intelligence não coleta dados novos nem recalcula a projeção; ele opera
sobre o que a Projection Engine entrega.

---

## Saídas

- métricas organizacionais principais do cenário;
- impacto financeiro básico, quando houver dados confiáveis;
- score geral explicável (com `reasons`);
- recomendação principal;
- alertas essenciais;
- resumo executivo determinístico;
- um ViewModel para consumo pela interface;
- um resultado adequado para consumo posterior pelo Decision Engine.

---

## Funcionalidades obrigatórias

O MVP deve contemplar:

- **métricas principais** do cenário;
- **impacto financeiro básico**, apenas quando houver dados confiáveis;
- **score geral**, sempre acompanhado de suas **`reasons`**;
- **recomendação principal**;
- **alertas essenciais**;
- **resumo executivo** determinístico;
- **comportamento determinístico** de ponta a ponta;
- **testes determinísticos** da Engine.

### Exemplo conceitual de score explicável

O exemplo abaixo é ilustrativo e serve apenas para fixar a regra "nenhum score sem
explicação". Não define fórmula nem pesos.

```text
score: 82
reasons:
  - baixo número de alterações estruturais;
  - impacto financeiro moderado;
  - ausência de arquivamentos críticos;
  - execução concentrada em poucas áreas.
```

---

## Características obrigatórias

O Scenario Intelligence MVP deve ser:

- **determinístico** — as mesmas entradas produzem sempre o mesmo resultado;
- **explicável** — todo score, alerta e recomendação apresenta suas razões;
- **testável** — coberto por testes determinísticos da Engine;
- **desacoplado da UI** — nenhuma regra de negócio na interface;
- **baseado na Projection Engine** — opera sobre o resultado da projeção;
- **adequado ao Decision Engine** — produz um resultado consumível pela etapa de
  decisão.

As narrativas e recomendações do MVP são geradas por **regras determinísticas**. O
MVP **não** depende de IA generativa.

---

## Fora do escopo imediato

Os itens abaixo pertencem à visão de produto e ao backlog de evolução. Não são
implementados nesta PR:

- IA generativa;
- predição;
- benchmarking externo;
- múltiplos modelos estatísticos;
- ROI sofisticado;
- análise estratégica completa;
- score de confiança avançado;
- plataforma transversal completa (Organizational Intelligence Platform);
- automação de decisão;
- execução automática.

Cada um desses itens está preservado em [EVOLUTION_BACKLOG.md](./EVOLUTION_BACKLOG.md).

---

## Critérios de aceite

- O módulo recebe o resultado da Projection Engine e produz as saídas obrigatórias.
- O score geral nunca é apresentado sem `reasons`.
- Métricas principais e impacto financeiro básico (quando suportado) são calculados
  de forma determinística.
- Uma recomendação principal e os alertas essenciais são gerados por regras
  determinísticas.
- Existe um resumo executivo determinístico.
- Existe um ViewModel que expõe o resultado à interface, sem regra de negócio na UI.
- Há testes determinísticos cobrindo o comportamento da Engine.

---

## Definição de pronto

- Escopo obrigatório contemplado conceitualmente e implementado sem extrapolar os
  limites deste documento.
- Comportamento determinístico verificado por testes.
- Resultado desacoplado da UI e adequado ao consumo pelo Decision Engine.
- Nenhum item marcado como fora do escopo foi introduzido.
- Documentação do módulo consistente com o resultado entregue.

---

## Riscos de aumento de escopo

- Tentar resolver, já no MVP, toda a futura Organizational Intelligence Platform.
- Introduzir scores multidimensionais, risk intelligence ou financial intelligence
  avançada antes da hora.
- Adicionar IA generativa para gerar narrativas ou recomendações.
- Criar fórmulas ou pesos sofisticados sem dados de domínio suficientes.
- Antecipar comparação e ranking de cenários, predição ou benchmarking.

---

## Regras para impedir overengineering

- O MVP responde a uma única pergunta central; funcionalidades que não a servem vão
  para o backlog.
- Todo score e recomendação nasce de regra determinística e explicável — nada de
  modelos estatísticos múltiplos nesta etapa.
- Não criar contratos técnicos definitivos nem tipos nesta PR de documentação.
- Não definir fórmulas matemáticas sem dados de domínio suficientes.
- Qualquer ideia avançada que surgir é registrada no backlog, nunca descartada e
  nunca implementada por impulso.
