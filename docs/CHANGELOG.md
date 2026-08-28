# Evol OS — Changelog

Este changelog registra somente grandes entregas incorporadas à `main`. Commits
locais e branches abertas não entram aqui.

## 2026-08-28 — Career / Seniority — Slice 4A (Competency Matrix Relocation) — CLOSED / PASS

Fecha a **Slice 4A** do rollout Career / Seniority (plano §8), composta por duas
migrations aplicadas e validadas **localmente e no Canonical Review**
(`rwfvxvbzaosgcyfxdjpt`, HEAD `main` `cb6c68d`).

- **`0120` — Position × Seniority competency matrix foundation** (commit `7481a42`,
  SHA-256 `5ab8802d624fcc08a1e1ab0ef94a35df5d52ecea7bfa420f5ed3b3637b6e5831`).
  Cria `position_seniority_competencies` (profile-based) e faz o **backfill
  zero-loss e fail-closed** de `position_competencies` para o **base profile**
  (`seniority_level_id NULL`, ativo), preservando `expected_level/weight/required/
  type/notes/archived_at/timestamps`. **Fonte preservada:** `position_competencies`
  **não** é removida fisicamente (período de compatibilidade, plano §5/§15); **sem
  dual-write**; boundaries RPC trusted preservados. Integridade pós-0121 no Review:
  `SOURCE=TARGET=3`, `SOURCE_ACTIVE=TARGET_ACTIVE=2`, `SOURCE_ARCHIVED=TARGET_
  ARCHIVED=1`, `PARITY_MISMATCH=0`, `BASE_MAPPING_VIOLATION=0`.
- **`0121` — Closed-table privilege hardening** (commit `cb6c68d`, SHA-256
  `b67e5f19a82d13555cacbea4b0007e3205f64137647d0a40888105be58cc6d64`). Descoberta
  **durante a validação no Review**: as três tabelas fechadas de Career / Seniority
  (`seniority_levels`, `position_seniority_profiles`, `position_seniority_
  competencies`) tinham **client table grants** herdados dos default privileges do
  ambiente Supabase — uma **violação do contrato CLOSED TABLE / defense-in-depth**
  (RLS já estava ativo), **não** uma data breach comprovada. `0121` é **revoke-only**
  e corrige o drift explicitamente (`revoke all … from public, anon, authenticated`
  nas três tabelas; padrão precedente `0076`). Pós-0121 no Review:
  `POST_CLIENT_EXPOSED_PRIV_COUNT=0` (anon e authenticated com SELECT/INSERT/UPDATE/
  DELETE = 0 nas três tabelas); `service_role` **inalterado** (por desenho); RLS=1 e
  POLICIES=2 em cada tabela; EXECUTE preservado para `authenticated` nos quatro
  boundaries trusted (`get_tenant_position_seniority_profiles_v1`,
  `create_tenant_seniority_level_v1`, `create_tenant_position_with_seniorities_v1`,
  `update_tenant_position_with_seniorities_v1`).

Validação local antes do Review: `supabase db reset = PASS`; pgTAP **Files=64,
Tests=2210, Result=PASS**. Promoção no Review: `REVIEW_PROMOTION=PASS`,
`SLICE_0121_REVIEW_VALIDATION=PASS`, `HISTORY_0119=1 / 0120=1 / 0121=1 /
GT_0121=0`. **Nenhuma validação em Production foi realizada** — Production
permanece `UNKNOWN / REVERIFY BEFORE USE`; Legacy permanece `NOT A PROMOTION
TARGET`. Detalhe operacional por migration em
[ENVIRONMENT-MIGRATION-STATUS](./execution/ENVIRONMENT-MIGRATION-STATUS.md).

**Nota de metodologia (follow-up leve, sem expandir o slice):** para futuras
migrations `CREATE TABLE` sensíveis à segurança, classificar explicitamente o
acesso da tabela como **CLOSED / RPC-only** ou **direct client access** e **codificar
a postura GRANT/REVOKE pretendida na própria migration**; testes de tabelas CLOSED
devem cobrir **anon e authenticated**. Isso evita que o drift de default privileges
do ambiente passe nos testes locais e só apareça na promoção ao Review — exatamente
o que originou a `0121`.

**Escopo NÃO iniciado (permanece gated):** Slice **4B** (Matrix UI + escalas), Slice
**5** (Competency Assignments + Gap), e o **Position Uniqueness audit gate** (plano
§9). Próximo gate normativo = **Slice 4B**, sob autorização explícita.

## 2026-08-27 — Governança — Reconciliação do estado real de Career / Seniority

Correção de governança **stale**: a documentação afirmava que Career / Seniority
estava "planejada e adiada" e que o próximo passo era "implementar a Slice 1A",
mas o **código e o histórico do `git` provam que o rollout já foi executado até a
Slice 3B e está em `main`**. Reconciliação apenas documental (nenhuma migration,
nenhum código de produto, nenhum teste alterado; `0119` intacta; sem `0120`).

Evidência por slice (todas **CLOSED / PASS**, commits em `main`):

- **Slice 1A — Seniority Catalog Foundation (DB)** — migration `0100`
  (`seniority_levels`: id, company_id, code, label, rank, active, timestamps;
  chave composta tenant-safe; boundaries create/update/archive `SECURITY DEFINER`),
  commit `3baff67`.
- **Slice 1B — Catalog read boundary + Admin UI** — migration `0101` (read
  boundary), commits `fb61323`/`f22b481`; rota `/app/company/seniority` real
  (`getSeniorityLevels`, `SeniorityLevelTable`, `SeniorityLevelCreateDialog`).
- **Slice 2A — Position-Seniority Profiles (DB)** — migration `0102`, commit
  `bb1e72b` (base profile = senioridade NULL).
- **Slice 2B — Cargo↔Senioridade config (UI)** — commit `c4c7b2e` + migration
  `0106` (atomic Position config); feature `organization/position-seniorities`
  wired em `/app/company/positions/[id]`.
- **Slice 3A/3B — People profile assignment + lotação UX** — migrations `0103`
  (People profile assignment), `0104`/`0105` (explicit assignment + historical),
  commits `801c6d9`/`edf986d`/`40e0e67`; `people.position_seniority_profile_id`
  (additive; `position_id` preservado), escrita via boundary
  `create/update_tenant_person_v2` + `enforce_people_position_seniority_coherence`;
  seleção de senioridade no formulário de People (`get-people-seniority-options`,
  `employee-organization-step`).

**Não implementado (gaps reais, sob novo gate):** Slice **4A — Competency Matrix
Relocation** (`position_seniority_competencies` + backfill zero-loss; **alto risco
de dados**), **4B** (Matrix UI + escalas), **5** (Competency Assignments + Gap), e o
**Position Uniqueness audit gate** (plano §9, decisão humana/produto). **Out of
scope** (plano §14): promotion readiness canônica / next-level / succession /
nine-box — o `promotionReady` de `hr-intelligence` é heurística derivada, **não**
regra canônica de Career. `hierarchical_level` (enum global do Cargo) e
`seniority` (catálogo company-owned via profiles) permanecem **eixos ortogonais**.

Próximo passo normativo: **Slice 4A**, precedido de recovery + re-read do
Implementation Plan + autorização explícita antes de qualquer migration.

## 2026-08-27 — App — Direct-Report Anonymous Aggregate integrado (Slice 0115-B2-C Phases 2–5) — CLOSED / PASS

Integração de aplicação da boundary anônima `0119` ao produto, em PRs por fase,
preservando o contrato de anonimato PD-022 / ADR-0018 ponta a ponta. Nenhuma
migration nova; `0119` intacta; sem `0120`.

- **Phase 2 — App read boundary** (`853dfb44`,
  `feat(assessment-feedback-read): add direct-report anonymous aggregate read boundary (0119)`):
  schema Zod `.strict()` de 7 colunas, `personDirectReportAggregate` na repository,
  `getPersonDirectReportAggregateReadModel` discriminado (`forbidden`/`unavailable`/
  `ok`) com guard-before-RPC; RPC consumido **somente** pela repository; sem
  agregação client-side.
- **Phase 3 — Presenter / ViewModel** (`de166e0`,
  `feat(people): present anonymous direct-report aggregate states (0119)`):
  `presentPersonDirectReportAggregate` (rows → ViewModel discriminado quantitative/
  qualitative/suppressed), precedência fail-closed, reuso de
  `formatAssessmentPercentage` e da copy "Resultado qualitativo"; A e D
  indistinguíveis; copy suprimida "Dados insuficientes para exibição anônima".
- **Phase 4 — People UX** (`ff2ba6db`,
  `feat(people): surface anonymous direct-report feedback`): superfície separada
  **"Feedback de subordinados — anônimo"** na página da Pessoa, coexistindo com
  "Últimas avaliações" e Self × Manager; sem CTA individual, sem link de resposta,
  sem cardinalidade, sem identidade; `forbidden` oculta a seção, `unavailable`/
  `empty` com copy neutra. Build **PASS no Mac** (Next 15.5.20, 34/34 páginas).
- **Phase 5 — Final validation** (sem alteração de código): cadeia
  `DB 0119 → repository → read-model → presenter → People UX` provada por auditoria
  estática de arquitetura + no-leak, **73 testes determinísticos PASS**, `tsc`
  PASS, `lint` PASS, `git diff --check` limpo; pgTAP inalterado (nenhum `supabase/`
  tocado pelas fases de app). Autorização/anonimato validados ao vivo no Canonical
  Review pela matriz da Phase 1.

**Dívida residual explícita (aceita):** o app smoke autenticado ponta a ponta no
Canonical Review permanece **NOT DEMONSTRATED (gated)** — exigiria toggle temporário
de Confirm-email e fixtures descartáveis persistidas em Review, sob autorização; os
invariantes que ele checaria já estão provados ao vivo (matriz Phase 1) e pela suíte
determinística. Production `UNKNOWN / REVERIFY BEFORE USE`; Legacy `NOT A PROMOTION
TARGET`; sem push.

## 2026-08-27 — Review — Migration 0119 promovida e validada (Slice 0115-B2-C Phase 1)

Boundary de banco da B2-C Phase 1 aplicada e validada no Canonical Review
(`rwfvxvbzaosgcyfxdjpt` — **Evol Review**, `ACTIVE_HEALTHY`, `us-west-2`).
Somente boundary de banco — **sem** integração de aplicação/UI.

- **Migration `0119`** (`get_tenant_person_direct_report_aggregate_v1(uuid,uuid)`),
  commit `865badd2`, SHA-256
  `9f55cdcbe47bba48a78dbe5ace2caf93bb43b90fce94bb10bb74f466db622c16`. Gate local
  oficial `supabase db reset && supabase test db` → **Files=62, Tests=2142, PASS**.
- **Promoção** operador via `supabase migration up --linked --yes` em
  **2026-08-27T11:46:45Z**; `db push --linked --dry-run` seguinte:
  `Remote database is up to date`.
- **Validação pós-promoção (read-only + 1 matriz transacionada):** history PASS
  (`0119` uma vez em `supabase_migrations.schema_migrations`); `pg_proc`
  existence/parity PASS (função única; args `p_company_id uuid, p_person_id uuid`;
  RETURNS de 7 colunas; `prosrc` md5 `07312ce60208f7304a9bb1b8fb98b791`, 3534
  bytes); ACL/security PASS (`SECURITY DEFINER`, `search_path = public, pg_temp`,
  EXECUTE só `authenticated`, `anon`/`PUBLIC` revogados); matriz
  funcional/threat-model PASS em `BEGIN … ROLLBACK` (estados A/B/C/D,
  indistinguibilidade sub-threshold, `visibility = none` excluído, sem acumulação
  entre ciclos, owner/admin/hr allow, manager/employee/cross-tenant deny,
  `AUTH_REQUIRED`, no-oracle, ≤1 auditoria por leitura), **zero `COMMIT`, zero
  persistência**.
- **Classificação:** `REVIEW 0119: ACTIVE / VALIDATED / PASS`. Production
  `UNKNOWN / REVERIFY BEFORE USE`; Legacy `NOT A PROMOTION TARGET`. Sem push.

## 2026-08-26 — Governança — Direct-Report Anonymity & Aggregation (Slice 0115-B2-C)

Discovery da Slice 0115-B2-C concluída e aprovada; governança versionada
(documentação apenas — sem migration, sem `0119`, sem código de produto):

- **PD-022 — Direct-Report Anonymity & Aggregation Policy (Approved):** expõe
  `direct_report` de forma **agregada e anônima**; princípio de produto = impedir
  razoavelmente a **reidentificação** do avaliador por score, cardinalidade,
  metadata, tempo ou comparação. Threshold **`k = 4`** por `(company, Person,
  Cycle)`; sem acumulação entre ciclos; abaixo de `k`, nada exibido (sem score,
  parcial, cardinalidade ou metadata); `visibility = none` não participa; score =
  média dos `overallScore` elegíveis (reuso da autoridade `compute_assessment_scored_result_v1`,
  `NULL` nunca vira zero); **contrato público sem `respondent_count`**;
  owner/admin/hr veem **somente o agregado** (sem drill-down/individual);
  auditoria ≤1 evento por leitura; People em superfície separada sem CTA; terceira
  dimensão independente no Self × Manager.
- **ADR-0018 — Direct-Report Anonymity & Aggregation Architecture (Accepted):**
  agregação **server-side** em nova boundary `SECURITY DEFINER`
  (`get_tenant_person_direct_report_aggregate_v1`), threshold e suppression
  fail-closed, isolamento por ciclo (anti-differencing), reuso do scorer, contrato
  minimizado, isolamento de tenant, auditoria única.
- **Implementation Plan versionado** (`docs/execution/SLICE-0115-B2-C-DIRECT-REPORT-ANONYMITY-IMPLEMENTATION-PLAN.md`,
  Approved): DB-first → migration `0119` (aggregate boundary + pgTAP/threat-model) →
  app read boundary → presenter → People UX → Canonical Review validation.
  **Migration REQUIRED (`0119`)**, porém **implementação não autorizada** a iniciar
  sem aprovação explícita do Product Architect. Production `UNKNOWN / REVERIFY
  BEFORE USE`; Legacy `NOT A PROMOTION TARGET`.

## 2026-08-26 — Assessment Results Track (0115–0118) + B2-B2-B — CLOSED / PASS

Reconciliação de governança (autoridade = estado real do `main`/HEAD
`338efd58…`) registrando a trilha **Assessment Results**, já incorporada à `main`
mas ainda ausente dos documentos narrativos. Sem promoção, sem migration nova,
sem `0119`, sem push.

Migrations — aplicadas e validadas; Local e Canonical Review alinhados em `0118`
(fonte operacional autoritativa: `docs/execution/ENVIRONMENT-MIGRATION-STATUS.md`):

- **`0115`** — Assessment Scoring Read Foundation: projeção determinística de
  score por response (scale-weighted, `formulaVersion = response-scale-weighted-v1`).
- **`0116`** — Security hotfix da autorização do scored result: o estado inválido
  `assessment_visibility = NULL` (response tenant-incoerente) passa a falhar
  fechado com `ASSESSMENT_RESULT_NOT_VISIBLE`, sem relaxar política válida.
- **`0117`** — Trusted Result Directory do avaliado (evaluatee), com `visibility`
  e `result_available`.
- **`0118`** — Trusted administrative **Person** Result directory + shared private
  scorer: `get_tenant_person_assessment_result_directory_v1` (owner/admin/hr;
  `direct_report` intencionalmente omitido até a política B2-C). Scoring extraído
  para `compute_assessment_scored_result_v1` — autoridade única, fechada a todas
  as roles de aplicação. SHA-256
  `cfc4935ebd2185f002f2561678fa3a864948921ad67cc87889de7319ea2a8089`.

Slices de aplicação da trilha:

- **B2-A** — Trusted Result Discovery (directory do avaliado).
- **B2-B1** — Comparação de resultados Self × Manager.
- **B2-B2-A** — Administrative Person Result directory (consumo do `0118`).
- **B2-B2-B** — People “Últimas avaliações” — **CLOSED / PASS**, commit
  `338efd5872a7f861c09fa5fe9815be23bfba846e` (`feat(people): add recent assessment results`).

Evidência de fechamento da B2-B2-B (sem superdeclaração de cobertura):

1. **Mandatory DoD gates — PASS**: `npm run build`, `npm run lint`,
   `npx tsc --noEmit`, focused 48/48, relevant regression 203/203, full 1347/1347,
   `git diff --check`.
2. **Canonical Review DB boundary (`0118`) — PASS**: matriz transacionada
   multi-role no Review (**27 assertions, 0 falhas, `ROLLBACK`, sem `COMMIT`**);
   parity de função/`prosrc`/ACL/`SECURITY DEFINER` PASS.
3. **Canonical Review application smoke — PASS no subset realmente executado**:
   owner autorizado (200 + contrato exato de 10 colunas + sem
   evaluator/answers/questions/comments/competencies/raw_score); non-member
   cross-tenant negado; seção “Últimas avaliações” visível; coexistência com o
   `EmployeeAssessmentsSummaryCard`; empty state exato; exatamente **1** directory
   RPC por Person; navegação/fallbacks seguros (sem open redirect); console limpo;
   cleanup PASS; git baseline preservado.
4. **Explicit runtime coverage debt — NÃO executada (não marcada como executada)**:
   render runtime in-tenant de Admin/HR e Manager/Employee por role específica;
   resultados quantitativos e qualitativos reais; CTA/return-context e deep-link
   `assessments-results` com `responseId` real. **Não bloqueia** o fechamento: a
   matriz multi-role está validada no boundary `0118` e os comportamentos de UI
   restantes têm cobertura determinística automatizada (formatação de score,
   `NULL → “Resultado qualitativo”`, CTA href, return-context/fallbacks,
   ordering/limit, no-leak, empty state).

Ambientes preservados: Production `gzrrwyiqfbnyprkdeqvm` — **UNKNOWN / REVERIFY
BEFORE USE**; Legacy `oudngmrdtgengilpqqnz` — **NOT A PROMOTION TARGET**.

Próximo passo normativo: **SLICE 0115-B2-C — Direct-Report Anonymity / Aggregation
Discovery (DISCOVERY ONLY)** (ver `NEXT_STEPS.md`). A trilha Career / Seniority
(PD-021/ADR-0017, Slice 1A) permanece planejada e **adiada**.

## 2026-08-19 — Governança — Career / Seniority + Position Taxonomy Implementation Plan

- **Implementation Plan versionado** (`docs/Execution/CAREER-SENIORITY-POSITION-TAXONOMY-IMPLEMENTATION-PLAN.md`,
  Approved): rollout additive → backfill → compatibility → cutover → deprecate,
  sem big-bang; slice map 1A Seniority Catalog (DB) · 1B Admin (UI) · 2A
  Position-Seniority Profiles + base backfill (DB) · 2B Cargo↔Senioridade (UI) ·
  3A People assignment + backfill (DB) · 3B Lotação UX · 4A Matrix relocation +
  backfill (DB) · 4B Matrix + escalas (UI) · 5 Assignments + Gap; gate separado de
  auditoria de unicidade de Cargo; follow-ups de Recruitment/Development/Succession;
  invariantes de data-safety (nenhum People perde Position, todo Cargo com base
  profile, matriz zero-loss);
- documentação apenas: nenhuma migration/código/schema; próximo passo executável =
  Slice 1A — Seniority Catalog Foundation (DB-first).

## 2026-08-19 — Governança — Career / Seniority + Position Taxonomy (PD-021 + ADR-0017)

- **PD-021 — Career / Seniority + Position Taxonomy: Approved** — define
  Departamento/Cargo/Senioridade/Nível hierárquico como eixos ortogonais,
  identidade de Cargo `(company, department, normalized title)`, catálogo de
  senioridade company-owned, `position_seniority_profiles` como âncora de
  aplicabilidade (base profile com senioridade NULL para cargos sem senioridade),
  lotação e matriz de competências referenciando o profile, Departamento derivado
  da Position, relocação forward-only de `expected_level`/`weight` para a matriz,
  escalas 1–5 de proficiência e de peso, movimentos de carreira como conceitos
  distintos, e o gate de auditoria de homônimos antes de qualquer unicidade;
- **ADR-0017 — Position-Seniority Profile as Career Assignment Boundary:
  Accepted** — registra a decisão arquitetural (profile surrogate tenant-safe como
  entidade de aplicabilidade Position × Seniority; matriz e People referenciando
  `profile_id`; FKs compostas por ADR-0012; alternativas rejeitadas);
- documentação apenas: nenhuma migration/código/schema alterado; próximo passo
  normativo = Implementation Plan da taxonomia (ordem de slices definida no plano).

## 2026-08-19 — MVP Closure — Competency Catalog trusted mutations e core smoke PASS (baseline `d5db5b3`)

- **Competency Catalog Core Mutation Boundary** (migration 0099, commit
  `d5db5b3`): create/update/archive de `competencies` por trusted boundaries
  `SECURITY DEFINER` (gate `owner/admin/hr`, ator de `auth.uid()`, tenant-scoped,
  sem grant de tabela, Activity atômica, create idempotente por `intentKey`
  derivada server-side, archive soft via `active=false`, assignments intactos),
  removendo o DML direto protegido do catálogo;
- Human Review dedicado PASS; pgTAP 43/43; full DB 1365/1365;
- **AUTHENTICATED CORE SMOKE = PASS**: Auth/Tenant, Departments,
  Positions/Cargos, People, Competency Catalog, Analytics e Recruitment (1 vaga
  OPEN + 1 DRAFT, indicador de vagas abertas correto, list/detail operando)
  validados na UI, sem `42501`/permission-denied/erro de servidor nas rotas core;
  os Human Reviews dedicados das transições de Recruitment permanecem válidos;
- o Human Review core deixa de estar suspenso; o percentual do MVP não é alterado
  neste registro (depende de decisão do Product Owner);
- backlog pós-smoke reconciliado no `PROJECT_STATE.md`; próxima entrega normativa:
  Product Decision de Career / Seniority + Position Taxonomy (`NEXT_STEPS.md`).

## 2026-08-19 — MVP Closure — Recruitment trusted mutations (baseline `c5a5451`)

- ciclo navegável de vaga migrado para trusted boundaries atômicas, com o Approval
  Framework event-sourced como autoridade e sem DML direto protegido nos write
  paths (migrations 0093–0098, commits `2ac18b8`, `cd65f40`, `9c3effd`,
  `2dd9794`, `c5a5451`);
- create (0093) persiste a vaga como rascunho; submit (0094) transiciona
  rascunho → aguardando aprovação persistindo o aggregate de aprovação; 0095
  habilita a timeline de `job_opening`; approve (0096) decide a aprovação com
  `expected_version` e transiciona para aprovada; open (0097) transiciona
  aprovada → aberta; reject (0098) decide a rejeição e devolve a vaga a rascunho
  preservando o histórico da approval request;
- timeline consolidada: Vaga criada, Vaga enviada para aprovação, Vaga aprovada,
  Vaga aberta e Vaga rejeitada; `StatCard` "Vagas abertas" de Recruitment derivado
  da source of truth segura;
- Human Review aprovado para o fluxo positivo (Rascunho → … → Aberta) e para o
  caminho negativo (Aguardando aprovação → Rejeitar → Rascunho);
- boundaries `SECURITY DEFINER`, `search_path` endurecido, ator de `auth.uid()`,
  gate `owner/admin/hr`, tenant-scoped, sem grant de tabela, RLS ou policy.

Remanescentes factuais de Recruitment (caminho legado `updateStatus`, Discovery
separada): transições `cancelled`, `closed`, `paused` e `filled`.

## 2026-08-19 — MVP Closure — People historical reads (PR J1) e Analytics safe reads

- PR J1 adiciona boundaries `SECURITY DEFINER` aditivas para leituras históricas
  de People (migrations 0090/0091, commits `49e9ddc`, `fe1e604`, `7b6a85a`):
  variantes `..._v2` que retornam todos os status de ciclo de vida (incluindo
  `terminated`) para as visões de gestão históricas (Desligados) e o detalhe de
  employee-competency do perfil, removendo reads diretos protegidos (42501);
- People Analytics safe reads (migration 0092, commit `96f9ddf`): o dashboard passa
  a obter vagas abertas e a contagem de aprovações pendentes por boundaries
  membership-gated, sem abrir SELECT direto em tabelas protegidas e sem derrubar a
  página no `Promise.all` all-or-nothing;
- mesma postura de segurança da 0085: ator de `auth.uid()`, gate de membership
  ativa, sem grant de tabela, RLS ou policy; Human Review global permanece
  suspenso e o MVP na baseline de 98%.

## 2026-08-09 — MVP-PR1 Phase 4 — Complete by Prior Delivery

- Phase 4 formalmente encerrada sem implementação adicional e sem execução como
  fase autônoma;
- contracts, port, Application Service, adapter Supabase autenticado, Composition
  Root server-only e testes já haviam sido entregues de forma controlada durante
  a Phase 3 para validar a Trusted Persistence ponta a ponta;
- nenhuma segunda Application Layer é necessária ou autorizada;
- consumers permanecem nas fases funcionais: token/delivery/Actions na Phase 5,
  acceptance/Auth na Phase 6 e resolver/preference/switch na Phase 7;
- nenhuma funcionalidade da Phase 5 foi iniciada por este fechamento.

Próximo gate: obter autorização explícita para a Phase 5 após confirmar token
lifecycle, provider, secrets, remetente, URL/redirect e política mínima de
timeout/retry/idempotência da entrega.

## 2026-08-09 — MVP-PR1 Phase 3 — Trusted Persistence

- Phase 3 concluída e incorporada à `main` pelo merge `3559a9b`, incluindo os
  commits `80973f9`, `948999a` e `69ed8cd`;
- migration 0074 aplicada ao projeto Supabase canônico, com Local/Remote
  alinhados e sete RPCs v1 estreitas para convite, aceite, role, desativação e
  transferência de ownership;
- autoridade humana derivada exclusivamente de `auth.uid()`, sem `actorUserId`
  confiado ao client e sem `service_role` no caminho funcional;
- RPCs `SECURITY DEFINER`, `search_path = public, pg_temp`, owner PostgreSQL e
  `EXECUTE` somente para `authenticated`; `anon`, `service_role` e `PUBLIC` sem
  `EXECUTE`;
- idempotência, fingerprint, auditoria, owner invitation, ownership e locks
  determinísticos preservados na fronteira transacional;
- serviço mínimo de aplicação, port, adapter Supabase autenticado e Composition
  Root server-only incorporados sem consumidor funcional;
- fresh reset `0001`–`0074`, pgTAP local 362/362, Tenant Access 50/50, testes
  TypeScript Tenant Access 8/8, regressões relevantes 18/18, DB lint local,
  TypeScript, lint, build e quatro cenários reais de concorrência aprovados;
- deadlock encontrado durante o desenvolvimento eliminado pela ordem uniforme
  de locks; quatro warnings de lint preexistentes permaneceram fora do escopo;
- pgTAP/lint remoto completo permanece limitado pelo schema `extensions` e pela
  role `cli_login_postgres`, sem erro identificado nas RPCs da 0074 e sem grant
  permanente para contornar o runner.

Próximo gate: revisar o escopo residual da Phase 4 — Application Layer — e obter
aprovação explícita do Product Architect. A Phase 4 não foi iniciada.

## 2026-08-09 — Supabase canônico e readiness da Phase 3 do MVP-PR1

- Phases 1 e 2 do MVP-PR1 incorporadas; migrations 0070–0072 materializam a
  Persistence Foundation e os Persistent Invariants;
- novo projeto Supabase canônico reconstruído vazio exclusivamente pela cadeia
  oficial `0001`–`0073`, com migration history Local/Remote alinhado;
- projeto Supabase antigo divergente deixou de ser autoridade canônica;
- hardening forward-only da migration 0073 incorporado em `f77b229`:
  `save_approval_request` usa `extensions.digest(...)` e o harness pgTAP resolve
  extensões deterministicamente;
- fresh reset local e pgTAP local 312/312 aprovados; validação remota direcionada
  da 0073 aprovada;
- pgTAP remoto completo inconclusivo por privilégios de
  `cli_login_postgres`, sem regressão confirmada e sem concessão permanente;
- readiness review da Phase 3 concluída: tecnicamente pronta, não iniciada e
  dependente de autorização explícita do Product Architect.

Próximo gate: aprovação explícita para iniciar a Phase 3. Nenhuma implementação
da Phase 3 foi incorporada por esta entrada.

## 2026-08-08 — Encerramento histórico da PR 3C

- validação final aprovada e incorporada no merge `5c2675b`;
- PR 3C concluída sem remoção automática dos contratos legados;
- esta entrega deixa de ser o gate ativo; seu histórico permanece nas entradas
  abaixo.

## 2026-08-08 — PR 3C Fase 7 — Testes, observabilidade e cutover V2

- cutover do caminho oficial para readiness, confirmação explícita e contrato V2
  implementado em `529be29`;
- UI → Application Layer → Resolver → Trusted Persistence validado sem fallback
  legado no caminho oficial;
- smoke, regressão, observabilidade, TypeScript e pgTAP comprovaram readiness,
  criação, replay idempotente, conflito de fingerprint e bloqueio sem escrita;
- implementação aprovada e incorporada à `main` pelo merge `95625d4`;
- compatibilidade legada preservada separadamente por falta de evidência sobre
  consumidores externos.

Próximo gate: concluir a validação final da Fase 8 e obter aprovação explícita do
Product Architect antes de declarar a PR 3C encerrada.

## 2026-08-08 — PR 3C Fase 6 — Actions e experiência mínima

Registro histórico do estado anterior ao merge `95625d4`; o estado vigente está
na entrada acima.

- readiness sem persistência, confirmação humana explícita e identidade estável
  de retry implementados em `3cc8c38`;
- fluxo UI → readiness → confirmação → V2 → Application Layer → Resolver →
  Trusted Persistence validado;
- implementação aprovada e incorporada à `main` pelo merge `ca2f173`;
- Fases 1–6 da PR 3C incorporadas; Fase 7 autorizada e ativa; Fase 8 não iniciada.

Próximo gate: concluir testes, observabilidade e cutover da Fase 7 e submetê-los à
revisão do Product Architect antes de qualquer Fase 8.

## 2026-08-08 — PR 3C Fase 5 — Contrato retrocompatível

Registro histórico do estado anterior ao merge `ca2f173`; o estado vigente está
na entrada acima.

- superfície V2 aditiva e adapter legado implementados em `e5bae39`;
- wrapper TS legado migrado para a Application Layer sem remover a RPC pública,
  alterar a Server Action ou iniciar UI e cutover final;
- identidade, idempotência, códigos de erro, fingerprint, snapshot e lineage
  preservados pelo fluxo aprovado;
- implementação validada, aprovada e incorporada à `main` pelo merge `08bd7cf`;
- Fases 1–5 da PR 3C agora estão incorporadas;
- a PR 3C permanece em andamento porque as Fases 6–8 não foram iniciadas;
- esta entrega não autoriza automaticamente o início de fase posterior.

Próximo gate: obter aprovação explícita para iniciar a Fase 6 — Actions e
experiência mínima: readiness, confirmação, retry e mensagens — conforme o
Implementation Plan.

## 2026-08-08 — PR 3C Fase 4 — Application Layer e composição

Registro histórico do estado anterior ao merge `08bd7cf`; o estado vigente está
na entrada acima.

- Application Layer, ports, repository de resolução, Server Factory e
  Composition Root implementados em `a393226`;
- fluxo intenção → Resolver determinístico → Trusted Persistence composto sem
  duplicar regra de domínio ou escrita transacional;
- implementação validada, aprovada e incorporada à `main` pelo merge `5c1d12f`;
- Fases 1–4 da PR 3C agora estão incorporadas;
- a PR 3C permanece em andamento porque as Fases 5–8 não foram iniciadas;
- esta entrega não autoriza automaticamente o início de fase posterior.

Próximo gate: obter aprovação explícita para iniciar a Fase 5 — contrato
retrocompatível — conforme o Implementation Plan.

## 2026-08-08 — PR 3C Fase 3 — Trusted Persistence

Registro histórico do estado anterior ao merge `5c1d12f`; o estado vigente está
na entrada acima.

- Trusted Persistence revisada, validada e incorporada à `main` no merge
  `fe08394`;
- migration 0069, adapter server-only e testes de atomicidade, idempotência,
  concorrência, snapshot, lineage, auditoria e grants incorporados;
- Fases 1, 2 e 3 da PR 3C agora estão incorporadas;
- a PR 3C permanece em andamento porque as Fases 4–8 não foram iniciadas;
- esta entrega não autoriza automaticamente o início de fase posterior.

Próximo gate: obter aprovação explícita para iniciar a Fase 4 — Application Layer
e composição — conforme o Implementation Plan.

## 2026-08-08 — Estado parcial da implementação da PR 3C

Registro histórico do estado anterior ao merge `fe08394`; o estado vigente está
na entrada acima.

- Fase 1 — Infrastructure incorporada à `main` em `53b12ec`, incluindo a
  migration 0068 e os testes correspondentes;
- Fase 2 — Deterministic Resolver incorporada à `main` em `ed15eca`, incluindo os
  testes determinísticos correspondentes;
- contrato de snapshot e responsabilidades da Trusted Persistence esclarecidos
  documentalmente em `7b70d3d`;
- a PR 3C permanece parcial e não concluída;
- a primeira implementação da Fase 3 — Trusted Persistence — existe somente no
  commit local `227a206`, não publicado, não validado completamente e não
  aprovado para incorporação; por não estar na `main`, ela não é registrada como
  entrega incorporada por este changelog;
- fases posteriores não foram iniciadas.

Próximo gate: revisar e validar `227a206`; depois, obter aprovação explícita antes
de incorporar ou publicar a Fase 3.

## 2026-08-02 — Arquitetura da aplicação determinística de Development Templates

- Discovery da PR 3C concluída e aprovada;
- ADR-0014 aceita com identidade de aplicação, versionamento imutável, resolução
  determinística, snapshots, lineage, idempotência e Trusted Persistence;
- Implementation Plan aprovado e Implementation Readiness Review concluído sem
  lacuna técnica ou arquitetural conhecida;
- documentação reconciliada para tornar a autorização explícita da implementação
  o próximo gate;
- naquele gate documental, nenhuma implementação da PR 3C havia sido iniciada;
  o estado posterior está registrado na entrada de 2026-08-08.

Decisão: ADR-0014.

## 2026-08-02 — Global Concepts and Tenant Mappings

- catálogo global versionado de conceitos e aliases com publicação imutável;
- autoridade global capability-based, delegações revogáveis e trusted execution;
- Tenant Mappings confirmados por papéis humanos autorizados e auditados;
- Development Template Goals preparados para caminhos global e company-owned;
- RLS, integridade física, preflight e fronteiras server-only implementados;
- aplicação de templates e Application Snapshots permanecem inalterados.

Migration: 0067. Decisões: PD-018, ADR-0012 e ADR-0013.

## 2026-08-02 — Autoridade global e execução técnica confiável

- autoridade humana global vinculada a `auth.users`;
- delegações capability-based explícitas, revogáveis e auditáveis;
- papéis tenant-owned separados da autoridade da plataforma;
- `service_role` definido exclusivamente como executor técnico;
- escrita global restrita à fronteira server-only com auditoria atômica.

Decisão: ADR-0013.

## 2026-08-02 — Integridade tenant-owned do Development operacional

- PR 3A do terceiro slice da ADR-0012 aplicado exclusivamente a
  `development_plans`, `development_goals` e `development_actions`;
- cinco relações convertidas para FKs compostas e três candidate keys
  tenant-owned adicionadas;
- joins técnicos dos triggers de planos fechados passaram a validar o tenant;
- preflight read-only e pgTAP cobrem isolamento, nulabilidade, `CASCADE`,
  `RESTRICT`, service role, triggers e regressão de RLS;
- semânticas funcionais, RLS e contratos públicos preservados.

Migration: 0066.

## 2026-08-02 — Global Competency Concepts and Tenant Mapping

- PD-018 aprovada como política funcional para competências em templates globais
  de Development;
- conceitos globais separados das competências operacionais tenant-owned;
- resolução por Tenant Mapping humano e determinístico;
- Application Snapshot definido como garantia de rastreabilidade histórica;
- IA limitada a sugestões, sem autoridade para confirmar mappings.

Decisão: PD-018.

## 2026-08-02 — Integridade tenant-owned de Recruitment

- segundo slice da ADR-0012 aplicado exclusivamente a
  `recruitment_job_openings`;
- seis relações com People, Departments e Positions convertidas para FKs
  compostas usando as candidate keys existentes;
- preflight read-only, constraints validadas e cobertura pgTAP para isolamento,
  nulabilidade, `RESTRICT`, `SET NULL`, service role e regressão de RLS;
- optionalidade, RLS e comportamento funcional preservados.

Migration: 0065.

## 2026-08-02 — Integridade tenant-owned do núcleo organizacional

- primeira fatia da ADR-0012 aplicada a Organization, People e Competencies;
- candidate keys `unique (id, company_id)` em People, Departments, Teams,
  Positions e Competencies;
- 14 relações convertidas para FKs compostas, incluindo manager, hierarquias de
  Department e Team, vínculos de Position e associações de competências;
- preflight read-only, constraints validadas e cobertura pgTAP adversarial;
- optionalidade e semânticas existentes de `CASCADE` e `SET NULL` preservadas.

Migration: 0064.

## 2026-08-02 — Notification Domain in-app

- política completa de identidade, produção, resolução, visibilidade,
  administração, preferências e retenção;
- arquitetura Producer → Event → Resolver → Delivery Policy → Persistence → Read
  Model;
- catálogo inicial in-app e limites explícitos para canais futuros;
- persistência confiável, idempotência, self access, preferências e operações
  administrativas sobre metadados com auditoria;
- recipient directory reconciliado com `people` e integridade local protegida por
  FKs e validação cross-tenant.

Decisões: PD-017 e ADR-0011.

## 2026-08-01 — Autorização de Assessments

- política de produto para evaluator, evaluatee e papéis administrativos;
- arquitetura de defesa em profundidade entre Application Layer e RLS;
- visibilidade configurável do avaliado e auditoria de leituras administrativas.
- policies evaluator-only para respostas brutas;
- Secure Administrative Read Pattern e RPCs protegidas;
- testes unitários e suíte pgTAP adversarial.

Decisões: PD-016 e ADR-0010.

Limitações conhecidas naquele gate histórico:

- a suíte TypeScript completa não carrega
  `create-employee-intelligence.test.ts` no runner `tsx`, porque o barrel de
  People alcança um módulo marcado com `server-only`;
- `supabase db lint --local` reportava em `save_approval_request`, criada pela
  migration 0046, a resolução inválida de `digest(text, unknown)`; essa limitação
  foi corrigida posteriormente pela migration 0073, registrada na entrada de
  2026-08-09.

## 2026-08-01 — Executive Decision Center e Financeiro Executivo

- Executive Context e Decision Feed agregável;
- integrações de Planning, Recruitment, Development, Assessments, Feedback,
  People, Organization e Financeiro;
- consulta e painel financeiro executivo em fundação;
- provider registry do Decision Feed.

PRs principais: #59–#76.

## 2026-07-30 — KPI Platform

- KPI Engine, registry e avaliação;
- persistência e histórico;
- execução durável, recovery, worker runtime, scheduler e triggers;
- adapters operacionais e dashboard executivo.

PRs principais: #46–#57.

## 2026-07-29 — Organization Planning

- composição server, UI e actions;
- snapshot hydration, change sets e publicação transacional;
- projeções de organização, pessoas e vagas;
- comparação, insights, dashboard, timeline, branching e workflow de publicação;
- autorização e isolamento do planejamento.

PRs principais: #15–#45.

## 2026-07-28 — Workspaces e Engenharia

- workspace do colaborador, HR Command Center e Feedback Workspace;
- composição executiva de workforce;
- Engineering Foundation e protocolo de colaboração.

PRs principais: #6 e #10–#14.

## Fundação inicial

- autenticação e empresas;
- organização, pessoas e competências;
- avaliações, feedback e desenvolvimento;
- recruitment e approval;
- analytics, activity, timeline, notificações e Copilot.

Entregas incorporadas antes e durante o início do histórico numerado de PRs.
