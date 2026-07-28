# Canonical Contract — Scenario Intelligence Engine

> Especificação oficial e conceitual do contrato do Scenario Intelligence Engine.
> Este documento responde "o que é o Scenario Intelligence?", e não "como ele é
> implementado?". É conhecimento de domínio: não contém código, tipos, JSON, APIs,
> fórmulas, pesos ou algoritmos.

---

## 1. Objetivo

Definir oficialmente o propósito do Scenario Intelligence Engine.

**Qual problema resolve.** Após uma projeção, existe um estado organizacional futuro
simulado, porém ainda não interpretado. Ler esse estado bruto e concluir o que ele
significa é trabalhoso e sujeito a interpretações divergentes. O Scenario
Intelligence resolve esse vazio: interpreta o resultado da projeção e o traduz em uma
leitura objetiva e explicável do cenário.

**Qual valor entrega.** Transforma um estado projetado em compreensão: o que muda no
cenário, qual é o seu impacto principal e se ele aparenta ser recomendável. Entrega
essa leitura de forma determinística e justificada, para que a organização decida com
clareza.

**Quais decisões apoia.** Apoia decisões sobre mudanças organizacionais planejadas —
por exemplo, aprovar, revisar, adiar ou rejeitar um cenário. O Scenario Intelligence
não toma essas decisões; ele fornece a interpretação que as fundamenta.

---

## 2. Responsabilidades

O Scenario Intelligence Engine:

- **interpreta projeções** — lê o estado projetado e o compara conceitualmente com o
  estado atual da organização;
- **organiza informações** — estrutura o resultado da projeção em uma leitura
  compreensível;
- **produz inteligência determinística** — gera métricas e um score a partir de regras
  determinísticas, sem aleatoriedade;
- **gera recomendações explicáveis** — produz recomendação sempre acompanhada de sua
  justificativa;
- **sintetiza resultados** — consolida a leitura em um resumo objetivo do cenário.

---

## 3. Não Responsabilidades

O Scenario Intelligence Engine **não**:

- altera projeções;
- executa mudanças;
- aprova cenários;
- modifica a organização;
- utiliza IA generativa;
- substitui o Decision Engine.

Sua função é interpretar. Decidir, aprovar e executar pertencem a outras etapas.

---

## 4. Entradas

O Scenario Intelligence recebe, conceitualmente, as seguintes entradas. Nenhuma delas
é definida aqui como tipo ou estrutura técnica.

- **Projection Result** — o estado futuro simulado produzido pela Projection Engine. É
  a entrada central: representa como a organização ficaria caso o cenário fosse
  aplicado.
- **Scenario** — o cenário de mudança que originou a projeção, com as alterações
  pretendidas. Dá sentido ao resultado projetado, indicando o que foi proposto.
- **Organization Snapshot** — a representação do estado atual da organização. Serve de
  referência para interpretar o que muda em relação à realidade vigente.
- **Planning Context** — o contexto de planejamento associado ao cenário. Fornece o
  enquadramento sob o qual a interpretação deve ser feita.

---

## 5. Saídas

O Scenario Intelligence produz, conceitualmente, um objeto chamado **Scenario
Intelligence**. O significado de cada elemento é descrito abaixo, sem JSON e sem
TypeScript.

- **summary** — a síntese objetiva do cenário: o que muda e qual é o seu impacto
  principal, em linguagem compreensível.
- **metrics** — as métricas organizacionais que descrevem o cenário sob dimensões
  relevantes (por exemplo, estruturais e, quando houver dados confiáveis, financeiras).
- **score** — a leitura geral e explicável do cenário. Representa quão recomendável ele
  aparenta ser, sempre acompanhado das razões que o sustentam.
- **recommendation** — a recomendação principal derivada da interpretação, sempre
  justificada.
- **warnings** — os alertas essenciais que apontam condições que merecem atenção no
  cenário.
- **metadata** — as informações de contexto sobre a própria interpretação (por
  exemplo, sua origem e referências), que permitem rastreabilidade.

---

## 6. Consumidores

O resultado do Scenario Intelligence é utilizado por:

- **Decision Engine** — consome a interpretação para apoiar e registrar a decisão.
- **Dashboards** — apresentam a leitura do cenário aos usuários.
- **Executive Reports** — incorporam a síntese e as métricas em relatórios executivos.
- **Monitoring** — utiliza a interpretação como referência para acompanhar resultados.
- **AI Copilot (futuro)** — consumirá o resultado determinístico para explicar e
  recomendar, sem produzir decisões sem base estruturada.

---

## 7. Dependências

O Scenario Intelligence depende, conceitualmente, de:

- **Projection Engine** — fornece o Projection Result, entrada central da
  interpretação;
- **Planning** — fornece o cenário e o contexto de planejamento;
- **Organization** — fornece a representação do estado atual da organização.

O Scenario Intelligence **não depende de IA**. Sua inteligência é determinística.

---

## 8. Invariantes

Regras permanentes que o contrato deve sempre respeitar:

- Toda recomendação deve possuir justificativa.
- Todo score deve ser explicável.
- A saída deve ser determinística.
- A Engine nunca modifica as entradas.
- O contrato deve permanecer estável.
- A saída deve ser serializável.
- O resultado deve ser reproduzível.

---

## 9. Fluxo conceitual

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
```

Papel de cada etapa:

- **Organization** — representa a organização atual; é a base de referência.
- **Planning** — registra as mudanças pretendidas em um cenário.
- **Projection** — simula o estado futuro resultante do cenário, de forma isolada.
- **Scenario Intelligence** — interpreta o estado projetado e produz a leitura
  explicável do cenário.
- **Decision** — consome a interpretação e registra a decisão humana.
- **Execution** — aplica no mundo real o cenário aprovado.

---

## 10. Exemplos conceituais

Os exemplos abaixo são descrições funcionais de uso. Não contêm JSON nem código, e não
definem métricas, fórmulas ou pesos.

### Exemplo 1 — Expansão de equipe

Um gestor planeja ampliar uma equipe com novas contratações. Após a projeção, o
Scenario Intelligence interpreta o estado futuro: sintetiza que o cenário aumenta o
quadro em uma área específica, aponta o impacto principal (por exemplo, crescimento de
capacidade acompanhado de aumento de custo), produz um score explicável e uma
recomendação justificada, e emite alertas essenciais caso o crescimento se aproxime de
limites relevantes. O gestor entende rapidamente o que muda e o quanto isso parece
recomendável.

### Exemplo 2 — Redução de estrutura

A liderança avalia reduzir parte da estrutura organizacional. Depois da projeção, o
Scenario Intelligence interpreta o cenário: resume o que é reduzido e onde, indica o
impacto principal (por exemplo, redução de custo com possível perda de capacidade),
apresenta um score explicável e uma recomendação com justificativa, e sinaliza alertas
essenciais quando a redução atinge áreas ou funções sensíveis. A liderança visualiza os
efeitos antes de decidir.

### Exemplo 3 — Reorganização interna

Uma área será reorganizada, com movimentações e mudanças de vínculo entre times e
cargos, sem alteração significativa de quadro. Após a projeção, o Scenario Intelligence
interpreta o cenário: sintetiza as movimentações, destaca o impacto principal (por
exemplo, mudança na distribuição de pessoas e no span de liderança), produz um score
explicável e uma recomendação justificada, e emite alertas essenciais caso a
reorganização concentre alterações ou riscos. A organização compreende o rearranjo
proposto de forma objetiva.
