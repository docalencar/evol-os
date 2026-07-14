# Playbook — Evolução do Banco de Dados

## Objetivo

Este playbook define o processo oficial para realizar alterações no banco de dados do Evol OS.

Toda mudança estrutural deve preservar a integridade dos dados, minimizar riscos e manter compatibilidade com ambientes já existentes.

---

# Quando utilizar

Este playbook deve ser seguido quando houver:

- criação de tabelas;
- alteração de colunas;
- inclusão de relacionamentos;
- criação de índices;
- inclusão de constraints;
- criação ou alteração de políticas RLS;
- ajustes de performance.

---

# Fluxo oficial

## 1. Modelagem

Antes de escrever a migration:

- identificar a necessidade do domínio;
- validar impactos nas entidades existentes;
- definir nomenclatura;
- verificar se já existe estrutura semelhante.

Nunca começar pela migration.

---

## 2. Compatibilidade

Sempre perguntar:

- existem dados em produção?
- haverá impacto em funcionalidades existentes?
- a alteração pode quebrar versões anteriores?

Sempre preferir mudanças compatíveis.

---

## 3. Criar a Migration

Cada migration deve possuir apenas um objetivo.

Exemplo:

```
0020_add_employee_skills.sql
```

Evitar migrations que misturem múltiplas funcionalidades.

---

## 4. Estrutura

Sempre avaliar:

- PRIMARY KEY
- FOREIGN KEY
- CHECK
- UNIQUE
- DEFAULT
- NOT NULL

Adicionar apenas o necessário.

---

## 5. Índices

Criar índices para:

- foreign keys;
- filtros frequentes;
- ordenações recorrentes;
- consultas críticas.

Evitar indexar colunas sem uso.

---

## 6. RLS

Para cada nova tabela:

- habilitar Row Level Security;
- criar políticas para os papéis oficiais do Evol OS;
- validar acesso por empresa (`company_id`) quando aplicável.

Nenhuma tabela de negócio deve permanecer sem políticas.

---

## 7. Auditoria

Sempre considerar:

- created_at
- updated_at
- deleted_at (quando houver arquivamento)

Evitar exclusão física de dados históricos.

---

## 8. Atualização da aplicação

Após a migration:

1. atualizar tipos;
2. atualizar schemas;
3. atualizar repositories;
4. atualizar services;
5. atualizar queries/actions;
6. atualizar interface.

A migration nunca deve ficar isolada.

---

## 9. Validação

Confirmar:

- migration executa sem erro;
- constraints funcionam;
- índices foram criados;
- RLS está correta;
- aplicação continua funcionando.

---

## 10. Documentação

Atualizar quando necessário:

- Database Blueprint;
- ADRs;
- Engineering;
- AI_CONTEXT;
- NEXT_STEPS.

---

# Critérios de conclusão

Uma alteração de banco está concluída quando:

- migration aplicada;
- aplicação compatível;
- build verde;
- testes funcionais aprovados;
- documentação atualizada.

---

# Referências

- database-standards.md
- development-workflow.md
- ENGINEERING_GUIDE.md
