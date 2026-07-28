# Scenario Intelligence — Visão de Produto

> Visão completa de longo prazo do Scenario Intelligence.

Este documento preserva integralmente o potencial estratégico do Scenario
Intelligence. Todo o conteúdo aqui descrito é **direção futura**, e não estado
atual. O que é entregue agora está definido em [MVP_SCOPE.md](./MVP_SCOPE.md); o
que evolui depois, e em que ordem, está em
[EVOLUTION_BACKLOG.md](./EVOLUTION_BACKLOG.md).

Nada neste documento deve ser lido como já implementado.

---

## Princípio de produto

> "O Evol OS não apenas mostra sua organização. Ele explica o que ela significa e
> ajuda você a decidir o próximo passo."

---

## Visão estratégica

O Scenario Intelligence é a base da capacidade do Evol OS de **interpretar
organizações**. No longo prazo, ele deixa de responder apenas "o que muda neste
cenário" e passa a sustentar uma leitura estratégica e explicável de qualquer
mudança organizacional: seus impactos multidimensionais, seus riscos, sua
complexidade, seus trade-offs e sua confiança.

Ele é a primeira base de uma futura **Organizational Intelligence Platform** — uma
camada transversal de inteligência que atravessa toda a plataforma e alimenta o
**AI Copilot**.

---

## Proposta de valor

Transformar dados organizacionais e resultados de projeção em compreensão e decisão.
Onde outros sistemas mostram números, o Scenario Intelligence explica o significado
desses números e indica o próximo passo — de forma determinística, rastreável e
auditável, com a IA atuando apenas como copiloto.

---

## Explainability

A explicabilidade é o compromisso central da visão. Toda recomendação, alerta ou
score deve responder:

> "Por que o sistema chegou a essa conclusão?"

Elementos possíveis de uma saída explicável:

- `reasons` — as razões que sustentam a conclusão;
- `evidence` — as evidências que embasam as razões;
- `assumptions` — as hipóteses assumidas quando faltam dados;
- `tradeoffs` — as vantagens e desvantagens envolvidas;
- `impactedEntities` — as entidades afetadas;
- `confidence` — o grau de confiança da conclusão.

---

## Scores multidimensionais

No MVP existe um score geral. A visão prevê a evolução para um conjunto de scores
que descrevem o cenário por múltiplas dimensões:

- `overallScore`
- `financialScore`
- `organizationalScore`
- `executionScore`
- `riskScore`
- `strategicScore`
- `sustainabilityScore`

Cada score permanece explicável e determinístico em sua base.

---

## Risk Intelligence

Uma leitura dedicada de risco do cenário, contemplando:

- score de risco;
- nível de risco;
- razões;
- departamentos impactados;
- cargos impactados;
- lideranças críticas;
- riscos operacionais;
- riscos de capacidade;
- riscos de continuidade;
- riscos financeiros.

---

## Organizational Complexity

Uma leitura da complexidade de implementar o cenário, contemplando:

- quantidade de mudanças;
- dependências;
- duração estimada;
- concentração de alterações;
- dificuldade operacional;
- necessidade de coordenação;
- complexidade da sequência de execução.

---

## Confidence Score

Uma medida explícita da confiança da recomendação, contemplando:

- confiança da recomendação;
- qualidade dos dados;
- completude dos dados;
- ausência ou presença de hipóteses;
- estabilidade dos resultados;
- fatores que reduzem a confiança.

---

## Trade-offs

A análise futura deve apresentar de forma clara os trade-offs de cada cenário:

- vantagens;
- desvantagens;
- ganhos;
- perdas;
- riscos aceitos;
- capacidades reduzidas;
- impactos de curto prazo;
- impactos de longo prazo.

---

## Executive Narrative

Uma narrativa executiva estruturada sobre o cenário, contemplando:

- `executiveSummary`;
- `expectedOutcome`;
- `implementationConsiderations`;
- `decisionNarrative`;
- `strategicContext`;
- `majorRisks`;
- `recommendedNextStep`.

No MVP existe apenas o resumo executivo determinístico; a narrativa completa é
visão futura.

---

## Executive Recommendations

Onde o MVP entrega uma recomendação principal, a visão prevê recomendações
múltiplas, cada uma com:

- prioridade;
- justificativa;
- impacto esperado;
- entidades afetadas;
- dependências;
- prazo sugerido;
- nível de confiança.

---

## Intelligent Alerts

Alertas inteligentes que vão além dos alertas essenciais do MVP. Exemplos
conceituais:

- crescimento acima da capacidade;
- ausência de sucessores;
- aumento de risco operacional;
- excesso de camadas hierárquicas;
- orçamento ultrapassado;
- liderança sobrecarregada;
- concentração de conhecimento;
- perda de capacidade crítica;
- quadro abaixo ou acima do ideal.

---

## Financial Intelligence

Uma leitura financeira aprofundada do cenário, contemplando:

- variação mensal;
- variação anual;
- impacto na folha;
- custo de contratação;
- custo de desligamento;
- custo de substituição;
- verbas rescisórias;
- retorno estimado;
- payback;
- impacto orçamentário.

No MVP existe apenas o impacto financeiro básico, condicionado à existência de dados
confiáveis.

---

## Organizational Intelligence Platform

A PR-083C é a primeira base de uma futura plataforma transversal de inteligência
organizacional. A visão de estrutura futura:

```text
organizational-intelligence/
├── scenario-intelligence/
├── workforce-intelligence/
├── financial-intelligence/
├── organizational-risk/
├── succession-intelligence/
├── talent-intelligence/
├── productivity-intelligence/
├── hiring-intelligence/
├── engagement-intelligence/
├── leadership-intelligence/
└── executive-insights/
```

Esta estrutura é apenas documentada nesta etapa. Ela **não** deve ser implementada
nesta PR.

---

## Integração com AI Copilot

No longo prazo, o Scenario Intelligence alimenta o **AI Copilot** dentro de um fluxo
mais amplo de inteligência:

```text
Organization
     ↓
Planning
     ↓
Projection
     ↓
Scenario Intelligence
     ↓
Organizational Intelligence
     ↓
AI Copilot
```

A IA não produz decisões sem base estruturada. O AI Copilot deverá consumir
resultados determinísticos das Engines, utilizar o contexto organizacional e
explicar suas recomendações. A IA permanece copiloto; a decisão crítica permanece
humana.

---

## Perguntas executivas

A visão registra que, ao amadurecer, o produto deve ser capaz de responder perguntas
executivas como:

- Onde devemos contratar primeiro?
- Qual departamento apresenta maior risco?
- Qual líder está sobrecarregado?
- Quem está pronto para promoção?
- Qual cenário gera maior retorno?
- Qual cenário aumenta menos a folha?
- Qual estrutura apresenta maior risco operacional?
- Onde existirão gargalos?
- Qual sucessão é mais crítica?
- Qual competência ameaça a estratégia?
- Qual mudança deve ser executada primeiro?
- Qual cenário possui melhor equilíbrio entre custo, risco e capacidade?

---

## Evolução esperada do produto

A evolução parte do núcleo determinístico do MVP e amplia progressivamente a
profundidade da interpretação: dos scores multidimensionais e da inteligência de
risco, para a inteligência financeira e a comparação entre cenários, e daí para a
Organizational Intelligence Platform e o AI Copilot. Cada passo preserva os
princípios de determinismo, explicabilidade e decisão humana. O detalhamento por
horizontes está em [EVOLUTION_BACKLOG.md](./EVOLUTION_BACKLOG.md).
