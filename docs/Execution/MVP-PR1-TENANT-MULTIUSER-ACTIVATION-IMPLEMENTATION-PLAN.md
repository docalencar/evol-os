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
