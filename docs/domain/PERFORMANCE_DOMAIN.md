# Performance Domain

## Objetivo

O módulo Performance é responsável por avaliar colaboradores,
desenvolver competências, gerar feedbacks e produzir indicadores
para líderes e RH.

O domínio deve ser extensível para suportar:

- avaliações de experiência
- avaliações periódicas
- avaliações 360°
- feedbacks
- PDIs
- IA
- dashboards
- analytics

---

# Entidades

## Assessment Cycle

Representa um período de avaliação.

Exemplo:

- Avaliação 2026
- Experiência 90 dias

---

## Assessment Template

Representa um modelo reutilizável.

Exemplo:

- Liderança
- Avaliação de Experiência
- Feedback 360°

---

## Assessment Section

Agrupa perguntas.

Exemplo:

- Comunicação
- Liderança
- Cultura
- Resultado

---

## Assessment Question

Pergunta individual.

Possui:

- tipo
- ordem
- peso
- obrigatória
- ajuda

---

## Assessment Participant

Quem participa da avaliação.

Exemplo:

- avaliado
- gestor
- pares
- subordinados
- autoavaliação

---

## Assessment Response

Resposta de uma pergunta.

---

## Assessment Score

Resultado consolidado.

Pode existir:

- por pergunta

- por competência

- por seção

- geral

---

## Feedback

Resultado textual da avaliação.

Pode ser:

- manual

- IA

---

## PDI

Plano de Desenvolvimento Individual.

Pode nascer automaticamente a partir da avaliação.

---

# Hierarquia

Assessment Cycle

↓

Assessment Template

↓

Assessment Section

↓

Assessment Question

↓

Assessment Participant

↓

Assessment Response

↓

Assessment Score

↓

Feedback

↓

PDI

---

# Regras

Templates são reutilizáveis.

Ciclos utilizam templates.

Perguntas pertencem a uma seção.

Seções pertencem a um template.

Participantes respondem perguntas.

Respostas geram scores.

Scores geram feedbacks.

Feedbacks podem gerar PDIs.

---

# Fora do escopo do MVP

- calibragem

- benchmark

- IA generativa

- comparação histórica

- metas automáticas

- recomendações inteligentes

Esses itens serão adicionados posteriormente sem alterar este domínio.
