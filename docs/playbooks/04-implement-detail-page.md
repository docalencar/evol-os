# Playbook — Implementação de Páginas de Detalhes

## Objetivo

Este playbook define o padrão oficial para páginas de detalhes do Evol OS.

Uma página de detalhes representa a visão completa de uma entidade do domínio.

Exemplos:

- Pessoa
- Cargo
- Time
- Departamento
- Competência
- Plano de Desenvolvimento
- Avaliação

O objetivo é apresentar informações de forma organizada, contextualizada e orientada à tomada de decisão.

---

# Estrutura recomendada

Toda página deve seguir a seguinte organização:

```
PageHeader

↓

Overview

↓

Informações da entidade

↓

Relacionamentos

↓

Histórico

↓

Ações
```

---

# Cabeçalho

Sempre utilizar `PageHeader`.

Deve conter:

- título;
- descrição;
- ações principais (Editar, Arquivar etc.).

Evitar lógica de negócio no cabeçalho.

---

# Overview

Logo abaixo do cabeçalho apresentar um resumo executivo.

Utilizar:

- DashboardSection
- StatCard
- InfoCard

Responder rapidamente às perguntas mais importantes sobre a entidade.

---

# Informações principais

Agrupar informações por contexto.

Exemplos:

## Cargo

- Departamento
- Nível hierárquico
- Jornada
- Modalidade
- Regime

## Pessoa

- Cargo
- Gestor
- Time
- Status

Evitar listas longas sem organização.

---

# Relacionamentos

Apresentar entidades relacionadas utilizando componentes reutilizáveis.

Exemplos:

- colaboradores do cargo;
- competências do cargo;
- PDIs da pessoa;
- avaliações realizadas.

---

# Histórico

Quando existir histórico relevante:

- alterações;
- eventos;
- evolução;
- timeline.

Utilizar componentes específicos de timeline quando apropriado.

---

# Ações

As ações devem permanecer visíveis e consistentes.

Exemplos:

- Editar
- Arquivar
- Adicionar relacionamento
- Criar PDI
- Nova avaliação

---

# Queries

Toda preparação de dados deve ocorrer antes da renderização.

Fluxo:

```
Page
↓

Query
↓

Service
↓

Repository
```

Componentes recebem dados prontos.

---

# Estados obrigatórios

Toda página deve tratar:

- loading;
- erro;
- entidade inexistente;
- estado vazio (quando aplicável).

---

# Performance

Priorizar:

- consultas agregadas;
- paralelismo (`Promise.all`);
- reutilização de queries;
- evitar chamadas duplicadas.

---

# Critérios de conclusão

Uma página de detalhes está concluída quando:

- apresenta informações organizadas;
- possui overview consistente;
- exibe relacionamentos relevantes;
- mantém boa performance;
- build está verde;
- testes funcionais aprovados.

---

# Referências

- ENGINEERING_GUIDE.md
- development-workflow.md
- frontend-standards.md
- backend-standards.md
- 03-implement-dashboard.md