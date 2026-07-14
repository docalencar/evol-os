# Playbook — Implementação de CRUD

## Objetivo

Este playbook descreve o fluxo oficial para implementar um CRUD no Evol OS.

Ele deve ser utilizado para qualquer novo módulo do sistema.

Exemplos:

- Departments
- Teams
- Positions
- Competencies
- Development Plans
- Assessment Templates

---

# Fluxo

## 1. Modelagem

Definir:

- entidade;
- atributos;
- relacionamentos;
- regras de domínio.

Se necessário:

- criar ADR.

---

## 2. Banco

Criar migration.

Validar:

- constraints;
- índices;
- foreign keys;
- RLS;
- seed (quando necessário).

---

## 3. Backend

Implementar na seguinte ordem:

```

types

↓

schema

↓

repository

↓

services (quando houver regra)

↓

queries

↓

actions

↓

index.ts

```

Nunca inverter essa sequência.

---

## 4. Frontend

Implementar:

- listagem;
- formulário;
- criação;
- edição;
- arquivamento;
- detalhes (quando aplicável).

Se o formulário crescer:

```

feature-form/

index.tsx
types.ts
sections/

```

---

## 5. Integração

Conectar:

- Queries
- Actions
- Toasts
- Navegação
- Cache

---

## 6. Build

Executar:

```bash
npm run build
```

Corrigir todos os erros antes de prosseguir.

---

## 7. Testes

Validar:

- criar;
- editar;
- arquivar;
- listar;
- persistência;
- atualização da UI.

---

## 8. Documentação

Atualizar quando necessário:

- ADR;
- Engineering;
- AI_CONTEXT;
- NEXT_STEPS.

---

## 9. Git

Antes do commit:

```bash
git diff
```

Depois:

```bash
git add .
git commit
git push
```

---

# Critérios de conclusão

Um CRUD somente é considerado concluído quando:

- build verde;
- testes funcionais aprovados;
- documentação atualizada;
- código revisado;
- push realizado.

---

# Referências

- ENGINEERING_GUIDE.md
- development-workflow.md
- frontend-standards.md
- backend-standards.md
- database-standards.md