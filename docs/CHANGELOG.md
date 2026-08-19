# Evol OS — Changelog

Este changelog registra somente grandes entregas incorporadas à `main`. Commits
locais e branches abertas não entram aqui.

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
