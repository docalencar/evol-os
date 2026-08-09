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

**Status:** safe subset Approved; Phase 2 completa BLOCKED BY TARGET PREFLIGHT

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

Existe um projeto Supabase remoto legitimamente vinculado, mas a credencial de
banco necessária não estava disponível. A conexão foi recusada antes de executar
SQL. A documentação versionada também não classifica esse projeto como staging ou
produção. Portanto:

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
| Unique parcial People `(company,user)` | BLOCKED BY UNKNOWN TARGET DATA | não adicionada; exige ausência comprovada de duplicidades |
| Validar a FK People → membership | BLOCKED BY UNKNOWN TARGET DATA | constraint permanece `NOT VALID` |
| Membership ativa → exatamente uma People | BLOCKED BY UNKNOWN TARGET DATA | não adicionada nesta execução |
| Backfill People/membership | SAFE AFTER DETERMINISTIC BACKFILL, condicionado ao preflight | nenhum backfill executado |
| Transformar `company_members.status = invited` | REQUIRES MANUAL REVIEW se houver linhas | nenhuma transformação; local contém zero, demais ambientes UNKNOWN |
| Preferência de tenant | fase 7 / fora do escopo | não alterada |

A interpretação normativa de I6 é: toda membership humana ativa deve possuir
People coerente no mesmo tenant. O modelo atual de `company_members` referencia
exclusivamente `auth.users`; não há identidade de sistema/service modelada como
membership. Isso corresponde à alternativa A. O enforcement inverso, porém, não
foi materializado porque staging e produção permanecem UNKNOWN e a validação
física precisa tratar atomicamente criação, aceite, desativação e unlink sem
presumir estado legado.

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

### 27.8 Gates pendentes e decisão antes da Phase 3

A Phase 2 não pode ser declarada completa enquanto staging e produção não forem
preflightados e os seguintes passos não tiverem evidência:

1. provar ausência ou executar reparação aprovada de duplicidades People/Auth;
2. criar e validar a unique parcial `(company_id,user_id)` de People;
3. validar a FK People → membership sobre todas as linhas existentes;
4. provar e materializar membership ativa → People conforme I6;
5. classificar qualquer `company_members.status = invited` encontrado;
6. repetir as contagens antes/depois e validar zero anomalia.

O UNKNOWN bloqueia a própria migration de unique/validação e qualquer backfill;
não bloqueia a migration 0071 no recorte `NOT VALID` e ownership, pois esses
elementos não examinam nem transformam linhas existentes durante aplicação. O
rollout desses enforcements adicionais permanece bloqueado. Não há autorização
para Phase 3.

**Classificação da Phase 2:** BLOCKED BY TARGET PREFLIGHT.

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

A tentativa de conexão ao banco remoto foi recusada antes da execução de SQL por
ausência de senha. Nenhuma query remota, mutation, migration, backfill ou repair
foi executada. Como o projeto vinculado não é classificado documentalmente como
staging ou produção, ambos permanecem **UNKNOWN**. O preflight requer que o Human
Reviewer disponibilize acesso SQL read-only ao ambiente correto ou execute as
queries aprovadas e devolva as contagens.

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
