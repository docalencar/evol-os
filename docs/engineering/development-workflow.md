# Development Workflow

## Objetivo

Este documento define o fluxo oficial de desenvolvimento do Evol OS.

Toda funcionalidade, correção ou melhoria deve seguir este workflow.

---

# Filosofia

O objetivo não é apenas entregar software.

É entregar software:

- previsível;
- testável;
- sustentável;
- fácil de manter.

Cada etapa existe para reduzir riscos e evitar retrabalho.

---

# Workflow Oficial

## 1. Entendimento

Antes de escrever código:

- compreender o problema;
- compreender o domínio;
- identificar impacto;
- revisar arquitetura existente.

Nunca implementar sem entender o contexto.

---

## 2. Modelagem

Definir:

- entidades;
- tipos;
- regras;
- relacionamentos;
- responsabilidades.

Caso seja necessária alteração arquitetural:

- criar uma ADR.

---

## 3. Persistência

Quando houver alteração de banco:

- migration;
- índices;
- constraints;
- RLS;
- seed (quando necessário).

---

## 4. Backend

Implementar seguindo:

Repository

↓

Service

↓

Query / Action

↓

UI

Nunca inverter dependências.

---

## 5. Frontend

Construir:

- componentes pequenos;
- formulários organizados;
- estados vazios;
- loading;
- tratamento de erros.

Evitar componentes gigantes.

---

## 6. Build

Sempre executar:

```bash
npm run build
```

Nenhuma etapa seguinte acontece com o build quebrado.

---

## 7. Testes

Validar:

- criação;
- edição;
- leitura;
- arquivamento;
- navegação;
- persistência;
- mensagens;
- casos limite.

---

## 8. Documentação

Atualizar quando necessário:

- ADR
- Engineering
- Playbooks
- AI_CONTEXT
- NEXT_STEPS

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

# Estratégia de PRs

Sempre preferir:

PR pequena

↓

review simples

↓

merge rápido

↓

nova PR

Em vez de:

PR enorme

↓

muitos conflitos

↓

review difícil

↓

alto risco

---

# Definition of Done

Uma implementação só está pronta quando:

- build verde;
- testes concluídos;
- documentação atualizada;
- código revisado;
- commit realizado;
- push concluído.

Sem esses itens a implementação não está concluída.
