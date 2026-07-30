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

## Leases, coordenação e recovery

A migration `0059_add_kpi_execution_recovery_leases.sql` adiciona owner, ID,
expiração e renovação de lease às execuções. RPCs `security invoker` fazem
aquisição exclusiva, renovação, liberação e recuperação de forma transacional,
mantendo RLS e revogando acesso de `PUBLIC`.

`ExecutionCoordinator` administra o ciclo do lease e permite que workers futuros
disputem execuções sem processamento paralelo. Leases expiradas podem ser roubadas
somente depois da expiração. `RecoveryCoordinator` consulta execuções `running`
abandonadas, aplica a retry policy, resolve novamente o request pelo contrato do
módulo proprietário e delega ao `ExecutionDispatcher`, que reutiliza a plataforma
e os executores existentes.

Telemetria inclui aquisição, renovação, liberação, expiração, recovery e dispatch.
`KPIExecutionOperationalHistoryService` separa esses eventos para consulta. A
implementação não executa polling: não há scheduler, cron, worker, heartbeat
automático ou fila externa. O chamador futuro é responsável por acionar recovery
e renovação nos momentos apropriados.

## Worker Runtime

`execution/runtime/` mantém o ciclo operacional como operações explícitas:
`start()`, `runCycle()`, `stop()`, `fail()`, `getState()` e `getHealth()`. Ele não
cria loop infinito, não agenda a si mesmo e não espera delays. Um trigger externo
decide quando chamar o próximo ciclo usando a decisão retornada pelo polling.

Cada ciclo valida estado e cancelamento, descobre trabalho paginado, prioriza
recovery sobre retries e pendências, processa recovery, despacha os demais itens,
renova leases próximas da expiração, agrega métricas, emite telemetria e calcula a
próxima decisão. Cancelamento é cooperativo e nunca interrompe uma operação
atômica no meio; graceful shutdown impede novos itens e libera leases conhecidos.

`AdaptiveKPIWorkerPollingStrategy` retorna execução imediata, espera, backoff ou
stop sem usar timers. Health considera lifecycle, falhas, cancelamento e leases.
Métricas e telemetria possuem implementações no-op e em memória. A factory
server-only compõe repositories Supabase, discovery, coordination, recovery,
dispatcher, heartbeat e runtime, mantendo o cast do client confinado à fronteira
de infraestrutura até a regeneração dos tipos Supabase.

A migration `0060_allow_worker_lease_reservation.sql` permite reservar via lease
trabalho `pending`, `failed` e `running` antes do dispatch, ainda com
`SECURITY INVOKER`, RLS e execução revogada de `PUBLIC`. Scheduler, cron, filas,
daemon, endpoint HTTP e liderança distribuída permanecem para evoluções futuras.

## Scheduler e Trigger Adapters

`execution/scheduler/` decide exclusivamente quando e por que solicitar um ciclo.
Fontes manuais, agendadas, retry, recovery, provider, company, scenario e eventos
futuros produzem `KPITriggerRequest`; elas nunca conhecem nem executam o runtime.
O registry tipado registra, habilita, desabilita e resolve triggers por ID, tipo,
empresa e provider, rejeitando identificadores duplicados.

`DefaultKPITriggerScheduler` resolve o trigger, avalia `DefaultSchedulePolicy` e
delega somente decisões `execute`, `ignore`, `retry_later` ou `cancel` ao
`KPIRuntimeInvoker`. O adapter `WorkerKPIRuntimeInvoker` é a única peça desta
camada que conhece o contrato do Worker Runtime, iniciando-o quando necessário e
executando no máximo um ciclo por chamada.

As políticas cobrem concorrência máxima, janela mínima, isolamento por empresa e
provider, supressão de retry, precedência de recovery, backpressure, rate limit e
deduplicação. Backpressure considera estado, fila, leases e falhas e retorna
continue, delay ou reject. Rate limit e deduplicação mantêm estado encapsulado por
instância, usam `Clock` e não criam timer ou cache global. A prioridade padrão é
recovery, retry, manual, scheduled, scenario, provider, future event e company,
com override por trigger.

Métricas e telemetria oferecem implementações no-op e em memória. A composição
server-only conecta Scheduler, Registry, Policies, Runtime Invoker e Worker
Runtime sem criar cron, processo background, loop, endpoint HTTP ou mecanismo de
transporte. Um adapter operacional externo ainda é responsável por receber o
evento real e chamar `schedule()` com contexto observado; persistência do estado
de rate limit/deduplicação e coordenação entre instâncias ficam para evoluções
futuras.

## Operational Adapters

`execution/operational/` é a fronteira entre eventos externos e a plataforma de
execução. Adapters manual, cron, queue, webhook e API apenas normalizam payloads
para `KPITriggerRequest`; não conhecem KPIs, providers concretos ou o Worker
Runtime. O adapter manual funcional encaminha ao `OperationalGateway`.

O Gateway é a única entrada operacional e oferece `schedule`, `scheduleMany`,
`cancel`, `health` e `metrics`. Agendamentos são delegados exclusivamente ao
Scheduler. `OperationalCoordinator` limita concorrência, isola empresa/provider e
mantém cancelamentos através de portas de store, com implementações in-memory e
Supabase, sem eleição de líder ou cluster.

Deduplicação e rate limit persistentes usam `Clock` e janelas por empresa/provider.
A migration `0061_create_kpi_operational_stores.sql` cria somente suas duas
tabelas, com RLS e RPCs `SECURITY INVOKER`. Claims de coordenação reutilizam o
store operacional, sem tabela de runtime, fila ou scheduler.

Métricas podem ser exportadas como snapshot, JSON ou texto determinístico. A
factory server-only compõe Gateway, Scheduler, Worker Runtime, Coordinator e
stores Supabase. A arquitetura final é:

```text
External Event → Operational Adapter → Operational Gateway
  → Scheduler → Runtime Invoker → Worker Runtime
  → Execution Platform → KPI Engine → Persistence
```

Não existem endpoint HTTP, cron real, consumidor de fila, processo background,
timer, loop ou integração de observabilidade externa. Adapters de transporte
reais, limpeza de janelas e coordenação multi-instância avançada são próximos
passos.
