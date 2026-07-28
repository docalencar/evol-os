# Scenario Intelligence — Backlog de Evolução

> Backlog rastreável que preserva a visão futura fora do caminho crítico do MVP.

Este documento transforma a [visão de produto](./PRODUCT_VISION.md) em itens
rastreáveis, organizados por horizonte. Nada aqui pertence ao
[escopo do MVP](./MVP_SCOPE.md). Nenhum item é descartado: o que não entra agora é
registrado aqui para evoluir depois.

Este backlog **não define datas nem cronogramas**. Os horizontes indicam ordem e
dependência, não prazo.

Horizontes utilizados:

- **Pós-MVP imediato** — evoluções naturais logo após fechar o fluxo do MVP.
- **Médio prazo** — capacidades que exigem base já consolidada.
- **Longo prazo** — inteligência avançada, preditiva e de aprendizado.
- **Plataforma** — a consolidação transversal da inteligência organizacional.

---

## Pós-MVP imediato

### Score multidimensional
- **Objetivo:** evoluir do score geral único para scores por dimensão (`overallScore`,
  `financialScore`, `organizationalScore`, `executionScore`, `riskScore`,
  `strategicScore`, `sustainabilityScore`).
- **Valor para o usuário:** entender o cenário por ângulos distintos, não apenas por
  uma nota única.
- **Dependências:** score geral explicável do MVP; métricas principais.
- **Por que não entra no MVP:** amplia complexidade de cálculo e explicação além da
  pergunta central do MVP.
- **Possível critério de aceite futuro:** cada dimensão possui score determinístico e
  suas próprias `reasons`.

### Risk Intelligence
- **Objetivo:** produzir uma leitura dedicada de risco (score, nível, razões,
  entidades e lideranças impactadas, riscos operacionais, de capacidade, de
  continuidade e financeiros).
- **Valor para o usuário:** enxergar riscos do cenário de forma estruturada antes de
  decidir.
- **Dependências:** métricas principais; identificação de entidades impactadas.
- **Por que não entra no MVP:** exige modelagem de risco que ultrapassa os alertas
  essenciais.
- **Possível critério de aceite futuro:** cada risco identificado aponta origem,
  entidades afetadas e razões.

### Trade-offs avançados
- **Objetivo:** apresentar vantagens, desvantagens, ganhos, perdas, riscos aceitos,
  capacidades reduzidas e impactos de curto e longo prazo.
- **Valor para o usuário:** decidir com consciência do que se ganha e do que se abre
  mão.
- **Dependências:** métricas principais; risk intelligence.
- **Por que não entra no MVP:** requer comparação estruturada que excede a
  interpretação enxuta do MVP.
- **Possível critério de aceite futuro:** todo trade-off apresenta os dois lados de
  forma explícita e explicável.

### Recomendações priorizadas
- **Objetivo:** evoluir da recomendação principal única para recomendações múltiplas,
  cada uma com prioridade, justificativa, impacto esperado, entidades afetadas,
  dependências, prazo sugerido e nível de confiança.
- **Valor para o usuário:** receber um conjunto ordenado de próximos passos.
- **Dependências:** recomendação principal do MVP; score.
- **Por que não entra no MVP:** o MVP entrega uma recomendação principal para manter
  o caminho crítico enxuto.
- **Possível critério de aceite futuro:** cada recomendação é priorizada e
  justificada de forma explicável.

### Alertas inteligentes
- **Objetivo:** ampliar os alertas essenciais para alertas inteligentes (ex.:
  crescimento acima da capacidade, ausência de sucessores, aumento de risco
  operacional, excesso de camadas, orçamento ultrapassado, liderança sobrecarregada,
  concentração de conhecimento, perda de capacidade crítica, quadro fora do ideal).
- **Valor para o usuário:** ser avisado de problemas relevantes antes que aconteçam.
- **Dependências:** alertas essenciais do MVP; risk intelligence.
- **Por que não entra no MVP:** exige regras de detecção adicionais além do essencial.
- **Possível critério de aceite futuro:** cada alerta indica a condição que o
  disparou e as entidades envolvidas.

### Decision Narrative
- **Objetivo:** produzir uma narrativa executiva estruturada (`executiveSummary`,
  `expectedOutcome`, `implementationConsiderations`, `decisionNarrative`,
  `strategicContext`, `majorRisks`, `recommendedNextStep`).
- **Valor para o usuário:** compreender o cenário em linguagem executiva coerente.
- **Dependências:** resumo executivo determinístico do MVP.
- **Por que não entra no MVP:** o MVP entrega apenas o resumo executivo
  determinístico.
- **Possível critério de aceite futuro:** a narrativa é gerada de forma
  determinística e rastreável, sem depender de IA generativa.

---

## Médio prazo

### Complexity Engine
- **Objetivo:** medir a complexidade de implementar o cenário (quantidade de
  mudanças, dependências, duração estimada, concentração, dificuldade operacional,
  necessidade de coordenação, complexidade da sequência de execução).
- **Valor para o usuário:** avaliar não só o impacto, mas a dificuldade de executar.
- **Dependências:** métricas principais; dados do cenário e de sequência de execução.
- **Por que não entra no MVP:** introduz uma nova dimensão de cálculo fora da pergunta
  central.
- **Possível critério de aceite futuro:** a complexidade é calculada de forma
  determinística e explicável.

### Confidence Score
- **Objetivo:** medir explicitamente a confiança da recomendação (qualidade e
  completude dos dados, presença de hipóteses, estabilidade dos resultados, fatores
  que reduzem a confiança).
- **Valor para o usuário:** saber o quanto pode confiar na recomendação apresentada.
- **Dependências:** score; rastreamento de hipóteses e qualidade de dados.
- **Por que não entra no MVP:** o MVP não implementa score de confiança avançado.
- **Possível critério de aceite futuro:** toda recomendação relevante acompanha um
  nível de confiança justificado.

### Financial Intelligence
- **Objetivo:** aprofundar o impacto financeiro (variação mensal e anual, impacto na
  folha, custos de contratação, desligamento e substituição, verbas rescisórias,
  retorno estimado, payback, impacto orçamentário).
- **Valor para o usuário:** entender o cenário sob a ótica financeira detalhada.
- **Dependências:** impacto financeiro básico do MVP; dados de custo confiáveis.
- **Por que não entra no MVP:** o MVP restringe-se ao impacto financeiro básico quando
  há dados confiáveis.
- **Possível critério de aceite futuro:** cada indicador financeiro é calculado a
  partir de dados de domínio confiáveis e é explicável.

### Comparação entre cenários
- **Objetivo:** comparar dois ou mais cenários lado a lado por suas métricas e scores.
- **Valor para o usuário:** escolher entre alternativas com base em critérios claros.
- **Dependências:** score; métricas principais consolidadas.
- **Por que não entra no MVP:** o MVP interpreta um cenário por vez.
- **Possível critério de aceite futuro:** a comparação apresenta diferenças
  explicáveis entre os cenários.

### Ranking de cenários
- **Objetivo:** ordenar múltiplos cenários segundo critérios de custo, risco e
  capacidade.
- **Valor para o usuário:** identificar rapidamente o cenário mais equilibrado.
- **Dependências:** comparação entre cenários; scores multidimensionais.
- **Por que não entra no MVP:** depende de comparação, que já é pós-MVP.
- **Possível critério de aceite futuro:** o ranking expõe os critérios e o peso de
  cada um de forma explicável.

### Decision Engine
- **Objetivo:** consumir a interpretação do Scenario Intelligence e apoiar/registrar a
  decisão humana com critérios, evidências e justificativas.
- **Valor para o usuário:** transformar a interpretação em uma decisão rastreável e
  auditável.
- **Dependências:** resultado do MVP adequado ao consumo pelo Decision Engine.
- **Por que não entra no MVP:** o MVP prepara a integração futura, mas não implementa
  a etapa de decisão.
- **Possível critério de aceite futuro:** a decisão preserva evidência, justificativa
  e a escolha humana explícita.

---

## Longo prazo

### Modelos preditivos
- **Objetivo:** antecipar tendências e resultados prováveis de cenários.
- **Valor para o usuário:** decidir com base em projeções de futuro, não só no estado
  simulado.
- **Dependências:** histórico consolidado; monitoramento entre projeção e resultado
  real.
- **Por que não entra no MVP:** o MVP é determinístico e não usa predição.
- **Possível critério de aceite futuro:** as predições declaram suas hipóteses e seu
  nível de confiança.

### Benchmarking
- **Objetivo:** comparar indicadores do cenário com referências externas.
- **Valor para o usuário:** situar a organização em relação ao mercado.
- **Dependências:** métricas consolidadas; fontes externas confiáveis.
- **Por que não entra no MVP:** o MVP não realiza benchmarking externo.
- **Possível critério de aceite futuro:** cada comparação indica a fonte e a base de
  referência.

### Aprendizado com decisões anteriores
- **Objetivo:** aprender com reorganizações e decisões passadas para apoiar futuras.
- **Valor para o usuário:** recomendações que melhoram com a experiência acumulada da
  organização.
- **Dependências:** Decision Engine; histórico de decisões; monitoramento de
  resultado real.
- **Por que não entra no MVP:** exige base histórica e ciclo de decisão maduros.
- **Possível critério de aceite futuro:** o aprendizado é rastreável e não substitui a
  decisão humana.

### Monitoramento entre projeção e resultado real
- **Objetivo:** comparar o que foi projetado com o que de fato ocorreu após a
  execução.
- **Valor para o usuário:** medir a precisão das interpretações e corrigir o rumo.
- **Dependências:** Execution Engine; Monitoring Engine.
- **Por que não entra no MVP:** depende de etapas posteriores ao Scenario
  Intelligence.
- **Possível critério de aceite futuro:** o desvio entre projeção e realidade é medido
  e explicável.

### AI Copilot
- **Objetivo:** oferecer um copiloto que consome resultados determinísticos das
  Engines, usa o contexto organizacional e explica suas recomendações.
- **Valor para o usuário:** interagir em linguagem natural com a inteligência da
  plataforma.
- **Dependências:** Organizational Intelligence; Scenario Intelligence maduro.
- **Por que não entra no MVP:** o MVP não depende de IA generativa e a IA não produz
  decisões sem base estruturada.
- **Possível critério de aceite futuro:** toda saída do copiloto é explicável e
  fundamentada em resultados determinísticos.

---

## Plataforma

### Organizational Intelligence Platform
- **Objetivo:** consolidar o Scenario Intelligence como a primeira base de uma camada
  transversal de inteligência organizacional (scenario, workforce, financial, risk,
  succession, talent, productivity, hiring, engagement, leadership e executive
  insights).
- **Valor para o usuário:** uma inteligência única e coerente atravessando toda a
  plataforma.
- **Dependências:** maturidade do Scenario Intelligence e das demais capacidades de
  inteligência.
- **Por que não entra no MVP:** o MVP não tenta resolver a plataforma transversal
  completa.
- **Possível critério de aceite futuro:** cada módulo de inteligência publica
  resultados explicáveis sob contratos canônicos consistentes.
