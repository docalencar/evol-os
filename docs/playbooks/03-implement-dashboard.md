# Playbook — Implementação de Dashboards

## Objetivo

Este playbook define o padrão oficial para construção de dashboards no Evol OS.

Todo dashboard deve transformar dados em informação útil para tomada de decisão.

O objetivo nunca é apenas mostrar números.

---

# Filosofia

Todo dashboard deve responder perguntas do negócio.

Exemplos:

- Como está a empresa?
- Onde estão os problemas?
- Quais prioridades existem?
- O que mudou desde o último período?

Cada card deve possuir propósito claro.

---

# Estrutura recomendada

```
Dashboard

↓

KPIs

↓

Cards Analíticos

↓

Tabelas

↓

Ações
```

Evitar telas compostas apenas por tabelas.

---

# KPIs

Os primeiros elementos da tela devem apresentar indicadores principais.

Exemplos:

- Total
- Ativos
- Pendências
- Crescimento
- Evolução
- Risco

Os KPIs devem ser rápidos de interpretar.

---

# Cards

Cada card deve responder uma pergunta.

Exemplos:

- Evolução mensal
- Distribuição por status
- Competências críticas
- Colaboradores sem PDI
- Avaliações pendentes

Evitar cards decorativos.

---

# Queries

Toda agregação deve ser realizada fora dos componentes React.

Fluxo recomendado:

```
Page
↓

Query

↓

Service

↓

Repository
```

Os componentes devem receber dados prontos para renderização.

---

# Performance

Sempre que possível:

- reutilizar consultas;
- evitar múltiplas consultas idênticas;
- agregar dados no backend;
- reduzir processamento na interface.

---

# Estados obrigatórios

Todo dashboard deve considerar:

- loading;
- empty state;
- erro;
- sucesso.

---

# Layout

Ordem sugerida:

1. Cabeçalho
2. KPIs
3. Cards analíticos
4. Tabelas
5. Ações

---

# Visual

Utilizar componentes compartilhados sempre que possível.

Exemplos:

- StatCard
- InfoCard
- DashboardSection
- EmptyState
- DataTable

Manter espaçamentos e alinhamentos consistentes.

---

# Métricas

Cada indicador deve possuir:

- definição clara;
- fonte dos dados;
- regra de cálculo documentada.

Evitar métricas implícitas.

---

# Critérios de conclusão

Um dashboard está concluído quando:

- responde às principais perguntas do domínio;
- possui KPIs relevantes;
- apresenta estados vazios;
- mantém boa performance;
- build está verde;
- testes funcionais foram realizados.

---

# Referências

- ENGINEERING_GUIDE.md
- development-workflow.md
- frontend-standards.md
- backend-standards.md
- 02-implement-module.md