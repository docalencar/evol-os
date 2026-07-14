# Playbook — Implementação de Módulos

## Objetivo

Este playbook descreve o fluxo completo para criar um novo módulo no Evol OS.

Um módulo representa uma capacidade completa do sistema, contendo domínio, persistência, interface e documentação.

Exemplos:

- Assessments
- Feedbacks
- Recruitment
- Succession
- Performance
- Learning
- Benefits

---

# Etapa 1 — Descoberta

Antes de escrever código:

- entender o problema;
- definir os usuários envolvidos;
- identificar as regras de negócio;
- mapear entidades;
- mapear relacionamentos;
- identificar indicadores que o módulo deverá responder.

Pergunta principal:

> "Que problema este módulo resolve?"

---

# Etapa 2 — Modelagem do domínio

Definir:

- entidades;
- atributos;
- enums;
- estados;
- relacionamentos;
- responsabilidades.

Sempre modelar o domínio antes do banco.

---

# Etapa 3 — Arquitetura

Criar ou atualizar ADR quando necessário.

Verificar impactos em:

- Features existentes;
- Navegação;
- Permissões;
- Dashboard;
- IA.

---

# Etapa 4 — Banco de Dados

Criar migrations pequenas.

Validar:

- foreign keys;
- índices;
- constraints;
- RLS;
- auditoria;
- soft delete.

Nunca alterar migrations já aplicadas.

---

# Etapa 5 — Backend

Implementar seguindo a ordem:

```text
types
↓
schemas
↓
repositories
↓
services
↓
queries
↓
actions
↓
exports (index.ts)
```

Cada camada deve possuir apenas uma responsabilidade.

---

# Etapa 6 — Frontend

Implementar:

- listagem;
- formulário;
- detalhes;
- dashboards;
- estados vazios;
- loading;
- mensagens de erro;
- toasts.

Quando um componente crescer, dividir em subcomponentes conforme a ADR-0005.

---

# Etapa 7 — Integrações

Verificar integração com:

- Dashboard
- Competências
- Pessoas
- Desenvolvimento
- IA
- Permissões

Todo módulo deve se integrar ao restante do sistema de forma consistente.

---

# Etapa 8 — Qualidade

Executar:

```bash
npm run build
```

Validar:

- TypeScript
- Navegação
- Persistência
- Casos de erro
- Casos limite

---

# Etapa 9 — Documentação

Atualizar, quando necessário:

- ADR
- Engineering
- Playbooks
- AI_CONTEXT.md
- NEXT_STEPS.md

Mudanças arquiteturais devem ser registradas.

---

# Etapa 10 — Git

Antes do commit:

```bash
git diff
git status
```

Depois:

```bash
git add .
git commit
git push
```

---

# Critérios de conclusão

Um módulo somente é considerado concluído quando:

- domínio modelado;
- arquitetura validada;
- banco atualizado;
- backend implementado;
- frontend concluído;
- integração validada;
- build verde;
- testes funcionais aprovados;
- documentação atualizada;
- código enviado ao repositório.

---

# Referências

- ENGINEERING_GUIDE.md
- development-workflow.md
- frontend-standards.md
- backend-standards.md
- database-standards.md
- 01-implement-crud.md
