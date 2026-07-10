# ADR 0001 — Feature Architecture

## Status

Accepted

---

## Context

O Evol OS utiliza uma arquitetura baseada em features.

Cada domínio do negócio é isolado em um módulo próprio.

Exemplos:

- People
- Organization
- Competencies
- Talent
- Development

Cada módulo possui suas próprias responsabilidades e não deve acessar diretamente estruturas internas de outro módulo.

---

## Decision

Toda nova feature deverá seguir a estrutura:

```
feature/

actions/
components/
constants/
queries/
repositories/
schemas/
services/
types/
index.ts
```

### Responsabilidades

- **actions/** → operações de escrita
- **components/** → componentes React
- **constants/** → constantes, labels e enums
- **queries/** → consultas
- **repositories/** → acesso ao banco
- **schemas/** → validação (Zod)
- **services/** → regras de negócio
- **types/** → tipos e interfaces

---

## Consequences

### Positivas

- Arquitetura previsível.
- Facilita manutenção.
- Facilita testes.
- Facilita onboarding.
- Módulos independentes.

### Negativas

- Maior número de arquivos.
- Estrutura inicial mais extensa.
