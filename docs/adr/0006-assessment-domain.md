# ADR 0006 — Assessment Domain

## Status

Accepted

---

## Contexto

O schema inicial do Evol OS já possui:

- `assessment_templates`
- `assessment_questions`
- `assessments`
- `assessment_answers`
- `feedbacks`

A estrutura atual representa avaliações individuais vinculadas diretamente a uma pessoa, um gestor e um template.

Esse modelo não é suficiente para suportar:

- ciclos de avaliação;
- autoavaliação;
- avaliação por gestor;
- avaliação por pares;
- avaliação por subordinados;
- avaliações 90°, 180° e 360°;
- acompanhamento de prazos;
- fechamento e consolidação de resultados.

---

## Decisão

O domínio de avaliações será organizado a partir de um ciclo.

```text
Assessment Cycle
        │
        ├── Templates
        ├── Participants
        ├── Assessments
        ├── Answers
        ├── Scores
        └── Feedbacks
        