# Database Standards

## Objetivo

Este documento define os padrões oficiais para modelagem e evolução do banco de dados do Evol OS.

Toda alteração estrutural deve seguir estas convenções para garantir consistência, performance e facilidade de manutenção.

---

# Banco de Dados

O Evol OS utiliza:

- PostgreSQL
- Supabase
- Row Level Security (RLS)
- UUID como chave primária

---

# Convenções de nomenclatura

## Tabelas

Utilizar nomes no plural.

Exemplos:

```
people
positions
departments
development_plans
```

---

## Colunas

Utilizar `snake_case`.

Exemplos:

```
company_id
created_at
updated_at
deleted_at
hierarchical_level
```

---

## Chaves Primárias

Toda tabela deve possuir:

```
id uuid primary key
```

Utilizar UUID para evitar colisões e facilitar sincronizações futuras.

---

## Chaves Estrangeiras

Sempre utilizar:

```
<entidade>_id
```

Exemplos:

```
company_id
department_id
manager_id
position_id
```

Sempre criar a foreign key correspondente.

---

# Auditoria

Sempre que aplicável:

```
created_at
updated_at
deleted_at
```

## Soft Delete

Quando a entidade puder ser arquivada, utilizar:

```
deleted_at timestamp with time zone
```

Evitar exclusão física.

---

# Migrations

Cada migration deve possuir apenas um objetivo.

Exemplo:

```
0018_add_position_structure.sql

✔ correto
```

Evitar migrations enormes com múltiplas funcionalidades.

---

# Constraints

Sempre utilizar constraints quando representarem regras de domínio.

Exemplos:

- CHECK
- UNIQUE
- FOREIGN KEY

Preferir validar também na aplicação utilizando Zod.

---

# Índices

Criar índices para:

- foreign keys;
- colunas frequentemente filtradas;
- colunas utilizadas em ordenação;
- consultas críticas.

Evitar índices desnecessários.

---

# Row Level Security (RLS)

Toda nova tabela deve possuir políticas de acesso.

As políticas devem seguir os papéis oficiais do Evol OS:

- owner
- admin
- hr
- manager
- employee

Evitar acesso público.

---

# Seeds

Criar seeds apenas quando:

- facilitarem desenvolvimento;
- forem necessários para demonstrações;
- representarem dados padrão do sistema.

Nunca depender de seeds para funcionamento da aplicação em produção.

---

# Evolução do Schema

Alterações estruturais devem ser feitas por novas migrations.

Nunca editar migrations já aplicadas em ambientes compartilhados.

---

# Boas práticas

Preferir:

- migrations pequenas;
- constraints explícitas;
- índices bem justificados;
- nomenclatura consistente;
- RLS habilitado.

Evitar:

- duplicação de dados;
- exclusão física quando houver histórico;
- regras de negócio no banco;
- migrations com múltiplos objetivos.

---

# Referências

Este documento complementa:

- Database Blueprint
- ENGINEERING_GUIDE.md
- ADRs de Arquitetura
