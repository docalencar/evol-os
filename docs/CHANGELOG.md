# Evol OS — Changelog

Este changelog registra somente grandes entregas incorporadas à `main`. Commits
locais e branches abertas não entram aqui.

## 2026-08-02 — Arquitetura da aplicação determinística de Development Templates

- Discovery da PR 3C concluída e aprovada;
- ADR-0014 aceita com identidade de aplicação, versionamento imutável, resolução
  determinística, snapshots, lineage, idempotência e Trusted Persistence;
- documentação reconciliada para tornar a atualização do Implementation Plan o
  próximo gate;
- nenhuma implementação da PR 3C iniciada.

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

Limitações conhecidas, anteriores a esta entrega:

- a suíte TypeScript completa não carrega
  `create-employee-intelligence.test.ts` no runner `tsx`, porque o barrel de
  People alcança um módulo marcado com `server-only`;
- `supabase db lint --local` reporta em `save_approval_request`, criada pela
  migration 0046, a resolução inválida de `digest(text, unknown)`.

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
