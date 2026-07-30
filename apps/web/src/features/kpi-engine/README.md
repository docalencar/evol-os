# KPI Engine

## Finalidade

O KPI Engine é a infraestrutura central, determinística e independente de UI e
persistência para definir, versionar, calcular, avaliar e apresentar indicadores.
Ele não contém KPIs reais dos módulos do produto.

## Camadas

- `contracts` e `types`: contratos numéricos, serializáveis e portas de Clock/ID.
- `registry`: catálogo em memória, versionamento e resolução por vigência.
- `calculators`, `sla`, `trends`, `benchmarks`, `alerts`, `forecast`: engines puras.
- `application/kpi-engine.ts`: composição das engines da PR-101.
- `evaluations`: valida contexto, resolve a definição e constrói a avaliação.
- `repositories`: portas de persistência e referências in-memory.
- `application/kpi-evaluation-application-service.ts`: persiste e consulta avaliações.
- `presenters` e `view-models`: formatação para consumidores de apresentação.

## Contratos principais

- `KPIDefinition`: metadados e calculator tipado de uma definição.
- `KPIDefinitionVersion`: definição associada a versão e intervalo de vigência
  `[effectiveFrom, effectiveUntil)`.
- `KPIRegistry`: registra e resolve versões; nunca calcula ou persiste avaliações.
- `KPIEngine`: executa Calculator, SLA, Trend, Benchmark, Alert e Forecast.
- `KPIEvaluationService`: valida contexto, resolve a versão, executa o Engine e cria
  snapshot histórico sem funções.
- `KPIEvaluationApplicationService`: persiste avaliações completas e devolve DTOs.
- `KPIEvaluationRepository`: porta isolada de banco para persistência e consultas.

## Fluxo

```text
Módulo consumidor
  → KPIRegistry
  → KPIEvaluationApplicationService
  → KPIEvaluationService
  → KPIEngine
  → KPIEvaluation
  → KPIEvaluationRepository
```

## Registrar uma definição

Crie uma `KPIDefinition<SeuInput>`, associe-a a uma
`KPIDefinitionVersion` e chame `registry.register`. IDs, keys, versões e períodos
precisam ser consistentes e não podem se sobrepor para a mesma key.

## Criar um calculator

O calculator é a função `calculate(input)` da definição. Consumidores diretos
mantêm o tipo genérico. Como o Registry é heterogêneo, o pipeline armazenado usa
`unknown`; calculators registrados devem validar esse input antes do cálculo.
Não crie uma união central com contratos de todos os módulos.

## Avaliar e consultar

Monte um `KPIEvaluationContextInput` com empresa, escopo, período e `evaluatedAt`.
Passe contexto e source a `KPIEvaluationApplicationService.evaluate`. A avaliação
só é salva após sucesso completo. Consultas sempre exigem `companyId` e podem ser
feitas por empresa, definição ou escopo.

## Integrar um módulo

O módulo é dono das definições e dos dados de entrada. Ele registra suas versões,
carrega os dados em seus próprios repositories e entrega somente o input validado
ao pipeline. O KPI Engine não importa código de Planning, Recruitment ou outro
vertical slice.

## O que não pertence aqui

Consultas Supabase, autorização, componentes React, dashboards, formatação dentro
do domínio, dados reais, decisões específicas de um módulo e números apresentados
como se fossem produção.

## Evolução futura

PRs futuras poderão adicionar repositories Supabase, histórico e séries temporais,
integrações reais com Planning e Recruitment, benchmarks externos e forecast mais
avançado. A factory padrão atual registra apenas `system.health`, `system.latency`,
`example.percentage` e `example.count`; são definições demonstrativas, não KPIs
oficiais do Evol OS.
