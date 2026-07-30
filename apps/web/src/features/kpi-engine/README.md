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
- `repositories`: portas, referências in-memory e adapters Supabase.
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

PRs futuras poderão adicionar séries temporais agregadas, integrações reais com
Planning e Recruitment, benchmarks externos e forecast mais avançado. A factory
padrão atual registra apenas `system.health`, `system.latency`,
`example.percentage` e `example.count`; são definições demonstrativas, não KPIs
oficiais do Evol OS.

## Persistência e histórico

A persistência real usa quatro tabelas company-scoped:

- `kpi_definitions`: identidade estável da definição;
- `kpi_definition_versions`: metadados versionados e vigência temporal;
- `kpi_evaluations`: contexto, resultado numérico e dados de consulta;
- `kpi_evaluation_snapshots`: snapshot serializável e imutável da definição.

`createSupabaseKPIDefinitionRepository` recebe `companyId` e um resolver de
calculator. Calculators não são serializados: o banco preserva os metadados e o
resolver reidrata a função registrada em runtime. Isso mantém o Port original da
PR-102 e o isolamento por empresa.

`createSupabaseKPIEvaluationRepository` persiste avaliação e snapshot numa única
RPC `security invoker`, portanto uma falha nunca deixa metade do histórico gravado.
As consultas por empresa, definição e escopo continuam disponíveis pelo Port.
O adapter também oferece consultas por período e últimas avaliações, consumidas
por `KPIHistoryQueryService` como `KPIHistoryEntryDTO`.

Snapshots não podem ser atualizados ou excluídos. Avaliações antigas continuam
reproduzíveis mesmo que uma nova versão da definição seja registrada. Todas as
tabelas possuem RLS por `company_id`; membros ativos leem e `owner/admin/hr`
gerenciam definições e criam avaliações.

## Execution Platform

`execution/` é a entrada oficial para disparos automáticos. A plataforma recebe
requests idempotentes, valida-os, resolve um executor por `providerKey`, delega a
avaliação ao `KPIEvaluationApplicationService` e registra telemetria desacoplada.

`SingleExecutionExecutor` processa um KPI; `BatchExecutionExecutor` processa
múltiplos KPIs, com opção de interrupção após falha. A policy em memória controla
duplicidade, reexecução e interrupção sem conhecer banco. Telemetria registra
duração usando `Clock`, quantidade, sucessos, falhas e avaliações persistidas. A
factory aceita executores, policy e telemetria injetáveis e não configura cron,
fila ou provedor externo.

## Durable Execution

`KPIExecution` persiste o ciclo `pending → running → succeeded | partially_succeeded
| failed | interrupted`. Apenas falhas podem voltar a `running` para retry; toda
transição é validada pelo domínio. Cada aquisição cria um
`KPIExecutionAttempt` sequencial e imutavelmente identificado.

A migration `0058_create_durable_kpi_execution.sql` cria `kpi_executions` e
`kpi_execution_attempts`, isoladas por empresa via RLS. A reserva usa unicidade de
empresa, provider e chave de idempotência. RPCs `security invoker` adquirem a
execução e tentativa e finalizam ambas atomicamente; execução por `PUBLIC` é
revogada.

`DurableKPIExecutionPolicy` substitui a policy em memória somente quando injetada.
Ela persiste snapshots JSON seguros de request, resultado e erro, propaga
`correlationId` e impede uma segunda avaliação para requests idempotentes.
Repositories Supabase e em memória implementam histórico paginado por empresa,
provider, status, período e correlation ID, além das tentativas.

Retry é apenas decisão: `DefaultKPIRetryPolicy` classifica erros, respeita
`maxAttempts` e calcula backoff exponencial limitado, sem timer ou worker. A
factory server-only compõe client, repositories, durable policy, executores,
telemetria, `Clock` e `IdGenerator`. Esta PR não agenda nem transporta execuções;
cron, filas, recovery worker e observabilidade externa permanecem fora do escopo.
