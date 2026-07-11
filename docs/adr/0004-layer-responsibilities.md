# ADR 0004 — Layer Responsibilities

## Status

Accepted

---

## Context

O Evol OS utiliza uma arquitetura baseada em Features.

Dentro de cada Feature existem camadas com responsabilidades específicas.

Cada camada possui um único objetivo e deve depender apenas da camada imediatamente inferior.

Essa separação reduz acoplamento, facilita testes, melhora manutenção e evita que regras de negócio fiquem espalhadas pelo sistema.

---

# Arquitetura

```
UI
│
▼
Actions
│
▼
Services
│
▼
Repositories
│
▼
Database
```

Para leitura:

```
Pages
│
▼
Queries
│
▼
Services
│
▼
Repositories
│
▼
Database
```

---

## Repositories

Responsáveis exclusivamente pelo acesso aos dados.

### Responsabilidades

- consultas
- inserts
- updates
- deletes
- paginação
- filtros simples

### Não devem conter

- regras de negócio
- validações de domínio
- composição de dados
- decisões de negócio

---

## Services

Implementam as regras do domínio.

São a camada mais importante da aplicação.

### Responsabilidades

- cálculos
- regras de negócio
- composição de dados
- orquestração entre repositories
- reutilização entre features

Exemplos

- calcular gap de competências
- gerar plano de desenvolvimento
- aplicar template
- criar plano automaticamente
- calcular score de talento

Services nunca conhecem componentes React.

---

## Queries

Preparação de dados para leitura.

Devem retornar exatamente o formato esperado pela UI.

Podem utilizar um ou mais Services.

Nunca acessam o banco diretamente.

---

## Actions

Representam operações de escrita.

Responsabilidades

- receber dados do formulário
- validar utilizando Zod
- chamar Services
- revalidar cache
- redirecionar quando necessário

Actions nunca implementam regra de negócio.

---

## Components

Responsáveis apenas pela interface.

Não implementam regras de negócio.

Não acessam o banco.

Interagem apenas com Actions ou recebem dados já preparados.

---

## Consequences

### Positivas

- responsabilidades bem definidas
- alta reutilização
- baixo acoplamento
- maior testabilidade
- manutenção simples
- arquitetura escalável

### Negativas

- maior quantidade de arquivos
- curva de aprendizado um pouco maior
