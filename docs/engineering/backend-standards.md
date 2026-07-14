# Backend Standards

## Objetivo

Este documento define os padrões oficiais para desenvolvimento do backend do Evol OS.

O objetivo é garantir uma arquitetura previsível, desacoplada e escalável.

---

# Stack

O backend utiliza:

- Next.js Server Actions
- TypeScript
- Supabase
- PostgreSQL
- Zod

---

# Arquitetura

Toda escrita segue:

```
UI
    │
    ▼
Server Action
    │
    ▼
Service
    │
    ▼
Repository
    │
    ▼
Supabase
```

Toda leitura segue:

```
Page
    │
    ▼
Query
    │
    ▼
Service
    │
    ▼
Repository
    │
    ▼
Supabase
```

Essa direção nunca deve ser invertida.

---

# Repository

Responsável apenas pelo acesso aos dados.

Pode conter:

- select
- insert
- update
- delete
- filtros simples
- paginação

Não pode conter:

- regras de negócio
- validações
- composição de dados
- cálculos

---

# Service

É a camada do domínio.

Responsável por:

- regras de negócio;
- cálculos;
- composição de dados;
- orquestração entre repositories;
- reutilização entre features.

Sempre que uma regra puder ser utilizada por mais de uma Action ou Query, ela deve ser implementada em um Service.

---

# Query

Responsável pela leitura.

Deve retornar exatamente o formato esperado pela interface.

Pode utilizar um ou mais Services.

Nunca acessa diretamente o banco.

---

# Server Action

Responsável pela escrita.

Fluxo esperado:

1. Receber dados.
2. Validar com Zod.
3. Chamar Services.
4. Revalidar cache.
5. Redirecionar quando necessário.
6. Retornar mensagens para a interface.

Não deve implementar regras de negócio.

---

# Schemas

Toda entrada do usuário deve possuir validação utilizando Zod.

As mensagens de erro devem ser claras e voltadas ao usuário.

---

# Tipos

Todos os tipos compartilhados pertencem à feature correspondente.

Evitar tipos globais quando forem específicos de um domínio.

---

# Cache

Sempre que houver escrita:

- utilizar `revalidatePath`;
- revalidar apenas as páginas impactadas.

Evitar revalidações desnecessárias.

---

# Tratamento de erros

As Actions devem retornar mensagens compreensíveis.

Não expor erros internos do banco de dados diretamente ao usuário.

---

# Organização

Estrutura recomendada:

```
feature/
├── actions/
├── queries/
├── repositories/
├── schemas/
├── services/
├── types/
└── index.ts
```

---

# Boas práticas

Preferir:

- Services pequenos;
- Repositories simples;
- Queries específicas;
- Actions enxutas;
- validações centralizadas.

Evitar:

- lógica de negócio em Actions;
- acesso ao banco em componentes;
- duplicação de regras;
- dependências circulares.

---

# Referências

Este documento complementa:

- ADR-0001 — Feature Architecture
- ADR-0004 — Layer Responsibilities
- ENGINEERING_GUIDE.md