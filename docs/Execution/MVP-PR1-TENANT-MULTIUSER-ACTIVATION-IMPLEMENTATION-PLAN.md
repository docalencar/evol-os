# MVP-PR1 — Tenant Multiuser Activation — Implementation Plan

**Status:** Approved

## 1. Autoridade e objetivo

Este plano materializa a
[PD-019 — Tenant Multiuser Activation Policy](../Product/PRODUCT_DECISIONS.md) e a
[ADR-0015 — Tenant Multiuser Activation Architecture](../adr/0015-tenant-multiuser-activation-architecture.md).
A [ADR-0012](../adr/0012-tenant-owned-referential-integrity-strategy.md) governa
integridade tenant-owned e a
[ADR-0013](../adr/0013-platform-global-authority-and-trusted-execution.md) governa
a separação entre ator humano e executor técnico.

O objetivo é entregar incrementalmente:

> convite → aceite → membership → vínculo com People → role → tenant ativo →
> isolamento → auditoria

sem interromper o onboarding atual, sem escolher tenant arbitrariamente e sem
conceder acesso antes do aceite. Este plano não autoriza implementação. Cada fase
exige aprovação explícita; concluir uma fase não autoriza automaticamente a
seguinte.

## 2. Baseline e compatibilidade obrigatória

O rollout parte destes fatos incorporados:

- `auth.users.id` é a identidade humana canônica;
- People pode existir com `user_id` nulo;
- `company_members` é única por `(company_id, user_id)` e contém o catálogo de
  roles vigente;
- somente membership `active` participa da autorização RLS atual;
- onboarding cria empresa, owner membership e People em uma operação;
- onboarding rejeita hoje usuário com outra membership ativa;
- o contexto corrente usa a primeira membership ativa encontrada, sem seletor;
- não existe convite funcional nem uso de Auth Admin para este domínio;
- o estado histórico `invited` de `company_members` não possui fluxo comprovado;
- clients server-only e Trusted Persistence já são precedentes arquiteturais.

Até o cutover, o caminho atual de usuário com uma única empresa deve continuar
funcionando. Estruturas novas permanecem aditivas e sem consumidor oficial. O
onboarding legado não é alterado antes de o resolver multi-tenant estar pronto.
Nenhum dado ambíguo é reparado silenciosamente.

## 3. Estratégia de rollout

Ordem permanente:

```text
ADD → BACKFILL → VERIFY → ENFORCE → CUTOVER → CLEANUP
```

- **ADD:** criar superfícies e armazenamento aditivos, inicialmente sem substituir
  comportamento existente;
- **BACKFILL:** preencher apenas relações comprováveis deterministicamente;
- **VERIFY:** executar preflights, relatórios de divergência e testes adversariais;
- **ENFORCE:** validar constraints e fechar caminhos genéricos de escrita;
- **CUTOVER:** migrar consumidores por capacidade, com rollback observável;
- **CLEANUP:** remover legado somente por decisão posterior baseada em evidência.

Não haverá migration big-bang. Migrations aplicadas são forward-only; rollback
estrutural usa migration compensatória. Histórico, convites aceitos e auditorias
nunca são apagados para simular rollback.

## 4. Fases e dependências

| Fase | Entrega | Depende de | Migration esperada |
| --- | --- | --- | --- |
| 0 | Baseline & invariant mapping | plano aprovado | não |
| 1 | Additive persistence model | 0 aprovada | sim, aditiva |
| 2 | Constraints & persistent invariants | 1 validada | sim, backfill/verify/enforce |
| 3 | Trusted Persistence | 2 validada | provável, funções/grants estreitos |
| 4 | Application Layer | 3 aprovada | não |
| 5 | Issuance/revocation/resend | 4 aprovada | somente se lacuna persistente comprovada |
| 6 | Acceptance & Auth integration | 5 aprovada | provável, fronteira atômica de aceite |
| 7 | Tenant resolution/selection | 6 aprovada | somente se preferência exigir persistência adicional |
| 8 | RLS & authorization cutover | 7 validada | sim, policies/grants/cutover |
| 9 | Multiuser UI/UX | 8 aprovada | não |
| 10 | Audit & observability | 9 validada | somente hardening aditivo comprovado |
| 11 | Compatibility cutover | 10 aprovada | possível migration de compatibilidade |
| 12 | Final validation & cleanup decision | 11 estabilizada | não; cleanup é decisão separada |

A fundação de auditoria é introduzida na Phase 1 e cada fase persiste seus eventos
desde a origem. A Phase 10 não posterga auditoria: ela completa consultas
operacionais, correlação, métricas e alertas. Novas estruturas recebem RLS
fail-closed desde a Phase 1; a Phase 8 é o cutover das autoridades e consumers.

## 5. Invariantes transversais

I1. `auth.users.id` é a identidade autenticável canônica.

I2. E-mail serve apenas ao bootstrap/convite e não autoriza após o vínculo.

I3. Nenhuma associação cruza tenants.

I4. Há no máximo uma membership por empresa/usuário.

I5. Há no máximo uma People por usuário em cada tenant e um usuário por People.

I6. Membership ativa exige vínculo People coerente no mesmo tenant.

I7. Convite concede acesso somente após aceite válido e único.

I8. Convite expirado, revogado ou de geração antiga falha fechado.

I9. Role pertence à membership; não deriva de People, Auth metadata ou hierarquia.

I10. Somente owner administra owner e sempre resta ao menos um owner ativo.

I11. Tenant ativo é escolha/contexto, nunca autoridade.

I12. Múltiplas memberships nunca usam “primeira linha” como fallback.

I13. `service_role` é executor técnico, nunca ator humano.

I14. `company_members` não concede autoridade global.

I15. Mutação multi-step e auditoria correspondente são atômicas.

I16. Desativação de membership revoga imediatamente a autorização tenant.

I17. Histórico e auditoria são preservados.

## 6. Matriz de invariantes por fase

| Fase | Invariantes introduzidas ou endurecidas | Invariantes obrigatoriamente preservadas |
| --- | --- | --- |
| 0 | mapa executável de I1–I17 | todas, sem mutação |
| 1 | identidades duráveis de convite/auditoria | I1–I4, I9, I13–I14, I17 |
| 2 | I3–I8 e I10 fisicamente protegidas | todas as anteriores |
| 3 | I10, I13 e I15 na escrita confiável | I1–I17 |
| 4 | orquestração sem duplicar regras | I1–I17 |
| 5 | I2, I7–I8 para emissão/rotação | I1–I17 |
| 6 | I3–I8 e I15 no aceite | I1–I17 |
| 7 | I11–I12 e invalidação da escolha | I1–I17 |
| 8 | I3, I9–I10, I14 e I16 em RLS/grants | I1–I17 |
| 9 | nenhuma regra nova; experiência reflete gates | I1–I17 |
| 10 | I13, I15 e I17 observáveis | I1–I17 |
| 11 | comportamento novo oficial sem quebrar caminho único | I1–I17 |
| 12 | evidência final e decisão de cleanup | I1–I17 |

## 7. Phase 0 — Baseline & invariant mapping

### Objetivo e estado inicial

Inventariar dados, contratos, policies, consumers e invariantes antes de qualquer
mudança. Parte do schema e fluxo single-user descritos no baseline.

### Permitido e proibido

- permitido: queries read-only, inventário de catálogo PostgreSQL, consumers,
  Auth/configuração, dados agregados e testes de caracterização;
- proibido: correção, backfill, migration, RLS, Auth, UI ou mudança funcional.

### Trabalho e migrations

Não há migration. Produzir mapa de `company_members`, People vinculada, owners,
roles, statuses, duplicidades, memberships múltiplas, e-mails normalizados e
possível uso do estado `invited`.

### Compatibilidade, testes e security gates

Caracterizar onboarding, login de tenant único, RLS vigente e contratos públicos.
O preflight deve detectar: People duplicada por usuário/tenant; uma People ligada
a múltiplas identidades; membership sem People; People vinculada sem membership;
empresa sem owner ou com owners inconsistentes; relações cross-tenant; e-mail
duplicado/ausente; memberships múltiplas; linhas `invited` legadas.

### Aceite, rollback, dependências e evidência

Aceite exige relatório reproduzível, classificação de cada anomalia e zero
mutação. Qualquer estado não determinístico bloqueia backfill e exige plano de
reparação aprovado. Rollback não se aplica. Evidência: comandos, contagens
anonimizadas, contratos consumidores e matriz I1–I17 assinada pelo Product
Architect.

## 8. Phase 1 — Additive persistence model

### Objetivo e estado inicial

Adicionar o modelo durável de convite, suas gerações/tentativas, auditoria e,
quando confirmado pelo desenho físico, preferência de tenant. Phase 0 deve estar
aprovada e sem ambiguidade não tratada.

### Permitido e proibido

- permitido: estruturas aditivas, candidate keys, índices de suporte, grants
  mínimos, RLS deny-by-default e tipos internos não conectados;
- proibido: alterar login/onboarding, ativar convite, relaxar policy existente,
  backfill inferido ou remover colunas/contratos.

### Migration e invariantes

Uma migration aditiva deve classificar cada entidade conforme ADR-0012. Convite
preserva tenant, People, e-mail bootstrap, role pretendida, ator, estado,
expiração, geração, correlação e idempotência. Somente digest não reversível do
segredo pode ser persistido. Auditoria nasce append-only. Segredo utilizável não
entra no banco, logs ou eventos.

### Compatibilidade, testes e security gates

O caminho antigo ignora as novas estruturas. Testes de catálogo, defaults,
grants, RLS deny-by-default, ausência de exposição de digest e regressão do
onboarding são obrigatórios. Security gate: nenhum acesso de `anon`; nenhum
insert/update genérico de `authenticated`; nenhuma referência cross-tenant.

### Aceite, rollback, dependências e evidência

Aceite: migration limpa, reversibilidade operacional por não uso e catálogo
inspecionado. Antes do cutover, rollback é deixar estruturas dormentes; após
merge, compensação não apaga dados. Evidência: pgTAP, db lint, diff de grants e
aprovação do Product Architect.

## 9. Phase 2 — Constraints & persistent invariants

### Objetivo e estado inicial

Endurecer vínculos People–usuário–tenant, convite único, membership e último
owner sem conectar consumers novos.

### Permitido e proibido

- permitido: preflight, backfill determinístico aprovado, candidate keys,
  constraints `NOT VALID`, validação, índices e proteção persistente;
- proibido: inferir vínculo por nome/e-mail, escolher owner, apagar duplicidade,
  ativar convite ou quebrar onboarding.

### Backfill e migrations

Pontos esperados de backfill, nunca executados sem Phase 0 aprovada:

- materializar relações tenant-aware para People já vinculada;
- comprovar que memberships atuais possuem People correspondente;
- classificar ou bloquear `company_members.status = invited` legado;
- preparar owner existente para a proteção de último owner;
- inicializar preferência somente quando houver exatamente uma membership ativa;
- normalizar e-mail apenas como dado de convite, nunca como identidade.

Aplicar `ADD → BACKFILL → VERIFY → ENFORCE`. Relações comprováveis podem ser
preenchidas por IDs existentes. Qualquer ambiguidade aborta. Proteção do último
owner precisa cobrir escrita direta e concorrente, inclusive executor técnico.

### Compatibilidade, testes e security gates

Onboarding existente deve satisfazer as novas invariantes sem mudar contrato.
pgTAP cobre duplicidades, vínculo cruzado, membership sem People, corrida entre
owners, estados inválidos e service role submetido à integridade.

### Aceite, rollback, dependências e evidência

Aceite somente após constraints validadas e zero anomalia. Constraints antigas
só são substituídas depois. Rollback pós-merge é compensatório e preserva dados.
Evidência: resultados antes/depois do preflight, catálogo de constraints e testes
adversariais.

## 10. Phase 3 — Trusted Persistence

### Objetivo e estado inicial

Criar fronteiras transacionais estreitas para convite, membership, vínculo,
ownership e auditoria, sobre invariantes já validadas.

### Permitido e proibido

- permitido: contratos internos versionados, funções transacionais, grants
  mínimos, adapters server-only e fakes de teste;
- proibido: UI, Auth Admin real, cutover, escrita genérica de memberships ou
  service role como autoridade.

### Migration e invariantes

Migration é provável para as operações atômicas e grants. Cada operação deriva ou
revalida ator/tenant, serializa registros relevantes, persiste auditoria no mesmo
commit e retorna códigos estáveis. Ownership serializa por empresa. A fronteira de
aceite ainda não é exposta externamente nesta fase.

### Compatibilidade, testes e security gates

O fluxo existente permanece oficial. Testes cobrem sucesso, rollback, retry,
fingerprint/idempotência divergente, corridas, ator falso, tenant injetado,
escalonamento de role, último owner e audit failure. Security gate: funções com
`search_path` fixo, grants explícitos, nenhum segredo e executor separado.

### Aceite, rollback, dependências e evidência

Aceite: zero estado parcial sob falha/concorrência. Rollback: não conectar adapters
e, após integração, usar compensação forward-only. Evidência: pgTAP transacional,
teste de concorrência e inspeção de grants.

## 11. Phase 4 — Application Layer

**Status:** COMPLETE BY PRIOR DELIVERY

> A Phase 4 não foi executada como fase autônoma. Sua fundação estrutural foi
> antecipada de maneira controlada durante a Phase 3 porque a Trusted Persistence
> precisava de contracts, port, Application Service, adapter e Composition Root
> para validação ponta a ponta. A inspeção posterior confirmou que não existe
> dívida arquitetural que justifique uma segunda Application Layer.

| Item originalmente previsto | Classificação vigente |
| --- | --- |
| intents das sete operações | ALREADY IMPLEMENTED |
| results discriminados e stable error mapping | ALREADY IMPLEMENTED |
| port de Trusted Persistence | ALREADY IMPLEMENTED |
| `TenantAccessApplicationService` | ALREADY IMPLEMENTED |
| adapter Supabase autenticado | ALREADY IMPLEMENTED |
| Composition Root server-only | ALREADY IMPLEMENTED |
| idempotency key e correlation ID preservados | ALREADY IMPLEMENTED |
| testes do service e adapter | ALREADY IMPLEMENTED |
| token lifecycle, delivery e issue/resend/revoke Actions | DEFERRED TO PHASE 5 |
| acceptance route, accept Action e Auth integration | DEFERRED TO PHASE 6 |
| resolver, preferência, seleção e switch de tenant | DEFERRED TO PHASE 7 |
| RLS cutover, UI, E2E e observabilidade | DEFERRED TO THEIR ORIGINAL PHASES |

Este fechamento não implementa consumer funcional, não antecipa fase posterior e
não autoriza a Phase 5.

### Objetivo e estado inicial

Criar services, ports e repositories que orquestrem Trusted Persistence sem
reimplementar autorização ou integridade.

### Permitido e proibido

- permitido: intents/resultados aditivos, ports de Auth, convite, membership,
  auditoria e tenant; Composition Root ainda não consumido;
- proibido: chamada direta a tabelas protegidas pelo service, UI, Server Actions,
  regra em repository ou alteração de contrato legado.

### Migrations, compatibilidade e testes

Sem migration. O caminho atual permanece intacto. Fakes provam emissão,
revogação, reenvio, aceite, mudança de role, ownership e tenant selection; erros
da persistência são propagados sem segunda escrita.

### Security gates, aceite, rollback e evidência

Ator e tenant nunca vêm confiáveis do input. Imports server-only não alcançam
Client Components. Aceite: dependências compostas corretamente e nenhuma regra
duplicada. Rollback: remover consumer futuro, mantendo ports inertes. Evidência:
testes unitários, TypeScript, boundaries e revisão arquitetural.

## 12. Phase 5 — Invitation issuance, revocation & resend

### Objetivo e estado inicial

Habilitar operações administrativas de criação, revogação e reenvio sem aceitar
convite ainda.

### Permitido e proibido

- permitido: adapter Auth server-only, geração/rotação de segredo, entrega,
  operações administrativas finas e auditoria;
- proibido: membership antes do aceite, UI final, enumeração de conta, segredo
  persistido reversivelmente ou role fora da PD-019.

### Migration e compatibilidade

Não se espera migration salvo lacuna comprovada. Convite é persistido antes da
entrega externa. Falha externa mantém intenção recuperável. Reenvio gira geração,
invalida segredo anterior e renova sete dias. Fluxo single-user não muda.

### Testes e security gates

Cobrir usuário existente/inexistente com resposta indistinguível, duplicidade,
expiração, revogação, rotation, replay de token anterior, falha do provider,
retry, rate limiting e concorrência. Security gates: entropia revisada, digest
seguro, nenhum token em log, redirect allowlist e Auth Admin exclusivamente
server-only.

### Aceite, rollback, dependências e evidência

Aceite: nenhum convite emitido ativa membership. Kill switch pode interromper
novas entregas sem apagar convites. Evidência: testes, inspeção de logs e revisão
de configuração segura pelo Product Architect/Human Reviewer.

## 13. Phase 6 — Invitation acceptance & Auth integration

### Objetivo e estado inicial

Conectar aceite autenticado à transação canônica.

### Permitido e proibido

- permitido: callback/entrypoint server-side mínimo, validação de sessão e e-mail
  verificado, Trusted Persistence atômica e contratos aditivos;
- proibido: confiar no token isoladamente, aceitar geração antiga, criar People,
  selecionar tenant pelo payload ou produzir membership parcial.

### Migration e atomicidade

É provável migration para expor/restringir a operação atômica de aceite. Na mesma
transação: convite atual, identidade Auth, People, membership, role, `accepted` e
auditorias. Conta Auth criada fora da transação pode permanecer sem tenant; isso é
estado permitido, não acesso parcial.

### Compatibilidade, testes e security gates

Onboarding continua funcionando. Testes cobrem conta nova/existente, aceite
único, duas sessões, replay, token roubado por outra conta, e-mail divergente,
revogação/expiração concorrente, vínculo/membership pré-existente e rollback.
Security gate: segredo comparado em tempo seguro, sessão revalidada server-side,
nenhum IDOR e nenhum dado cross-tenant em erro.

### Aceite, rollback, dependências e evidência

Aceite: no máximo um resultado canônico e zero estado parcial. Rollback desabilita
o entrypoint, preserva convites e memberships já aceitas. Evidência: pgTAP,
integração Auth em ambiente aprovado e provas de concorrência.

## 14. Phase 7 — Tenant resolution & selection

### Objetivo e estado inicial

Substituir o resolver `limit(1)` por resultado determinístico e introduzir escolha
ativa segura.

### Permitido e proibido

- permitido: resolver puro/aplicacional, preferência protegida, switch de contexto
  server-side e contracts aditivos;
- proibido: fallback para primeira linha, role/tenant em Auth metadata, preferência
  como autorização ou UI completa.

### Migration e compatibilidade

Migration somente se o modelo aditivo da Phase 1 não cobrir preferência. Usuário
com uma membership mantém entrada automática e, portanto, compatibilidade atual.
Com várias, preferência válida resolve; sem preferência, retorna
`tenant_selection_required`. Com zero, retorna `membership_required`.

### Testes e security gates

Cobrir 0/1/N memberships, preferência válida/inválida, troca, desativação, role
inválida, cache stale e tentativa de selecionar tenant estrangeiro. Toda request
revalida membership ativa; cache é tenant-keyed e descartado na troca.

### Aceite, rollback, dependências e evidência

Aceite: nenhuma query escolhe tenant implicitamente. Feature flag mantém resolver
novo desligado até consumidores estarem prontos. Evidência: inventário de todos
os consumers do contexto atual e testes de paridade para tenant único.

## 15. Phase 8 — RLS & authorization cutover

### Objetivo e estado inicial

Alinhar policies, grants e operações públicas à PD-019 após fluxos confiáveis
estarem completos.

### Permitido e proibido

- permitido: policies por capacidade/role, revogação de escrita genérica,
  enforcement de membership ativa e fronteiras estreitas;
- proibido: relaxar isolamento, confiar só na Application Layer, conceder owner a
  admin ou tornar service role autor.

### Migration e coexistência

Migration de cutover é esperada. Novas policies coexistem primeiro em modo
restritivo/testável. Grants genéricos só são revogados após todos os consumers
usarem operações canônicas. Policies antigas só saem depois de equivalência e
negações comprovadas.

### Testes e security gates

Matriz completa por role/estado/operação; IDOR; tenant injection; People e convite
cross-tenant; user sem membership; membership stale; owner/admin/hr/manager/
employee; `anon`; service role submetido às constraints. Security gate exige
revisão independente do catálogo PostgreSQL e pgTAP completo.

### Aceite, rollback, dependências e evidência

Aceite: fail closed e nenhum acesso cross-tenant. Rollback usa policy
compensatória previamente ensaiada, nunca desabilita RLS. Evidência: diff de
policies/grants, pgTAP e autorização do Product Architect antes do cutover.

## 16. Phase 9 — Multiuser UI/UX

### Objetivo e estado inicial

Expor a experiência mínima aprovada depois que segurança e contratos estiverem
estáveis.

### Permitido e proibido

- permitido: convidar People existente, status, resend/revoke, aceite, seletor e
  switcher de tenant, mensagens seguras;
- proibido: regra de autorização no componente, exposição de IDs/secrets,
  enumeração, criação posterior de People ou bypass de confirmação.

### Migrations, compatibilidade e testes

Sem migration. Usuário single-tenant preserva navegação atual. Testes de
componentes e E2E cobrem owner/admin, roles permitidas, conta nova/existente,
expired/revoked, duplicidade, múltiplos tenants, ausência de membership,
acessibilidade e linguagem humana.

### Security gates, aceite, rollback e evidência

Mensagens externas não diferenciam existência global da conta. Nenhum Client
Component importa credencial/server-only. Rollback por feature flag/retorno ao
onboarding single-tenant, sem reverter dados aceitos. Evidência: UX review,
screenshots/fluxos, E2E e aprovação do Product Architect.

## 17. Phase 10 — Audit & observability

### Objetivo e estado inicial

Completar observabilidade dos eventos já persistidos desde as fases anteriores.

### Permitido e proibido

- permitido: consulta operacional segura, métricas, correlation, outcomes,
  alertas e redaction;
- proibido: token/e-mail sensível em log, alteração de histórico, acesso
  administrativo irrestrito ou auditoria assíncrona da mutação interna.

### Nove eventos e migrations

Validar cobertura de `invite.created`, `invite.resent`, `invite.revoked`,
`invite.accepted`, `membership.created`, `membership.role_changed`,
`person.linked`, `person.unlinked` e `membership.deactivated`. Cada evento
preserva actor, executor, tenant, target, correlation, timestamp e outcome.
Migration somente para lacuna aditiva comprovada; não reescrever eventos.

### Testes e security gates

Cobrir atomicidade, append-only, redaction, falha de writer, correlação entre Auth
e banco, acesso administrativo autorizado e inexistência de segredo. Alertar
replay, escalonamento, owner lockout, falhas repetidas, enumeração e cross-tenant.

### Aceite, rollback, dependências e evidência

Aceite: toda decisão humana possui evento correlacionável e nenhum secret é
observável. Rollback desativa readers/alerts, nunca auditoria persistente.
Evidência: amostras redigidas, testes, catálogo de métricas e revisão de segurança.

## 18. Phase 11 — Compatibility cutover

### Objetivo e estado inicial

Tornar o modelo multiusuário oficial preservando o caminho single-user.

### Permitido e proibido

- permitido: migrar consumers do contexto, remover `limit(1)`, permitir onboarding
  compatível com múltiplas memberships conforme PD-019 e ativar entrypoints;
- proibido: apagar estado `invited` sem classificação, remover contratos externos,
  desativar rollback cedo ou alterar regras de produto.

### Migration e estratégia backward-compatible

Possível migration apenas para compatibilidade final comprovada. Cutover por
consumer: leitura de memberships → resolver → seleção → contexto. Usuário com uma
empresa percebe o mesmo fluxo. Convites e múltiplos tenants ativam apenas quando
todos os gates passam. Estado legado permanece legível até decisão de cleanup.

### Testes e security gates

Suíte completa de onboarding, login, tenant único, convite, aceite, roles,
ownership, switch, revogação, RLS, auditoria e consumidores existentes. Smoke
test controlado e métricas sem dados sensíveis.

### Aceite, rollback, dependências e evidência

Aceite: nenhum consumer usa fallback arbitrário ou escrita legada insegura.
Rollback troca consumers para o caminho anterior somente para tenants únicos; não
desfaz memberships ou vínculos criados. Evidência: inventário zerado de consumers
antigos, smoke, métricas e aprovação explícita antes de publicar.

## 19. Phase 12 — Final validation & cleanup decision

### Objetivo e estado inicial

Auditar a entrega completa e decidir separadamente sobre legado; não executar
cleanup automaticamente.

### Permitido e proibido

- permitido: auditoria read-only, regressão completa, documentação, classificação
  de legado e proposta de follow-up;
- proibido: remoção de contrato, coluna, estado, policy, branch ou histórico sem
  aprovação própria.

### Migrations, testes e security gates

Nenhuma migration. Reexecutar preflight, catálogo, pgTAP, unitários, integração,
E2E, TypeScript, lint, build, db lint e `git diff --check`. Executar threat model
com evidências e revisar logs/redaction.

### Aceite, rollback, dependências e evidência

Aceite: I1–I17 provadas, zero consumer inseguro, rollout estável e documentação
reconciliada. Cleanup vira decisão explícita: manter, depreciar ou remover em PR
posterior. Rollback final segue runbook de consumers/policies compensatórias sem
perda histórica. Evidência consolidada é submetida ao Product Architect.

## 20. Threat model e security gates

| Ameaça | Defesa obrigatória | Gate de prova |
| --- | --- | --- |
| Invitation theft | segredo forte, conta/e-mail verificados, validade curta | token em conta diferente falha; nenhum dado tenant vaza |
| Invitation replay | digest, geração atual, aceite único e transação | replay sequencial e concorrente falha/idempotente |
| Token leakage | persistir só digest; redaction; server-only | busca em banco/logs/build não encontra token utilizável |
| Tenant injection | tenant derivado/revalidado; FK tenant-aware | payload com tenant estrangeiro é ignorado/rejeitado |
| IDOR | lookup escopado, RLS e erros indistinguíveis | IDs de outro tenant não revelam existência |
| Privilege escalation | matriz PD-019 e Trusted Persistence estreita | admin não cria/administra owner; roles inválidas falham |
| Owner lockout | estado posterior e serialização por empresa | duas remoções concorrentes não zeram owners |
| Race conditions | locks, uniqueness e idempotência persistente | suites concorrentes de invite/accept/resend/revoke/role |
| Stale membership | membership ativa revalidada por request/operação | desativação bloqueia acesso com sessão ainda válida |
| Confused deputy | ator da sessão, executor separado, escopo mínimo | service role sem ator/capability não decide operação |
| Enumeration | respostas externas uniformes e logs restritos | conta existente/inexistente produz superfície equivalente |
| Cross-tenant People linking | referências compostas e aceite tenant-aware | vínculo entre empresas falha inclusive com service role |

Nenhuma fase ultrapassa seu gate de segurança com falha `INTRODUZIDA` ou
`NÃO CONFIRMADA` relevante. Falhas são classificadas como `PREEXISTENTE`,
`INTRODUZIDA` ou `NÃO CONFIRMADA`, com evidência.

## 21. Estratégia de testes

### Unitários

- estados e transições de convite;
- autorização por role e ownership;
- fingerprint/idempotência;
- tenant resolver 0/1/N;
- redaction e contratos de auditoria;
- Application Services sem I/O real.

### Integração

- adapters Auth para conta existente/inexistente;
- falha de entrega e reenvio;
- aceite e rollback;
- preference/switch e invalidação;
- Composition Roots server-only.

### pgTAP e banco

- FKs/candidate keys/checks/uniqueness;
- RLS por role, estado e tenant;
- grants e funções privilegiadas;
- atomicidade e auditoria;
- último owner e concorrência;
- service role submetido a invariantes;
- preflight/backfill/verify/enforce.

### Concorrência e segurança

- aceite simultâneo;
- resend versus accept/revoke;
- convites concorrentes;
- role/owner concorrentes;
- replay, IDOR, tenant injection, stale membership e confused deputy.

### E2E e regressão

- onboarding e login single-tenant preservados;
- owner/admin convidando dentro da autoridade;
- conta nova e existente;
- aceite, expiry, revocation e duplicate;
- seleção/switch multi-tenant;
- desligamento e revogação imediata;
- nove eventos auditáveis.

Gates gerais: testes direcionados e completos, TypeScript, lint, build, db lint,
pgTAP, inspeção de catálogo, `git diff --check` e worktree auditável.

## 22. Rollback e cutover

- feature flags/entrypoints permitem interromper emissão, aceite, seleção e UI
  separadamente;
- migrations são pequenas, forward-only e possuem compensação planejada antes do
  merge;
- rollback nunca desabilita RLS, relaxa tenant ou apaga auditoria;
- antes do cutover, estruturas novas podem permanecer dormentes;
- após aceite real, rollback preserva convite, membership, People e histórico;
- retorno ao caminho antigo só é seguro para usuário com exatamente uma
  membership; múltiplos tenants nunca voltam a `limit(1)`;
- policy cutover possui compensação ensaiada e grants mínimos conhecidos;
- Auth externo é reconciliado por retry/observabilidade, não por mutação silenciosa
  de estado funcional;
- cleanup ocorre somente em follow-up aprovado após período de observação.

## 23. Decisões futuras do Product Architect

Não bloqueiam a aprovação deste plano, mas exigem gate próprio quando seus dados
estiverem disponíveis:

- tratamento de anomalias concretas encontradas no preflight/backfill;
- destino de linhas legadas `company_members.status = invited`, se existirem;
- escolha do mecanismo físico de preferência de tenant dentro das opções da ADR;
- provedor/canal operacional de e-mail e política de rate limit;
- duração do período de coexistência e critérios quantitativos de cutover;
- depreciação ou remoção de contracts, policies e estados legados;
- política legal de retenção além da preservação mínima aprovada;
- rollout em produção, janela operacional e migrations compensatórias finais.

Se qualquer ponto exigir mudar quem convida, roles, sete dias, People existente,
ownership, múltiplos tenants ou desligamento definidos pela PD-019, a execução
para e retorna à governança de produto.

## 24. Definition of Done do plano

O MVP-PR1 só pode ser declarado concluído quando:

- todas as fases tiverem aprovação explícita e evidência versionada;
- I1–I17 estiverem comprovadas em aplicação e banco;
- threat model estiver coberto por testes adversariais;
- fluxo single-tenant continuar compatível;
- fluxo multiuser/multi-tenant estiver determinístico e fail-closed;
- nove eventos forem duráveis, correlacionáveis e sem secrets;
- nenhum consumer usar seleção arbitrária ou escrita insegura;
- rollback/cutover estiver documentado e ensaiado;
- documentação oficial estiver reconciliada;
- Product Architect emitir aprovação final.

## 25. Phase 0 — Baseline & invariant mapping — resultado

**Status:** Approved pelo Product Architect

### 25.1 Baseline do repositório

| Item | Evidência factual |
| --- | --- |
| Branch | `feat/mvp-pr1-phase0-baseline` |
| Base da branch | `37f3070`; PD-019 formalmente Approved |
| ADR | ADR-0015 Accepted |
| Plano | Approved |
| Migration mais recente versionada e local | `0069` |
| Banco local | Postgres/API ativos; serviços auxiliares imgproxy/pooler parados |
| Worktree inicial | somente ADR-0015, índice e plano ainda não commitados; preservados no commit documental da branch |
| Código funcional na Phase 0 | nenhum |

O schema local está aplicado até `0069`. A inspeção combinou migrations
versionadas, catálogo PostgreSQL, código TypeScript e queries executadas dentro de
transação `READ ONLY`, finalizada com `ROLLBACK`.

### 25.2 Fluxo atual de login, tenant e autoridade

```text
login/signup Supabase Auth
  → middleware valida somente a identidade Auth
  → loadCurrentUserContext consulta company_members active por auth user
  → limit(1) sem ordenação escolhe companyId e role
  → getCurrentCompanyContext carrega Company
  → People é procurada por companyId + userId com limit(1)
  → páginas, Actions e Services reutilizam companyId/currentUser
  → RLS revalida membership ativa e, quando aplicável, role
```

Sem usuário Auth, `/app` redireciona para login. Usuário autenticado sem
membership ativa é redirecionado pelo contexto para onboarding. A página de
onboarding também consulta a primeira membership ativa. A RPC
`create_company_with_owner` rejeita qualquer usuário que já possua membership
ativa e cria Company, owner membership e People vinculada atomicamente.

O middleware não resolve membership, role, People ou tenant. Ele aceita qualquer
sessão Auth válida para navegação inicial; autorização tenant acontece depois.

### 25.3 Pontos de resolução arbitrária e consumers

Foram encontrados estes pontos tenant/identidade relevantes:

| Local | Comportamento | Impacto multi-tenant |
| --- | --- | --- |
| `features/authorization/current-user-context.ts` | primeira membership ativa por `.limit(1).maybeSingle()` | tenant oficial não determinístico |
| `app/onboarding/page.tsx` | primeira membership ativa | usuário multi-tenant é apenas redirecionado, sem escolha |
| `app/(dashboard)/app/people/new/page.tsx` | usa `memberships[0]` após `.limit(1)` no cliente | escrita pode usar tenant arbitrário |
| `lib/supabase/supabase/current-company.ts` | primeira People por tenant/user com `.limit(1).maybeSingle()` | vínculo ambíguo é silenciosamente escolhido |
| função `current_person_id` | `limit 1` por tenant/user | mesma ambiguidade na fronteira SQL |

`getCurrentCompanyContext` aparece em 76 arquivos, sendo um a própria definição e
75 consumers. `loadCurrentUserContext` aparece em cinco arquivos: definição,
barrel e três consumers diretos (`current-company`, Activity e Notifications).
Há quatro arquivos com query TypeScript direta a `company_members`: contexto
atual, onboarding, criação legada de People e `companies.service`. Este último
lista todas as empresas visíveis e não escolhe uma como atual.

Todos os 75 consumers do contexto compartilhado são potencialmente afetados pela
introdução de `tenant_selection_required`. A criação legada de People é um
consumer adicional que contorna o helper e precisa de cutover próprio.

### 25.4 Modelo persistente atual

#### Companies

- PK UUID, slug único, status `active|inactive|trial`;
- RLS habilitada, não `FORCE ROW LEVEL SECURITY`;
- membro ativo lê; owner/admin atualiza;
- nenhuma proteção específica de existência do último owner.

#### Company Members

- PK UUID;
- FK obrigatória para Company com cascade;
- FK obrigatória para `auth.users` com cascade;
- role fechada em `owner|admin|hr|manager|employee`;
- status fechado em `active|inactive|invited`;
- unique `(company_id, user_id)`;
- índice adicional somente em `user_id`;
- nenhum trigger;
- RLS habilitada; membros ativos leem e owner/admin possuem policy permissiva
  `ALL` baseada em role ativa;
- não há audit trail, timestamps de mudança, proteção de owner ou transação
  administrativa dedicada.

#### People

- PK UUID e candidate key `(id, company_id)`;
- `company_id` obrigatório;
- `user_id` nullable para `auth.users`, `ON DELETE SET NULL`;
- nenhuma unique em `user_id` ou `(company_id, user_id)`;
- e-mail nullable, sem unicidade ou normalização persistente;
- FKs tenant-aware já protegem manager, team e position;
- nenhum trigger de vínculo Auth/membership;
- RLS habilitada; membros ativos leem e owner/admin/hr possuem policy permissiva
  `ALL`.

Não existe tabela `employees`; People é a entidade canônica atual. As referências
organizacionais endurecidas pela migration 0064 não cobrem a relação lógica
People–membership.

#### Funções e fronteiras

- `is_company_member`, `has_company_role`, `current_person_id` e
  `create_company_with_owner` são `SECURITY DEFINER`;
- as três primeiras fixam autorização em membership ativa;
- `create_company_with_owner` deriva o ator de `auth.uid()` e cria o agregado
  inicial atomicamente;
- Development Template Application e Notifications possuem Trusted Persistence
  server-only com service role e RPCs transacionais;
- Global Competencies usa Auth global e executor service role separado;
- nenhum uso de `auth.admin` ou `inviteUserByEmail` existe no projeto.

### 25.5 Preflight de dados local

O banco local está vazio. As contagens abaixo são reais para este ambiente em
2026-08-08 e não podem ser extrapoladas para staging ou produção.

| Classificação | Contagem local |
| --- | ---: |
| Companies | 0 |
| Companies sem owner ativo | 0 |
| Companies com múltiplos owners ativos | 0 |
| Memberships total/active/inactive/invited | 0 / 0 / 0 / 0 |
| Memberships sem Auth user | 0 |
| Memberships sem Company | 0 |
| Auth users | 0 |
| Auth users sem membership / sem membership ativa | 0 / 0 |
| Usuários com memberships ativas em múltiplos tenants | 0 |
| People total/vinculada/sem vínculo Auth | 0 / 0 / 0 |
| People sem Company ou com Auth user ausente | 0 / 0 |
| People vinculada sem membership no mesmo tenant | 0 |
| Membership sem People no mesmo tenant | 0 |
| Grupos duplicados `(company,user)` em People | 0 |
| Grupos de e-mail duplicado no mesmo tenant | 0 |
| E-mails presentes em tenants diferentes | 0 |
| People vinculada com e-mail diferente do Auth | 0 |

Contagens de staging e produção: **UNKNOWN**. A Phase 1 é aditiva, mas nenhum
backfill/enforcement da Phase 2 pode ser aprovado sem executar o mesmo preflight
read-only no ambiente alvo.

### 25.6 Authority model atual

| Operação | Ator | Fonte de autoridade | Fonte do tenant | Executor | Fronteira de persistência |
| --- | --- | --- | --- | --- | --- |
| Login/signup | humano | Supabase Auth | nenhuma | cliente Auth | provedor Auth |
| Abrir `/app` | humano | sessão Auth no middleware | nenhuma | authenticated | nenhuma mutação |
| Resolver contexto | humano | membership `active`; role da membership | primeira membership retornada | authenticated + RLS | leitura direta |
| Onboarding | humano | authenticated e ausência de membership ativa | Company criada pela RPC | `SECURITY DEFINER` sob authenticated | RPC atômica |
| Ler Company/People | humano | membership ativa | contexto corrente | authenticated + RLS | leitura direta |
| Criar/alterar People | owner/admin/hr pela RLS | role em membership | contexto; tela legada usa primeira membership | authenticated | escrita direta; tela legada pode ser multi-step |
| Administrar membership | owner/admin pela policy atual | role em membership | `company_id` da linha | authenticated + RLS | escrita genérica permitida pela policy |
| Assessment administrativo | owner/admin/hr | contexto + participação/capability | contexto corrente | authenticated/RPC | RLS e leitura segura auditada |
| Notification persistence | ator humano resolvido pelo domínio | membership/producer registrado | evento resolvido | service role técnico | Trusted RPC atômica |
| Template Application V2 | humano owner/admin/hr | contexto e revalidação DB | contexto corrente | service role técnico | Trusted Persistence atômica |
| Catálogo global | autoridade global humana | delegação global, não membership | global/separado | service role técnico | RPC global confiável |

People não concede role. Auth metadata não é consultada como fonte de role ou
tenant. A role corporativa vem de `company_members.role`. O catálogo TypeScript
concede todas as permissions atuais a owner/admin/hr e leitura de planejamento a
manager/employee; policies específicas continuam sendo a defesa efetiva de
diversos domínios.

### 25.7 People ↔ Auth baseline

Classificação: **EXPLICIT**, por `people.user_id → auth.users.id`.

O vínculo não é email-based, mas está incompleto:

- é nullable e permite People sem conta;
- não é único por tenant;
- não exige membership correspondente;
- `current_person_id` e `getCurrentCompanyContext` escolhem a primeira People;
- onboarding copia e-mail Auth para People apenas como dado inicial;
- mudança de e-mail não quebra a FK, mas pode deixar os textos divergentes;
- igualdade de e-mail não cria vínculo no código atual;
- a ausência de constraint People–membership permite estado cross-model
  inconsistente, embora o ambiente local vazio não contenha exemplo.

### 25.8 Invitation baseline

O significado real de `invited` é apenas um valor permitido no status da própria
membership. Não foi encontrado produtor ou consumer TypeScript/SQL, além da
declaração do check. O helper de membership ignora `invited` porque exige
`active`.

Não existem token, digest, expiry, generation, acceptance, revocation, resend,
UI, Action, service, repository ou teste de convite. Como `company_members.user_id`
é obrigatório, uma eventual linha `invited` exigiria Auth user previamente
existente. Estruturalmente, invitation e membership estão misturadas no enum, mas
funcionalmente o convite não existe. O banco local contém zero linhas `invited`.

### 25.9 RLS e security baseline

- Companies, Company Members e People têm RLS habilitada e não usam FORCE RLS;
- policies relevantes são permissivas;
- `is_company_member` e `has_company_role` usam `auth.uid()` e status `active`;
- há 152 policies públicas no total: 61 referenciam `is_company_member` e 56
  referenciam `has_company_role` em sua expressão `USING`;
- Company Members permite `ALL` a owner/admin, sem distinguir administração de
  owner;
- People permite `ALL` a owner/admin/hr;
- nenhuma policy substitui a ausência de unicidade People/user ou proteção do
  último owner;
- helpers `SECURITY DEFINER` evitam recursão direta das policies de membership,
  mas precisam manter `search_path` fixo e grants mínimos;
- service role aparece em Global Competencies, Notifications e Template
  Application; não existe caminho de Auth Admin para convites;
- operações confiáveis existentes revalidam membership/autoridade e mantêm ator
  humano separado, mas essa garantia não cobre escrita genérica de membership.

Existem precedentes de auditoria em Activity, Approval, Development Template
Application, Notifications e Global Competencies. Não existe auditoria de
membership/People-link. O `AuthorizationService` produz evento em memória por sink
opcional; isso não constitui auditoria durável por padrão.

### 25.10 Invariant gap matrix

| ID | Estado | Evidência e risco | Fase de resolução |
| --- | --- | --- | --- |
| I1 | SATISFIED | Auth, contexto e FKs usam `auth.users.id` | preservar em todas |
| I2 | PARTIAL | autorização usa user ID; e-mail ainda é dado solto e convite inexiste | 1, 5, 6 |
| I3 | PARTIAL | núcleo Organization é tenant-aware; People–membership não possui vínculo físico same-tenant | 2 |
| I4 | SATISFIED | unique `(company_id,user_id)` em memberships | preservar em 2–12 |
| I5 | VIOLATED | nenhuma unique de People por usuário/tenant; `limit 1` mascara ambiguidade | 2 |
| I6 | NOT IMPLEMENTED | membership ativa não exige People por constraint | 2 e 6 |
| I7 | NOT IMPLEMENTED | convite/aceite não existem | 1, 5, 6 |
| I8 | NOT IMPLEMENTED | expiração, revogação e geração não existem | 1, 5, 6 |
| I9 | SATISFIED | role vem de membership; People/hierarquia/metadata não concedem role | preservar em 3–8 |
| I10 | VIOLATED | admin pode operar owners pela policy ampla; último owner não é protegido | 2, 3, 8 |
| I11 | NOT IMPLEMENTED | não existe preferência/tenant ativo explícito | 7 |
| I12 | VIOLATED | três caminhos escolhem primeira membership/People | 7 e 11 |
| I13 | PARTIAL | precedentes confiáveis separam executor; memberships não têm fronteira própria | 3, 5, 6 |
| I14 | SATISFIED | autoridade global usa delegação separada da membership | preservar |
| I15 | PARTIAL | onboarding e domínios maduros são atômicos; membership/People admin não é | 3 e 6 |
| I16 | SATISFIED | helpers e RLS consultam membership ativa em cada operação, sem role em JWT | preservar/endurecer em 7–8 |
| I17 | PARTIAL | auditorias append-only existem por domínio, não para membership/vínculo | 1, 3, 10 |

`VIOLATED` significa que o schema/caminho atual permite quebrar a invariante,
mesmo que o banco local vazio não contenha uma linha violadora.

### 25.11 Backfill impact assessment

| Classificação | Dados/ação provável |
| --- | --- |
| SAFE AUTOMATIC | nenhuma transformação declarada segura sem dados reais do ambiente alvo |
| DETERMINISTIC WITH PRECONDITION | vínculo People–membership quando `(company,user)` já coincide univocamente; materialização tenant-aware por IDs; preferência inicial somente com uma membership ativa; baseline do owner quando existe ao menos um owner ativo inequívoco |
| REQUIRES PRODUCT DECISION | nenhuma decisão nova comprovadamente necessária antes da estrutura aditiva da Phase 1 |
| REQUIRES MANUAL REVIEW | People duplicada por usuário/tenant; membership sem People; People vinculada sem membership; e-mail divergente/duplicado; empresa sem owner; linhas `invited` com uso real; relação cross-tenant; owner inconsistente |
| UNKNOWN | volume, locks, anomalias e contagens de staging/produção; uso externo direto das policies/RPCs |

Backfill não deve criar People, escolher entre duplicatas, inferir identidade por
e-mail, promover owner, ativar membership ou classificar `invited` sem evidência.

### 25.12 Anomalias e desvios factuais

1. Banco local vazio impede validar a qualidade dos dados reais; produção/staging
   permanecem UNKNOWN.
2. Tenant atual é arbitrário para usuário multi-tenant no helper central.
3. A tela legada de criação de People repete a seleção arbitrária no cliente e
   realiza writes diretos potencialmente multi-step.
4. People por usuário/tenant pode ser duplicada e é mascarada por `limit 1` tanto
   em TypeScript quanto em SQL.
5. Admin possui policy genérica capaz de administrar owner; não há proteção do
   último owner.
6. Membership ativa e People vinculada não possuem integridade cruzada.
7. `invited` existe somente como estado de membership e não representa fluxo real.
8. O catálogo de permissões TypeScript agrupa owner/admin/hr amplamente, enquanto
   policies de membership distinguem owner/admin; a Phase 4 deve evitar usar o
   catálogo genérico como autorização suficiente para PD-019.
9. `PROJECT_STATE`, `ROADMAP` e `NEXT_STEPS` ainda contêm estado anterior ao
   encerramento da PR 3C; divergência documental preexistente, fora da Phase 0.

### 25.13 Decisões antes da Phase 1

Nenhuma nova decisão funcional é necessária. A PD-019 e a ADR-0015 cobrem o
modelo aditivo.

Gates obrigatórios antes de autorizar Phase 1:

- Product Architect aprovar este baseline e a matriz I1–I17;
- confirmar que a Phase 1 continuará estritamente aditiva e não incluirá
  preferência de tenant, que permanece para a Phase 7;
- exigir repetição do preflight no ambiente alvo antes de qualquer backfill ou
  enforcement da Phase 2;
- se o ambiente alvo possuir linhas `invited` ou anomalias, parar e classificar
  seu tratamento antes da Phase 2, sem bloquear a criação aditiva da Phase 1.

### 25.14 Evidências e comandos executados

- branch, status e log;
- inventário de migrations até `0069`;
- buscas integrais por `limit(1)`, `single`, `maybeSingle`, company_members,
  invites, Auth Admin, service role e Trusted Persistence;
- contagem de 75 consumers do contexto compartilhado;
- `supabase status` para disponibilidade local;
- queries PostgreSQL em `BEGIN TRANSACTION READ ONLY` com `ROLLBACK`;
- catálogo de constraints, indexes, triggers, policies, RLS e funções
  `SECURITY DEFINER`;
- contagens de dados e anomalias listadas acima;
- nenhuma migration, backfill ou escrita funcional.

**Classificação da Phase 0:** READY FOR PHASE 0 APPROVAL.

## 26. Phase 1 — Additive persistence model — resultado

**Status:** Approved pelo Product Architect

### 26.1 Baseline e escopo efetivo

A Phase 1 partiu de `feat/mvp-pr1-phase0-baseline` no commit `f8d22c7`, com a
ADR-0015 Accepted, o plano Approved e a Phase 0 aprovada. Nenhuma mudança de
comportamento, Auth, tenant resolution, UI, Application Layer, membership legada
ou policy existente foi realizada.

A migration `0070_create_tenant_multiuser_persistence_foundation.sql` é somente
aditiva. Ela cria três estruturas novas e um índice de lookup não-enforcing em
People. Não contém `UPDATE`, `DELETE`, `INSERT ... SELECT`, backfill, alteração de
coluna existente, `DROP`, mudança de status legado ou consumer novo.

### 26.2 Modelo persistente introduzido

#### Tenant Access Operation

`tenant_access_operations` é a identidade persistente de uma intenção técnica
tenant-scoped. Ela reserva:

- empresa e ator humano;
- catálogo fechado de operação;
- chave idempotente e fingerprint da intenção;
- correlation ID;
- estado `reserved|succeeded|failed`;
- resultado JSON seguro, failure code e timestamps.

A unique `(company, actor, operation, idempotency_key)` prepara retry e conflito
sem implementar workflow. A candidate key `(id, company)` permite referências
tenant-aware. O state check impede resultado terminal incompleto em dados novos.

#### Company Member Invitation

`company_member_invitations` é separada de `company_members` e contém:

- identidade própria e candidate key tenant-aware;
- FK composta para People do mesmo tenant;
- operação de criação no mesmo tenant;
- e-mail já normalizado, role pretendida e geração positiva;
- somente `token_digest bytea` de 32 bytes; não há token bruto;
- estados `pending|accepted|expired|revoked`;
- expiração, atores/timestamps de criação, aceite e revogação;
- idempotency key, fingerprint e correlation ID.

Checks preservam coerência entre status e timestamps. Uniques parciais impedem,
somente nas linhas novas, dois convites `pending` para a mesma People ou o mesmo
e-mail no tenant. Reenvio/rotation, expiração automática, revogação e aceite não
foram implementados.

#### Tenant Access Audit Event

`tenant_access_audit_events` é a fundação append-only específica de acesso
tenant. As auditorias existentes são domain-specific e não cobrem membership,
invitation, People linking, ownership ou seleção de tenant; por isso não eram
reutilizáveis sem misturar ownership e contratos.

O catálogo suporta os nove eventos da ADR-0015 e `tenant.selected`. Cada linha
preserva empresa, operação, ator humano, tipo/identidade segura do executor,
target, target user opcional, correlation, outcome, reason code, metadata segura e
timestamp. Update/delete são bloqueados por grants e trigger append-only.

### 26.3 People ↔ Auth e tenant preference

Foi criado somente o índice parcial não-único
`people_company_user_lookup_idx(company_id,user_id) where user_id is not null`.
Ele prepara preflight e lookups sem impor unicidade sobre ambientes desconhecidos.

A unique parcial `(company_id,user_id)` foi **adiada para a Phase 2**, pois pode
falhar em staging/produção sem preflight. `people.user_id` continua nullable e
nenhuma membership existente passou a exigir People.

Tenant preference foi **adiada para a Phase 7**, conforme o baseline aprovado.
Não existe novo consumer, tabela, cookie, metadata Auth ou fallback. A escolha
física entre preferência global persistida e estado server-side protegido afeta
contratos futuros e não é necessária ao modelo aditivo desta fase.

### 26.4 FKs, constraints e índices

| Elemento | Justificativa |
| --- | --- |
| Invitation `(person_id,company_id)` → People | impede convite cross-tenant em dados novos |
| Invitation `(created_operation_id,company_id)` → Operation | correlaciona criação à intenção no mesmo tenant |
| Audit `(operation_id,company_id)` → Operation | garante auditoria tenant-aware da operação |
| Auth actor/user FKs | preserva identidade canônica e impede ator inventado |
| Operation idempotency unique | prepara retry persistente por ator/operação |
| Invitation digest unique | lookup inequívoco sem segredo bruto |
| Pending person unique | evita duas intenções vigentes para a mesma People |
| Pending email unique | evita disputa da mesma identidade bootstrap no tenant |
| Pending expiry index | suporta futura expiração/recovery sem indexar estados terminais |
| Operation correlation index | suporta rastreamento técnico por tenant |
| Audit company/time index | timeline tenant-scoped |
| Audit operation index | correlação de todos os eventos da intenção |
| People company/user non-unique | acelera preflight/resolução sem enforcement prematuro |

Não foi adicionada candidate key redundante a `company_members`, nem índice de
tenant preference, nem unique People/Auth. Nenhum índice foi criado para consulta
sem consumer futuro identificado.

### 26.5 RLS e grants

As três tabelas novas nascem com RLS habilitada e zero policies. `anon` e
`authenticated` recebem revoke completo. Convites, digest, operação e auditoria
não são legíveis pelo client.

`service_role` possui somente o acesso necessário para os futuros adapters:

- operação e invitation: `select`, `insert`, `update`;
- audit: `select`, `insert`, sem `update` ou `delete`.

Nenhuma policy/grant de Companies, Company Members ou People foi alterada. Ainda
não existe função pública, RPC, adapter ou workflow que consuma os grants novos.

### 26.6 Backward compatibility e ausência de backfill

- onboarding e `create_company_with_owner` permanecem inalterados;
- `company_members.status = invited` continua com significado e constraint
  legados intactos;
- `.limit(1)` e tenant resolution não foram tocados;
- nenhum consumer consulta as tabelas novas;
- RLS/policies antigas não sofreram cutover;
- migration aplicou sobre schema vazio e não lê ou transforma linhas legadas;
- a suíte comprova que unique de People/Auth ainda não existe;
- nenhuma estrutura torna People obrigatória para membership atual.

### 26.7 Testes e quality gates

| Gate | Resultado | Classificação |
| --- | --- | --- |
| Reset local sem seed, migrations 0001–0070 | passou | Phase 1 verde |
| pgTAP específico | 41/41 | Phase 1 verde |
| pgTAP completo | 264/264 em 9 arquivos | regressão verde |
| DB lint | uma falha em `save_approval_request`/migration 0046 | PREEXISTENTE |
| TypeScript | passou após build concluir | verde |
| Lint | passou com quatro warnings conhecidos | PREEXISTENTES |
| Build | passou; 30 páginas geradas | verde |
| `git diff --check` | passou antes da documentação final | verde |

A primeira tentativa isolada de TypeScript coincidiu com o build recriando
`.next/types` e retornou arquivos gerados ausentes. Repetida sequencialmente após
o build, passou sem erro; classificação: falha de execução concorrente, não
defeito introduzido.

O DB lint reportou `function digest(text, unknown) does not exist` dentro de
`public.save_approval_request`, criada na migration 0046 e não alterada pela Phase
1. Nenhum alerta aponta para a migration 0070.

O primeiro pgTAP usou uma assertion inexistente na versão local e foi corrigido.
Depois, duas expectativas alcançavam o bloqueio de grant antes do trigger; foram
ajustadas para testar o trigger sob papel privilegiado. A suíte final passou
integralmente.

### 26.8 Decisões adiadas e gates da Phase 2

- repetir o preflight read-only no ambiente alvo;
- comprovar ou reparar duplicidades antes da unique People/Auth;
- decidir enforcement físico entre membership ativa e People somente após
  inventário real;
- classificar linhas `company_members.status = invited` se existirem fora do
  ambiente local;
- materializar proteção do último owner apenas na Phase 2/3;
- manter tenant preference para a Phase 7;
- emissão, Auth Admin, resend, revogação e aceite permanecem nas Phases 5/6.

Nenhuma Phase 2+ está autorizada por este registro.

**Classificação da Phase 1:** APPROVED pelo Product Architect.

Evidência aprovada: migration `0070`, commit funcional `a3221b4`, documentação
`0d373a2`, pgTAP específico 41/41, pgTAP completo 264/264, reset 0001–0070,
TypeScript, lint, build e `git diff --check` verdes. A aprovação autoriza somente
o fechamento Git da Phase 1 e a execução da Phase 2 sob o preflight obrigatório;
não autoriza a Phase 3.

## 27. Phase 2 — Constraints & persistent invariants — resultado

**Status:** concluída, aprovada e incorporada; narrativa intermediária preservada
como histórico

### 27.1 Fechamento da Phase 1 e baseline

A Phase 1 foi integrada à `main` por merge `48d71fa`, após os commits aprovados
`a3221b4` e `0d373a2` e o registro de aprovação `c30f01d`. A `main` foi publicada
e confirmada igual a `origin/main`. A Phase 2 partiu dessa main integrada na
branch `feat/mvp-pr1-phase2-persistent-invariants`, sem commit funcional adicional
prévio.

### 27.2 Preflight read-only

O preflight local foi executado em transação `READ ONLY`, encerrada com
`ROLLBACK`. O schema local estava aplicado até `0070` e continha:

| Métrica | Local |
| --- | ---: |
| Companies | 0 |
| Owners ativos | 0 |
| Companies sem owner ativo | 0 |
| Companies com múltiplos owners ativos | 0 |
| People com `user_id` | 0 |
| Grupos duplicados `(company_id,user_id)` em People | 0 |
| People vinculada sem membership correspondente | 0 |
| Membership ativa sem People correspondente | 0 |
| Memberships `invited` | 0 |
| Memberships inativas | 0 |
| Auth users ativos em múltiplos tenants | 0 |
| Referências órfãs de membership | 0 |
| Referências órfãs de People | 0 |
| Referências órfãs de invitation | 0 |

Na primeira execução existia um projeto Supabase remoto legitimamente vinculado,
mas a credencial de banco necessária não estava disponível. A conexão foi
recusada antes de executar SQL e a documentação versionada não classificava o
ambiente. Naquele momento:

- staging: **UNKNOWN**;
- produção: **UNKNOWN**;
- remoto vinculado: acessibilidade de preflight **UNKNOWN**, sem query executada.

Nenhuma contagem local é extrapolada para outro ambiente. Nenhum dado foi
alterado e nenhum backfill foi executado.

### 27.3 Classificação dos enforcements

| Enforcement | Classificação | Resultado da Phase 2 |
| --- | --- | --- |
| FK People `(company,user)` → membership | SAFE NOW como `NOT VALID` | adicionada; protege linhas novas, sem varrer legado |
| Proteção do último owner e administração de owner | SAFE NOW | adicionada na fronteira persistente com serialização por Company |
| Unique parcial People `(company,user)` | SAFE NOW pelos dados | adicionada na migration 0072 |
| Validar a FK People → membership | SAFE NOW pelos dados | validação incluída na migration 0072 |
| Membership ativa → exatamente uma People | SAFE NOW pelos dados | constraint triggers diferíveis adicionados na migration 0072 |
| Backfill People/membership | NOT APPLICABLE | nenhum dado alvo e nenhum backfill executado |
| Transformar `company_members.status = invited` | NOT APPLICABLE | zero linhas em produção; nenhuma transformação executada |
| Preferência de tenant | fase 7 / fora do escopo | não alterada |

A interpretação normativa de I6 é: toda membership humana ativa deve possuir
People coerente no mesmo tenant. O modelo atual de `company_members` referencia
exclusivamente `auth.users`; não há identidade de sistema/service modelada como
membership. Isso corresponde à alternativa A. O enforcement inverso ainda não foi
materializado. O preflight posterior provou que os dados de produção não o
bloqueiam, mas a implementação continua sujeita a aprovação e precisa tratar
atomicamente criação, aceite, desativação e unlink.

### 27.4 Migration 0071 e invariantes materializadas

`0071_enforce_tenant_membership_invariants.sql` contém apenas enforcement seguro
sem pressupor o conteúdo de ambientes desconhecidos:

- FK composta tenant-aware de People para membership, `DEFERRABLE`, inicialmente
  imediata e `NOT VALID`;
- trigger restrito de ownership sobre `company_members`;
- lock pessimista na Company apenas quando a mutação toca role owner;
- somente owner ativo administra owner existente ou promove novo owner;
- bootstrap do primeiro owner exige o próprio ator autenticado;
- remoção, desativação ou rebaixamento que deixaria zero owners ativos falha com
  `LAST_ACTIVE_OWNER_REQUIRED`;
- `service_role` sem ator humano não consegue decidir ownership;
- função `SECURITY DEFINER` com `search_path` fixo e execução direta revogada.

A FK não transforma People em autoridade: ela apenas prova coerência física. Role
e status continuam em membership. People sem `user_id` continua permitida; o
mesmo Auth user em tenants diferentes continua estruturalmente permitido. Não
houve alteração de RLS, grants de tabela, onboarding, Auth, Application Layer,
tenant resolution ou convite legado.

### 27.5 Backfill, invited e compatibilidade

Nenhum `UPDATE`, `DELETE`, `INSERT ... SELECT` ou escolha de vínculo/owner foi
adicionado. O estado legado `invited` não foi reinterpretado. O onboarding
continua criando Company → owner membership → People na mesma RPC e satisfaz a
FK em linhas novas. Criação de People sem Auth permanece compatível. A lifecycle
de membership não-owner não foi alterada.

### 27.6 Testes e concorrência

O pgTAP específico possui 20 assertions para catálogo, FK tenant-aware, People
sem Auth, cross-tenant linking, vínculo sem membership, owner/admin, último owner,
executor técnico, lifecycle não-owner, ausência deliberada da unique People/Auth,
`invited` legado e ausência de cutover RLS.

O teste concorrente usou duas conexões e dois owners ativos tentando rebaixar-se
simultaneamente. A primeira transação concluiu; a segunda esperou o lock da
Company e falhou com `LAST_ACTIVE_OWNER_REQUIRED`. O estado final manteve
exatamente um owner ativo. Os dados efêmeros locais foram removidos depois.

### 27.7 Quality gates

| Gate | Resultado | Classificação |
| --- | --- | --- |
| Reset local migrations 0001–0071 | passou | Phase 2 verde |
| pgTAP específico | 20/20 | Phase 2 verde |
| pgTAP completo | 284/284 em 10 arquivos | regressão verde |
| Concorrência de último owner | 1 commit + 1 rejeição; 1 owner final | Phase 2 verde |
| DB lint | `digest(text,unknown)` em `save_approval_request`/0046 | PREEXISTENTE |
| TypeScript | passou após build | verde |
| Lint | passou com quatro warnings conhecidos | PREEXISTENTES |
| Build | passou; 30 páginas geradas | verde |
| `git diff --check` | passou antes do registro documental | verde |

A primeira execução de TypeScript ocorreu em paralelo ao build, enquanto `.next`
era regenerado, e encontrou arquivos gerados ausentes. Repetida sequencialmente
após o build, passou. É a mesma condição operacional já observada na Phase 1 e
não um defeito funcional introduzido.

O DB lint mantém exclusivamente a falha da migration 0046 já registrada na Phase
1. Nenhum alerta aponta para 0070 ou 0071.

### 27.8 Gates que estavam pendentes antes da conclusão da Phase 2

Neste gate histórico, a Phase 2 ainda não era declarada completa
automaticamente. O preflight de produção
removeu o bloqueio de dados e a migration 0072 materializou:

1. unique parcial `(company_id,user_id)` de People;
2. validação da FK People → membership;
3. membership ativa → exatamente uma People conforme I6.

Não há backfill ou reparação a executar sobre o estado observado. As migrations
0071/0072 estão preparadas para rollout, mas não foram aplicadas manualmente em
produção. A Phase 2 aguarda aprovação final do Product Architect e a execução de
migrations continuava responsabilidade humana. Naquele gate, não havia
autorização para Phase 3; o estado vigente está em §28.13.

**Classificação da Phase 2:** READY FOR PHASE 2 FINAL APPROVAL.

### 27.9 Aprovação do safe subset e acesso aos ambientes alvo

O Product Architect aprovou explicitamente o safe subset materializado na
migration 0071: FK People → membership tenant-aware `NOT VALID`, enforcement de
novas linhas, ownership guard, proteção concorrente do último owner e ausência
deliberada de backfill, unique People/Auth prematura, transformação de `invited`
ou cutover RLS. Essa aprovação não aprova a Phase 2 completa, não autoriza merge
da branch e não autoriza a Phase 3.

A auditoria de acesso encontrou:

- um único projeto Supabase ativo e vinculado pela CLI;
- nenhuma branch Supabase adicional que identifique staging;
- URL pública e anon key no ambiente web, insuficientes para preflight agregado
  sob RLS;
- pooler/configuração de conexão local gerada pelo linkage, mas sem a credencial
  de banco necessária;
- nenhuma variável de ambiente de banco/Supabase administrativo disponível no
  processo atual;
- CI limitado a lint e build, sem secrets ou job de banco;
- nenhuma configuração versionada de deploy, staging ou produção.

A tentativa inicial de conexão ao banco remoto foi recusada antes da execução de SQL por
ausência de senha. Nenhuma query remota, mutation, migration, backfill ou repair
foi executada. Esse bloqueio operacional foi posteriormente resolvido pela role
dedicada registrada em §27.11.

### 27.10 Questão reservada para a Phase 3

O owner invariant da migration 0071 deriva o ator humano por `auth.uid()`. A
futura Trusted Persistence precisará transportar e revalidar confiavelmente:

```text
human actor → trusted server executor/service_role → persistence
```

preservando `ACTOR != EXECUTOR`. `service_role` nunca poderá adquirir autoridade
própria de owner, e `actor_user_id` arbitrário vindo do client nunca poderá ser
confiado. O mecanismo físico para comprovar a identidade humana na fronteira
persistente será projetado e revisado na Phase 3, somente após autorização
explícita. Nenhuma solução foi implementada nesta fase.

### 27.11 Target preflight de produção

O Dashboard Supabase confirmou o projeto `gzrrwyiqfbnyprkdeqvm` como
**PRODUCTION**. Em `2026-08-09T14:54:10Z`, o preflight foi executado pela role
dedicada `evol_preflight_readonly`. A conexão comprovou
`default_transaction_read_only = on`; cada inspeção abriu explicitamente
`BEGIN READ ONLY` e terminou em `ROLLBACK` ou, quando uma tentativa foi rejeitada
por permissão, pelo encerramento da conexão abortada. Somente `SHOW`, `SELECT` e
leitura de catálogo foram usados.

| Métrica | Produção |
| --- | ---: |
| Companies | 0 |
| Auth users | UNKNOWN — role sem `USAGE` efetivo no schema `auth` |
| Memberships total/active/inactive/invited | 0 / 0 / 0 / 0 |
| Owners ativos | 0 |
| People total/com `user_id` | 0 / 0 |
| Companies sem owner ativo | 0 |
| Companies com múltiplos owners ativos | 0 |
| Duplicidades `(company_id,user_id)` em People | 0 grupos / 0 linhas excedentes |
| People vinculada sem membership same-tenant | 0 |
| Membership ativa sem People same-tenant | 0 |
| Membership ativa com múltiplas People | 0 |
| People vinculada a membership não ativa | 0 |
| Usuários com memberships ativas em múltiplos tenants | 0 |
| Duplicidades de membership | 0 |
| Referências órfãs para Company | 0 |
| Owners ativos sem People | 0 |
| Companies com inconsistência owner/People | 0 |

As FKs existentes `company_members.user_id → auth.users.id` e
`people.user_id → auth.users.id` estão validadas no catálogo. Como as tabelas
tenant possuem zero linhas, não existe referência tenant-owned que possa estar
órfã contra Auth, embora o total global de Auth users permaneça UNKNOWN.

Produção ainda não contém as estruturas das migrations 0070 e 0071: invitation
table, FK People → membership e unique People/Auth estão ausentes. Isso é estado
de rollout, não anomalia de dados, e não autoriza aplicar migrations.

Classificação após o preflight:

- unique People/Auth `(company_id,user_id)`: **SAFE NOW** pelos dados;
- aplicar e validar FK People → membership: **SAFE NOW** pelos dados;
- membership humana ativa → exatamente uma People: **SAFE NOW** pelos dados;
- backfills: **NOT APPLICABLE**;
- `company_members.status = invited`: **NOT APPLICABLE**;
- ownership guard da 0071: **SAFE NOW** pelos dados e já aprovado como safe subset;
- anomalias de I1–I17 dependentes das tabelas tenant: nenhuma encontrada;
- total de Auth users: **UNKNOWN**, sem impacto sobre o hard gate porque não há
  Company, membership ou People em produção.

O target preflight está completo para decisão do Product Architect. Nenhum
enforcement adicional, migration, backfill, repair ou Phase 3 foi iniciado.

### 27.12 Conclusão do enforcement da Phase 2

Após aprovação explícita do target preflight, a migration
`0072_complete_tenant_membership_invariants.sql` foi criada sem DML ou backfill.
Ela:

- adiciona a unique parcial `people_company_user_key` sobre
  `(company_id,user_id)` quando `user_id is not null`;
- valida a constraint `people_company_user_membership_fkey` introduzida na 0071;
- adiciona constraint trigger diferível que exige exatamente uma People para o
  estado final de toda membership humana `active`;
- protege delete/unlink/reassociação de People quando deixaria uma membership
  ativa sem vínculo;
- permite membership + People e desativação + unlink na mesma transação;
- mantém People sem Auth e o mesmo Auth user em tenants diferentes;
- não usa e-mail como identidade, não altera role e não transforma `invited`;
- preserva o ownership guard e não altera RLS ou grants de tabela.

O modelo atual não possui membership de sistema: `company_members.user_id`
referencia `auth.users.id`. Portanto, I6 é aplicado a todas as memberships
persistidas; `service_role` continua executor técnico e não se torna ator humano.
O transporte confiável de ator pela futura Trusted Persistence permanece questão
reservada da Phase 3.

#### Evidência de validação

| Gate | Resultado | Classificação |
| --- | --- | --- |
| Reset local migrations 0001–0072 | passou | Phase 2 verde |
| pgTAP específico da conclusão | 24/24 | Phase 2 verde |
| pgTAP completo | 308/308 em 11 arquivos | regressão verde |
| `create_company_with_owner` | owner + People coerentes; constraints imediatas passaram | regressão verde |
| Concorrência de People/Auth | 1 insert + 1 violação unique; 1 vínculo final | Phase 2 verde |
| Concorrência de último owner | 1 commit + 1 rejeição; 1 owner final | Phase 2 verde |
| DB lint | `digest(text,unknown)` em `save_approval_request`/0046 | PREEXISTENTE |
| TypeScript | passou | verde |
| Lint | passou com quatro warnings conhecidos | PREEXISTENTES |
| Build | passou; 30 páginas geradas | verde |
| `git diff --check` | passou antes do registro documental | verde |

As expectativas pgTAP das Phases 1 e 2 safe subset foram reconciliadas com o
estado final: o índice lookup aditivo permanece, a FK agora está validada e a
unique aprovada está presente. Nenhuma regra anterior foi removida.

Naquele gate, nenhuma migration havia sido aplicada em produção, a Phase 2
aguardava aprovação final e a Phase 3 não estava autorizada. O estado vigente
posterior está em §28.13.

## 28. Phase 3 — Trusted Persistence — Implementation Readiness Review

**Status:** concluída, integrada e publicada; readiness abaixo preservada como
baseline histórico

### 28.1 Baseline confirmado

A revisão partiu da branch
`docs/mvp-pr1-phase3-trusted-persistence-review`, com worktree limpa e
`HEAD`, `main` e `origin/main` em `f77b229`. As Phases 1 e 2 estão incorporadas.
A cadeia canônica chega à migration `0073`; o novo projeto canônico foi criado
exclusivamente por `0001`–`0073`, e o hardening de resolução de extensões está
incorporado por `be269bd`/`f77b229`.

As seções 27.8 e 27.12 preservam o histórico anterior à aprovação e ao rollout.
Na data desta readiness review, o estado era: Phase 2 concluída e incorporada;
Phase 3 ainda não autorizada. O resultado posterior e vigente está registrado em
§28.13. O projeto antigo divergente não é autoridade normativa.

### 28.2 Decisão de actor versus executor

A opção de menor privilégio para as mutações internas da Phase 3 é uma
`SECURITY DEFINER RPC` chamada com o client Supabase da sessão `authenticated`.
Nesse caminho:

- `actorUserId` é sempre `auth.uid()` dentro da RPC;
- `actorUserId` não existe no payload público da operação;
- `companyId` e IDs tenant-owned são seletores não confiáveis, sempre
  revalidados contra membership ativa, role e relações compostas;
- a RPC persiste `executorType = authenticated`, sem confundir a database role
  com o ator humano derivado por `auth.uid()`;
- o guard de ownership da 0071 continua recebendo o mesmo `auth.uid()` e não
  precisa de GUC, impersonation, claim customizada ou bypass;
- nenhuma RPC aceita `actor_user_id` arbitrário para depois tratá-lo como prova
  de autoria.

`auth.getUser()` ocorre na futura fronteira server-only antes da Application
Layer, para construir um contexto autenticado e rejeitar sessão ausente ou
inválida. Essa verificação não substitui `auth.uid()` na RPC: a identidade é
revalidada novamente na fronteira persistente. O fluxo futuro será:

```text
Server Action
  → auth.getUser() no client da sessão
  → ActorContext interno { actorUserId }
  → Application intent sem actor controlado pelo client
  → port de Trusted Persistence
  → authenticated SECURITY DEFINER RPC
  → auth.uid() + autorização tenant atual + constraints + auditoria
```

O `companyId` pode atravessar as camadas como parte da intenção, mas nunca como
autoridade. Até a Phase 7 não há resolver multi-tenant oficial; portanto a Phase
3 não usa o atual `.limit(1)`. Cada RPC valida diretamente que `auth.uid()` possui
membership ativa no `companyId` indicado e a role necessária. Para aceite, a
Company é derivada do convite resolvido pelo digest, não do payload.

RPC com `service_role` e `p_actor_user_id` não é o padrão da Phase 3. Uma RPC
dessas não conseguiria provar autonomamente que o argumento corresponde à sessão
humana e perderia `auth.uid()` no trigger da 0071. Service role fica reservado às
integrações Auth Admin e entrega externa das Phases 5/6. Se surgir operação de
banco que realmente exija service role, ela precisará de adapter server-only que
execute `auth.getUser(token)`, derive o ator sem input do client, revalide no
banco a capability atual e registre `service_role` somente como executor; isso
exige revisão específica antes de implementação.

`correlationId` é criado na fronteira server-only com UUID criptograficamente
aleatório, atravessa Application Layer e port como metadado não autoritativo e é
vinculado à `tenant_access_operation`. Chave de idempotência pode ser recebida do
client para retry, mas é validada e escopada por Company, ator e operação. A RPC
calcula o fingerprint canônico; não confia em fingerprint fornecido.

### 28.3 Inventário operacional e classificação de execução

Legenda: **A** = authenticated + `SECURITY DEFINER RPC` preservando `auth.uid()`;
**B** = server-only + service role + revalidação explícita; **C** = authenticated
e RLS sem trusted RPC; **D** = fora da Phase 3.

| Operação | Ator e autoridade | Execução | Atomicidade, identidade e resultado |
| --- | --- | --- | --- |
| Criar convite | owner/admin ativo; owner obrigatório para role owner | **A**, primitiva persistente; geração/entrega fica na Phase 5 | operation + invitation pending + `invite.created`; idempotency key, fingerprint calculado, lock/uniques por People/e-mail |
| Reenviar convite | owner/admin ainda autorizado para a role | **A**, rotação persistente; segredo/entrega na Phase 5 | lock do convite; nova geração/digest/expiração + `invite.resent`; retry canônico |
| Revogar convite | owner/admin ainda autorizado para a role | **A** | lock do convite; pending/expired → revoked + `invite.revoked`; accepted é conflito fechado |
| Aceitar convite | usuário autenticado correspondente ao e-mail verificado | **A**, primitiva dormente até a Phase 6 | invitation + membership + People + três auditorias em um commit; Company vem do convite; lock por convite/Company |
| Criar membership | não é intenção pública independente | **D** como API; subpasso interno do aceite **A** | unique `(company,user)` e constraint diferível; `membership.created` quando houver criação |
| Vincular People ↔ user | não é intenção pública independente | **D** como API; subpasso interno do aceite **A** | FK/unique da 0071/0072; `person.linked`; nunca por igualdade de e-mail isolada |
| Alterar role | owner; admin somente para memberships não-owner e roles não-owner | **A** | lock da Company/membership; fingerprint com estado esperado; `membership.role_changed` |
| Transferir ownership | owner ativo | **A** | operação única: promove destino e opcionalmente rebaixa origem no mesmo commit; lock da Company; uma idempotency key |
| Remover/rebaixar owner | owner ativo; autorrebaixamento exige confirmação futura na Action | **A** | guard 0071, lock da Company, estado esperado; último owner protegido |
| Desativar membership | owner/admin, exceto owner administrado somente por owner | **A** | membership inactive + unlink People quando aplicável + eventos no mesmo commit; owner guard ativo |
| Desligar/inativar People | ator autorizado a administrar People; desativação de acesso é consequência obrigatória, não escolha de role | **A** | People status + membership inactive + unlink + `membership.deactivated`/`person.unlinked`; constraints diferíveis |
| Escolher tenant ativo | próprio usuário | **D**, Phase 7; provável **C** ou RPC estreita conforme preferência escolhida | não concede autoridade; revalida membership ativa |
| Trocar tenant ativo | próprio usuário | **D**, Phase 7 | invalida contexto/cache; nunca usa primeira membership |

Nenhuma operação da Phase 3 precisa de **B** para persistência PostgreSQL. Auth
Admin, descoberta global de conta, criação/ativação no provedor e entrega de
e-mail são **B**, mas pertencem às Phases 5/6. Leituras da própria identidade e
memberships podem ser **C**; as mutações multi-step permanecem **A**.

### 28.4 Formato da Trusted Persistence

A Phase 3 cria somente contratos internos e fronteiras persistentes dormentes:

- intents fechadas por operação, com `companyId`, targets, idempotency key,
  correlation ID e estado esperado quando aplicável;
- nenhum intent público contém `actorUserId`, executor, role atual inferida,
  fingerprint ou resultado;
- resultados discriminados: `succeeded`, `idempotent_retry`, `conflict`,
  `denied` e `known_failure`, sempre com IDs seguros e código estável;
- um port por agregado coerente, sem repository com escrita direta nas tabelas;
- adapter Supabase server-only capaz de usar o client authenticated recebido da
  sessão, sem criar service-role client para as RPCs da Phase 3;
- RPCs estreitas por transição; sem RPC genérica `manage_membership(payload)` e
  sem grants de escrita nas tabelas protegidas;
- reservation/idempotência em `tenant_access_operations`, fingerprint calculado
  sobre intenção normalizada e resultado terminal persistido;
- auditoria em `tenant_access_audit_events` dentro da mesma transação da mutação;
- `search_path = public, pg_temp`, referências qualificadas a extensões e grants
  `EXECUTE` mínimos somente às RPCs efetivamente seguras para `authenticated`.

As tabelas da 0070 já cobrem operação, convite e auditoria. A Phase 3 ainda
precisa de migration forward-only para funções transacionais, grants de execução
e, somente se o desenho detalhado provar necessidade, constraints aditivas para
transições/identidades que não possam ser garantidas pelas estruturas atuais.
Não há necessidade conhecida de nova tabela, backfill ou RLS cutover.

### 28.5 Invite lifecycle e aceite atômico

O lifecycle persistente da Phase 3 é:

```text
create → pending → resend (pending, geração + 1)
                 → expire lógico por expires_at
                 → revoke
                 → accept
expired → resend (mesma intenção, nova geração e validade)
revoked/accepted → terminal para resend/accept
```

`expired` pode ser materializado na mesma transação que observa
`pending + expires_at <= now()`; nenhuma autorização depende de job assíncrono.
Cada geração recebe digest SHA-256 de segredo forte criado fora da persistência;
somente o digest entra no banco. Reenvio substitui o digest e invalida a geração
anterior. A Phase 3 testa isso com segredos/digests controlados, mas não gera link,
chama Auth Admin ou envia e-mail.

O aceite acontece sob sessão autenticada, quando `auth.uid()` já existe. Não
precisa de Admin API antes da transação. A RPC lê a identidade canônica atual em
`auth.users` por `auth.uid()`, exige e-mail verificado normalizado compatível e,
sob locks, executa no mesmo commit:

1. resolver convite por digest/generation e bloquear a linha;
2. derivar Company/People/role do convite;
3. revalidar pending, prazo, revogação e ausência de aceite divergente;
4. verificar People ativa, tenant correto e vínculo atual compatível;
5. criar ou reativar exatamente uma membership com a role pretendida;
6. vincular `people.user_id = auth.uid()`;
7. marcar invitation accepted;
8. concluir operation e persistir `invite.accepted`, `membership.created` quando
   aplicável e `person.linked`.

Constraints diferíveis permitem membership e People alcançarem juntas o estado
final válido. Falha em qualquer passo reverte tudo. Conta Auth criada ou
confirmada antes do aceite não é estado funcional parcial: sem membership ativa
ela não acessa o tenant. Retry após falha externa é seguro porque a transação
interna é idempotente. Estado integralmente compatível já concluído retorna o
resultado canônico; estado apenas parcial ou identidade diferente retorna
conflito e nunca é reparado silenciosamente.

### 28.6 Ownership e concorrência

0071 já serializa mutações que tocam owner pelo lock da Company, exige owner
ativo para administrar owner e rejeita zero owners com
`LAST_ACTIVE_OWNER_REQUIRED`. 0072 garante que membership ativa termine a
transação com exatamente uma People coerente.

A Phase 3 não substitui esses triggers. RPCs autenticadas fazem a autorização de
produto antes da escrita e deixam os triggers como garantia final. Transferência
é uma única operação transacional, não duas chamadas de Application Layer.
Promover o destino e, se solicitado, rebaixar a origem compartilham operation,
correlation ID, fingerprint, lock e auditoria. Duas transferências ou duas
remoções concorrentes serializam na Company; o segundo writer revalida o estado
já alterado e retorna retry canônico ou conflito.

Os testes concorrentes obrigatórios usam conexões PostgreSQL reais e incluem:

- dois accepts da mesma geração;
- accept versus revoke/resend;
- dois convites para a mesma People e para o mesmo e-mail no tenant;
- duas mudanças de role com o mesmo estado esperado;
- duas transferências de ownership;
- dois owners tentando eliminar o último owner;
- ativação versus desativação da membership;
- dois vínculos People/Auth concorrentes.

### 28.7 Auditoria

A infraestrutura da 0070 já contém os dez tipos atuais, incluindo os nove
obrigatórios. Toda linha de decisão da Phase 3 deve preencher:

| Campo lógico | Origem confiável |
| --- | --- |
| `companyId` | convite ou membership/People revalidada no tenant |
| `actorUserId` | `auth.uid()` |
| `executorType` / `executorId` | database role real (`authenticated`) e identificador técnico não secreto |
| target user/person/membership/invitation | linhas bloqueadas e revalidadas; IDs ausentes permanecem nulos/metadados seguros |
| `correlationId` | contexto server-only vinculado à operation |
| `occurredAt` | relógio do banco |
| outcome/reason | transição efetiva e código estável |

O schema possui `target_id`, `target_type` e `target_user_id`; invitation,
membership e person IDs adicionais podem ser representados pelo target primário
e metadata mínima. Antes de adicionar colunas, a implementação deve provar que
essa representação não perde a rastreabilidade exigida pela ADR. Nenhum token,
digest, e-mail bruto, JWT ou credencial entra em metadata/log.

Eventos de sucesso fazem parte da mesma transação da mutação. Falha do writer de
auditoria aborta a mutação. Falhas esperadas que precisem auditoria durável devem
ser convertidas em resultado terminal da operation dentro da RPC; exceção
inesperada/corrupção aborta e não produz auditoria falsamente concluída.
Observabilidade, readers e alertas permanecem para a Phase 10.

### 28.8 Idempotência e conflitos

| Operação | Semântica |
| --- | --- |
| Create invite | key obrigatória; unique da operation e uniques pending; fingerprint inclui Company, People, e-mail normalizado e role |
| Resend | key obrigatória; lock invitation; fingerprint inclui invitation, geração esperada e expiração alvo; retry não gira duas vezes |
| Revoke | key obrigatória; lock invitation; repetir mesma revogação retorna terminal; accepted é conflito |
| Accept | key obrigatória por ator; lock invitation; mesmo ator/intenção retorna resultado; ator/generation divergente falha fechado |
| Role change | key + role/status esperado; lock membership/Company; payload divergente é conflito otimista |
| Deactivate/unlink | key + estado esperado; lock membership/People/Company quando owner; retry preserva resultado |
| Ownership transfer | key + owners/roles esperados; lock Company; uma operação abrange promoção e rebaixamento opcional |

Relógio, IDs gerados e fingerprint são calculados no lado confiável. A unique de
`tenant_access_operations` resolve retries entre processos. Advisory lock só é
necessário quando não houver linha natural antes da criação; locks de row/Company
e uniques continuam sendo a defesa final.

### 28.9 Error model

Os códigos mínimos são:

- autenticação/autorização: `AUTHENTICATION_REQUIRED`,
  `TENANT_AUTHORIZATION_DENIED`, `OWNER_ADMINISTRATION_REQUIRES_ACTIVE_OWNER`;
- convite: `TENANT_INVITE_NOT_FOUND`, `TENANT_INVITE_EXPIRED`,
  `TENANT_INVITE_REVOKED`, `TENANT_INVITE_ALREADY_ACCEPTED`;
- identidade/integridade: `TENANT_MEMBERSHIP_ALREADY_EXISTS`,
  `TENANT_PERSON_ALREADY_LINKED`,
  `ACTIVE_MEMBERSHIP_REQUIRES_EXACTLY_ONE_PERSON`,
  `LAST_ACTIVE_OWNER_REQUIRED`;
- idempotência/conflito: `TENANT_IDEMPOTENCY_CONFLICT`, `TENANT_CONFLICT`;
- infraestrutura inesperada, somente na tradução externa:
  `TENANT_PERSISTENCE_FAILED`.

`NOT_FOUND` é usado também para ID de outro tenant, evitando enumeração.
Autorização e estados terminais são determinísticos e não retryable. Conflito de
estado exige reload/nova intenção. Falhas de conexão/timeout são transientes e o
mesmo idempotency key pode ser repetido. Erros SQL inesperados não são reduzidos
silenciosamente a regra de domínio dentro do banco.

### 28.10 Threat model aplicado

| Ameaça | Mitigação da Phase 3 |
| --- | --- |
| ator forjado | nenhum parâmetro de ator; `auth.uid()` obrigatório e revalidado |
| tenant/role/People/invitation forjado | IDs são seletores; lookup tenant-scoped, role derivada da membership/convite e erro indistinguível |
| confused deputy | RPC authenticated por padrão; service role não participa da persistência Phase 3 |
| privilege escalation | matriz PD-019 revalidada na transação e guard 0071 para owner |
| cross-tenant/IDOR | FKs compostas, lookup por Company e nenhuma resposta que confirme outro tenant |
| replay/token roubado | digest, geração, prazo, `auth.uid()` e e-mail verificado; aceite único |
| stale membership/owner | revalidação no instante da escrita e lock da Company/membership |
| corrida | row locks, Company lock, uniques, constraints diferíveis e operation idempotente |
| segredo vazado | somente digest persistido; nenhuma auditoria/log contém token ou JWT |
| audit bypass | evento e mutação no mesmo commit; tabelas continuam sem escrita client genérica |

### 28.11 Boundaries e testes para aprovação

Pertencem à Phase 3: migration forward-only das RPCs transacionais e grants
estreitos; contratos internos; adapter/repository de Trusted Persistence
server-only ainda sem consumer; pgTAP de autorização, atomicidade, idempotência,
auditoria, grants, cross-tenant, actor forgery, rollback e ownership; testes reais
de concorrência.

Não pertencem à Phase 3:

- Application Services e composição consumível — Phase 4;
- geração/entrega de e-mail, Auth Admin, resend externo e rate limit — Phase 5;
- callback, redirect, entrada real de aceite e integração Auth — Phase 6;
- resolução, preferência e seleção/troca de tenant — Phase 7;
- RLS/grants de cutover e remoção de escrita legada — Phase 8;
- Actions, páginas, formulários, selector e UX — Phase 9;
- readers, métricas e alertas — Phase 10;
- cutover e cleanup — Phases 11/12.

Suíte proposta:

1. unitários do adapter e contratos, sem Application Layer da Phase 4;
2. pgTAP de cada RPC e transição;
3. matriz owner/admin/hr/manager/employee, inactive, anon e service role;
4. ausência de parâmetro de ator e tentativa de ator/tenant forjado;
5. cross-tenant para People, membership, invitation e audit;
6. audit atomicity, append-only e falha do writer;
7. retry igual e fingerprint divergente;
8. concorrência com duas conexões PostgreSQL reais;
9. rollback sem estado parcial;
10. catálogo de grants, `SECURITY DEFINER` e `search_path`;
11. comprovação de que service role sem sessão humana não administra owner;
12. regressão do onboarding e invariantes 0070–0073.

pgTAP comum roda localmente. Corridas exigem harness com conexões reais. A
validação linked deve respeitar os privilégios do novo projeto: o full pgTAP pela
role `cli_login_postgres` permanece inconclusivo, sem concessão permanente; testes
targeted e inspeção de catálogo são a evidência remota permitida até existir
mecanismo operacional aprovado.

### 28.12 Gaps e governança

PD-019 já cobre roles, identidade, lifecycle, ownership, múltiplos tenants e
auditoria. ADR-0015 já cobre Trusted Persistence, `ACTOR != EXECUTOR`, aceite,
idempotência e concorrência. Portanto:

| Gate | Resultado |
| --- | --- |
| Nova Product Decision | não necessária |
| Nova ADR | não necessária |
| Amendment da ADR-0015 | não necessário |
| Implementation Plan cobre a Phase 3 | sim, detalhado por esta revisão |
| Implementação intermediária antes da Phase 3 | não necessária |
| Reconciliação documental | concluída nesta entrega documental |

`PROJECT_STATE.md`, `ROADMAP.md`, `NEXT_STEPS.md` e `CHANGELOG.md` foram
reconciliados com o encerramento histórico da PR 3C, as Phases 1/2 do MVP-PR1 e o
hardening 0073. Não há divergência documental conhecida impedindo a decisão do
Product Architect.

**Classificação desta revisão:** READY FOR PHASE 3 APPROVAL.

Na data desta revisão, o recorte técnico estava pronto para decisão, mas a Phase
3 ainda não havia sido iniciada. A aprovação e o resultado posteriores estão
registrados abaixo.

### 28.13 Resultado final, rollout e próximo gate

**Status vigente:** APPROVED, concluída, incorporada à `main` e publicada em
`origin/main` pelo merge `3559a9b` (`80973f9`, `948999a`, `69ed8cd`).

A migration `0074_create_tenant_access_trusted_persistence.sql` criou sete RPCs
v1 estreitas:

1. `issue_company_member_invitation_v1`;
2. `resend_company_member_invitation_v1`;
3. `revoke_company_member_invitation_v1`;
4. `accept_company_member_invitation_v1`;
5. `change_company_member_role_v1`;
6. `deactivate_company_membership_v1`;
7. `transfer_company_ownership_v1`.

O rollout no projeto Supabase canônico confirmou 0074 Local = Remote. As sete
RPCs têm owner `postgres`, `SECURITY DEFINER = true`,
`search_path = public, pg_temp` e `EXECUTE` funcional somente para
`authenticated`; `anon`, `service_role` e `PUBLIC` não possuem `EXECUTE`.
`postgres` pode executar por ownership/superuser, não como caminho funcional da
aplicação.

O modelo final preserva `ACTOR != EXECUTOR`: `auth.uid()` é a única autoridade
humana persistente; tenant e role são revalidados no lado confiável; nenhuma
intenção pública aceita `actorUserId`; e `service_role` não participa do caminho
funcional. Convite de owner registra o grantor original, que precisa continuar
owner ativo no aceite; o convidado não se torna autor da concessão. Ownership
transfer é transacional. Idempotência e fingerprint são calculadas/persistidas
no lado confiável, retry equivalente retorna resultado canônico e reutilização
divergente da chave retorna conflito. Auditoria é atômica e separa ator humano de
executor técnico, sem token, JWT, digest, credencial ou e-mail sensível em
metadata. Falhas conhecidas usam códigos estáveis; erro SQL inesperado aborta.

O escopo aprovado também incorporou contratos, Application Service coordenador,
port, adapter Supabase autenticado e Composition Root server-only, ainda sem
consumer funcional. Esse refinamento substitui a reserva de escopo feita na
readiness de §28.11 somente para essa fundação mínima; não declara a Phase 4
iniciada ou concluída.

Validação final aprovada:

- fresh reset `0001`–`0074`: PASS;
- pgTAP completo local: 362/362;
- Tenant Access pgTAP: 50/50;
- testes TypeScript Tenant Access: 8/8;
- Tenant Access e regressões relevantes: 18/18;
- DB lint local, TypeScript, lint e build: PASS;
- lint com quatro warnings preexistentes fora do escopo;
- concorrência PostgreSQL real: accept/accept, accept/revoke, owner accept versus
  downgrade do grantor e ownership transfer race: PASS;
- deadlock encontrado durante o desenvolvimento eliminado por ordem uniforme de
  locks;
- `git diff --check`: PASS.

O pgTAP/lint remoto completo não é registrado como integralmente verde: funções
pgTAP no schema `extensions` e a role técnica `cli_login_postgres` limitam o
runner. Essa condição não foi introduzida pela 0074, não representa erro nas RPCs
Tenant Access e não autoriza grant permanente de `USAGE`. A 0073 já resolveu,
separadamente, `extensions.digest(...)` na função de negócio afetada.

Continuam fora da Phase 3: Server Actions consumidoras, UI de membros/convites,
Auth Admin, geração/envio real de e-mail, redirects, tenant selection/switch,
cutover RLS adicional e observabilidade de fases posteriores.

A Phase 4 foi posteriormente encerrada como **Complete by Prior Delivery**, sem
implementação adicional. A Phase 3 aprovada já havia entregue sua fundação
estrutural, e a revisão confirmou que duplicá-la seria incorreto.

O próximo gate previsto é a **Phase 5 — Invitation issuance, revocation &
resend**, ainda não iniciada nem autorizada. Antes de implementação, o Product
Architect deve autorizar explicitamente a fase e confirmar token lifecycle,
provider de e-mail, secret management, domínio/remetente, URL/redirect e política
mínima de timeout/retry/idempotência. O primeiro slice futuro esperado é o Block
B — Token utility; depois, Block C — Delivery boundary. Nenhum deles é
implementado ou autorizado por este fechamento.

Acceptance/Auth permanece na Phase 6; resolver, preferência e seleção/troca de
tenant permanecem na Phase 7; RLS cutover, UI, E2E e observabilidade permanecem
em suas fases originais. Não há nova Product Decision, ADR ou amendment
arquitetural identificado como necessário.

## 29. Estado vigente — Phase 9

As Phases 5–8 foram posteriormente concluídas e incorporadas à `main`. A Phase 8
encerrou o cutover de autorização pela caracterização 8A e pelas migrations
0077/0078, preservando `auth.uid()` e membership ativa como autoridade tenant.

A execução vigente é a **Phase 9 — Multiuser UI/UX**. Seu primeiro recorte é a
**PR 9A — Functional Tenant Selection**, que torna interativa a fronteira segura
de `/select-company` usando exclusivamente a Action e a RPC
`select_active_tenant_v1` existentes. Nenhuma migration, nova RPC, mudança de RLS
ou grant faz parte da 9A.

Depois da aprovação da 9A, o próximo recorte previsto é a **PR 9B — tenant
switcher e resolução consistente da preferência ativa nas Actions multiempresa**.

### 29.1 PR 9B — Tenant Switcher

A PR 9A foi concluída no merge `b4aae86`. A PR 9B foi implementada e aguarda
aprovação: o header passa a exibir a empresa atual e oferece troca explícita para
usuários com múltiplas memberships ativas. A troca reutiliza
`selectActiveTenantAction` e `select_active_tenant_v1`, retornando a `/app` para
reconstrução server-side do novo contexto.

A composição preference-aware foi unificada e aplicada aos consumers diretos de
Tenant Access, Activity e Notifications. Preferência continua sendo contexto;
`auth.uid()` e membership ativa continuam sendo autoridade. A PR não cria
migration, RPC, policy ou grant.

Após aprovação da 9B, o próximo recorte previsto é a **PR 9C — Invitation
Issuance UI para Person existente**.

### 29.2 PR 9C — Invitation Issuance UI

A PR 9B foi concluída no merge `3070855`. A PR 9C foi concluída no merge
`4d7b037`: owner/admin recebe uma ação contextual em People para emitir convite
para uma Person ativa, sem vínculo Auth e com e-mail cadastrado. O diálogo exibe
o e-mail não editável, limita as roles conforme o ator server-side e envia somente
`personId` e `intendedRole` à Action existente.

A Action, a Application Layer, a Trusted Persistence e o delivery permanecem
inalterados e como autoridade final. Não foi criada leitura autenticada de
`company_member_invitations`, migration, RPC, policy ou grant.

### 29.3 PR 9D1 — Secure People Access-State Read Boundary

A PR 9D foi dividida em 9D1 e 9D2. A 9D1 foi concluída no merge `02168b9` e
adicionou a migration 0079 e a RPC
`get_people_access_state_v1(uuid)`, uma projeção mínima de Person, membership e
invitation state autorizada por `auth.uid()` e membership owner/admin ativa. O
`company_id` é apenas selector; a função reutiliza
`require_tenant_access_administrator` e preserva isolamento tenant.

A tabela `company_member_invitations` permanece fechada a SELECT autenticado,
sem nova policy. A projeção não retorna e-mail, digest, token, Auth IDs ou IDs
operacionais, e nenhum `service_role` participa do caminho humano. Expiração
efetiva de invitation pending é calculada no relógio do banco, sem UPDATE.

### 29.4 PR 9D2 — People Access-State UI + Invitation Resend/Revoke

A 9D2 foi concluída no merge `3f13bbc`. A People Server Page consome a
RPC segura da 9D1 com tenant derivado no servidor, valida defensivamente a
projeção e apresenta estados de membership/invitation com precedência fail-closed.
Resend e revoke enviam somente invitation ID e generation às Server Actions
existentes; stale generation exige refresh e falha de delivery não oculta a
mutação persistida.

Não há migration, RPC, policy ou grant novo. A tabela de invitations permanece
fechada a leitura direta, nenhum client acessa Supabase e `service_role` continua
fora do caminho humano.

### 29.5 PR 9E1 — Secure Membership Management Target Identity

A discovery da PR 9E confirmou um bloqueio de contrato: as operações trusted de
role change, deactivation e ownership transfer recebem `membership_id`, mas a
projeção segura v1 da 9D1 não expõe esse identificador e o papel `authenticated`
não possui SELECT direto em `company_members`.

A PR 9E1 foi concluída no merge `1e4ccbb`. A migration 0080 adiciona a
RPC `get_people_access_state_v2(uuid)`, aditiva e `SECURITY DEFINER`, que preserva
integralmente a v1 e acrescenta apenas `membership_id`. O ID é selector
operacional, não autoridade: `auth.uid()`, membership owner/admin ativa e tenant
continuam revalidados no banco. Nenhuma policy, RLS ou grant de tabela é alterado.

### 29.6 PR 9E — Membership Management UI

A PR 9E foi concluída no merge `f10d116`. O consumer People migra para a
RPC v2 com validação estrita e usa `membership_id` somente como selector. Thin
Server Actions derivam tenant e role do ator pelo contexto preference-aware,
geram idempotency/correlation IDs no servidor e chamam as operações trusted de
role change, deactivation e ownership transfer existentes.

A UI antecipa a matriz owner/admin, falha fechada para estados incoerentes e
preserva expected role/status, conflito concorrente e proteção do último owner.
Não há migration, RPC, policy, grant, escrita direta ou `service_role` novo.

### 29.7 PR 9F — Multiuser E2E Validation + UX/Compatibility Polish

A PR 9F foi concluída no merge `a6188dd`. A validação reutilizou fixtures
transacionais com dois tenants, todas as roles, invitations, preference e trusted
membership mutations. As regressões app/DB e o smoke HTTP local passaram.

Foram corrigidos três defeitos MEDIUM comprovados test-first: feedback de revoke
e deactivation agora permanece dentro do AlertDialog ativo, e falhas de aceite são
anunciadas como `alert`. Não há migration, RPC, policy, grant ou mudança de
autoridade.

O progresso funcional passa de 96% para 98%. O repositório não possui harness de
browser E2E, e a 9F não introduz framework pesado; por isso a jornada autenticada
desktop/mobile/teclado permanece como gate humano explícito para 100%. Após esse
smoke, o passo seguinte é o checklist operacional de release.

### 29.8 MVP Closure PR 10A — Current User Active Tenants Read Boundary

O smoke autenticado de fechamento encontrou um blocker real: onboarding,
current-user-context e tenant selection ainda dependem de SELECT direto em
`company_members`, mas `authenticated` intencionalmente não possui esse grant.

A PR 10A foi concluída no merge `9d2a7ec`. Ela é DB-first e adiciona pela migration 0081 a função
`get_current_user_active_tenants_v1()`. A projeção não recebe parâmetros, deriva
o ator de `auth.uid()` e retorna somente `company_id`, `company_name` e
`membership_role` das memberships ativas do próprio ator, ordenadas por
`company_id`. Nenhum grant de tabela, policy, preferência ou autoridade nova é
introduzido.

A integração de onboarding, resolução e seleção permanece explicitamente na PR
10B — Application Integration of Active Tenant Read Boundary.

### 29.9 MVP Closure PR 10B — Application Integration

A PR 10B adiciona um único adapter server-only que chama
`get_current_user_active_tenants_v1()` sem `userId`, `companyId` ou qualquer
selector. O retorno é validado no application layer e convertido para
`companyId`, `companyName` e `CorporateRole` antes da resolução determinística.

Onboarding, current-user-context, tenant selection e tenant switcher passam a
consumir essa fronteira e deixam de executar SELECT direto em `company_members`.
O onboarding volta a distinguir com segurança zero memberships de membership
existente. `/app/people/new` e `companies.service.ts` permanecem deliberadamente
fora deste recorte e seguem para avaliação na PR 10C — Legacy Tenant Consumer
Cleanup.

O MVP permanece em 98% até o smoke autenticado ser retomado em signup →
onboarding → criação da primeira empresa e toda a matriz desktop/mobile/teclado
passar.

### 29.10 MVP Closure PR 10C — Legacy Tenant Consumer Cleanup

A PR 10B foi mergeada em `fb4ae6f1c6c71337c5d28be77c88e01bae561fe8`.
A PR 10C migra a rota ativa `/app/people/new` do Supabase browser-side, SELECT
direto de `company_members`, fallback de primeira membership e inserts diretos
para `getCurrentCompanyContext()`, queries server-side e o `EmployeeForm`/
`createEmployeeAction` canônicos. A Action deriva `companyId` no servidor e não
aceita selector tenant do payload do browser. `companies.service.ts` foi removido
após busca confirmar ausência de consumers.

Não há migration, RPC, policy, grant, `service_role` ou mudança de schema. A
suíte DB permanece em 21 arquivos/559 testes; TypeScript, lint e build passam. O
MVP permanece em 98%. Após aprovação e merge, o smoke manual retoma em signup →
onboarding → criação da primeira empresa → `/app` e segue pela matriz completa
single/multi-tenant, People e gestão de acesso, mobile, teclado e session/logout.

### 29.11 MVP Closure PR 10D — Tenant-Scoped Person Contact Read Boundary

Após o merge da PR 10C em `419c89a`, o smoke autenticado comprovou que
`getCurrentCompanyContext()` ainda lia `companies` e `people` diretamente, sem
privilégio de tabela para `authenticated`. O nome da Company já pode vir da
projeção 0081 e o Person ID de `current_person_id(company_id)`. A emissão inicial,
porém, não possuía boundary para obter o e-mail persistido sem confiar no client.

A migration 0082 cria
`get_tenant_person_invitation_contact_v1(company_id, person_id)`, uma função
`STABLE SECURITY DEFINER` com `search_path` hardened. Ela reutiliza
`require_tenant_access_administrator`, projeta somente `person_id` e `email`,
preserva `NULL` sem duplicar elegibilidade e torna Person estrangeira
indistinguível de inexistente. Somente `authenticated` recebe EXECUTE; não há
grant/policy de tabela, mutation ou `service_role` no caminho humano. O pgTAP
dedicado possui 27 asserts e a suíte passa em 22 arquivos/586 testes.

A PR 10D é exclusivamente DB-first. A PR 10E — Current Company + Invitation Read
Integration — deve consumir 0081, `current_person_id` e a nova 0082 antes da
retomada do smoke em signup/login → onboarding → primeira Company → `/app`. O MVP
permanece em 98%.
