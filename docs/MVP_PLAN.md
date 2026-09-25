# Evol OS — Plano do MVP

## Objetivo

Entregar um Organization Operating System utilizável e confiável, no qual uma
empresa organiza pessoas e estrutura, executa jornadas de performance e
desenvolvimento, planeja mudanças organizacionais e recebe inteligência que apoia
decisões humanas.

## Estados

- **Concluída** — critérios da capacidade estão incorporados à `main`.
- **Parcial** — existe fundação utilizável, mas falta critério necessário ao MVP.
- **Bloqueada** — a expansão depende de correção de integridade ou segurança.
- **Futura** — está fora do gate atual do MVP.

## Capacidades

### Fundação

- **Objetivo:** autenticação, tenant, persistência reproduzível, autorização e
  operação segura dos dados.
- **Status:** Bloqueada.
- **Dependências:** nenhuma.
- **Critérios de conclusão:** migrations reproduzem o schema; isolamento entre
  empresas é testado; dados sensíveis têm matriz de acesso e RLS; CI e validação
  local executam os gates documentados.
- **Documentação:** `CLAUDE.md`, `docs/engineering/`,
  `HCOS_DOMAIN_AUDIT.md`, `docs/Database/database_blueprint.md`, PD-016,
  ADR-0010, PD-017, ADR-0011, ADR-0012,
  `docs/Architecture/patterns/tenant-owned-referential-integrity.md` e
  `docs/domain/NOTIFICATION_DOMAIN.md`.
- **PRs relacionadas:** #6 e #45; hardening de Assessments pela migration 0062;
  hardening de Notifications pela migration 0063; primeiro slice da ADR-0012
  implementado pela migration 0064 no commit `7271f49`; integridade relacional
  dos domínios consumidores ainda pendente.

### Organização

- **Objetivo:** representar departamentos, times, cargos e relações estruturais.
- **Status:** Parcial.
- **Dependências:** Fundação.
- **Critérios de conclusão:** CRUDs e workspaces funcionais; invariantes e
  relações company-owned protegidas; histórico preservado; estrutura apta a
  alimentar Planning.
- **Documentação:** `docs/Architecture/domain.md`, ADR-0001, ADR-0004 e
  `docs/Architecture/organization-sync-engine.md`.
- **PRs relacionadas:** #13–#18 e entregas anteriores de organização.

### Pessoas

- **Objetivo:** manter cadastro, perfil, vínculos organizacionais, importação e
  contexto do colaborador.
- **Status:** Parcial.
- **Dependências:** Fundação e Organização.
- **Critérios de conclusão:** cadastro e workspace funcionais; identidade e
  vínculos consistentes dentro do tenant; importação revisável; acesso aos dados
  pessoais protegido.
- **Documentação:** `docs/Product/USER_JOURNEYS.md`,
  `docs/Architecture/organization-sync-engine.md` e ADR-001.
- **PRs relacionadas:** #10, #14 e entregas anteriores de pessoas/importação.

### Cargos

- **Objetivo:** representar a função organizacional e seus requisitos.
- **Status:** Parcial.
- **Dependências:** Organização.
- **Critérios de conclusão:** estrutura profissional atual preservada; faixa
  salarial, responsabilidades, perfil ideal e progressão modelados quando o gate
  de Fundação estiver concluído.
- **Documentação:** ADR-0002, ADR-0005 e `docs/EPICS.md`.
- **PRs relacionadas:** PR-078, PR-079A e PR-079B, absorvidas na `main`.

### Competências

- **Objetivo:** representar competências esperadas por cargo e atuais por pessoa.
- **Status:** Parcial.
- **Dependências:** Fundação, Pessoas e Cargos.
- **Critérios de conclusão:** catálogo e relações funcionais; isolamento tenant;
  gaps determinísticos e reutilizáveis por Desenvolvimento e Talentos.
- **Documentação:** ADR-0001, ADR-0002 e `docs/domain/PERFORMANCE_DOMAIN.md`.
- **PRs relacionadas:** entregas anteriores ao histórico numerado de PRs.

### Avaliações

- **Objetivo:** criar ciclos, coletar respostas e produzir resultados de
  performance com acesso seguro.
- **Status:** Parcial; subordinada ao gate de Fundação.
- **Dependências:** Fundação, Pessoas e Competências.
- **Critérios de conclusão:** templates, ciclos, participantes, execução e
  resultados funcionais; autorização por ator; visibilidade e eventual anonimato
  definidos e testados.
- **Documentação:** ADR-0006, ADR-0010, PD-016,
  `docs/experiences/assessments.md` e `docs/domain/PERFORMANCE_DOMAIN.md`.
- **PRs relacionadas:** fundação histórica, integrações executivas #66 e
  hardening de autorização pela migration 0062.
- **Evidência hosted:** E2E-4 `CLOSED / PASS`; ciclo completo de avaliação
  provado em Review. E2E-5 reutilizou uma resposta manager-perspective finalizada
  e comprovou novamente essa precondição no run final.

### Feedback

- **Objetivo:** registrar conversas e transformar observações em desenvolvimento.
- **Status:** Parcial.
- **Dependências:** Fundação e Pessoas.
- **Critérios de conclusão:** registro, histórico e conversa funcionais; acesso a
  conteúdo sensível protegido; integração com Desenvolvimento e timeline.
- **Documentação:** `docs/Product/USER_JOURNEYS.md`,
  `docs/Product/RH_BEST_PRACTICES.md` e `docs/EPICS.md`.
- **PRs relacionadas:** #12, #67 e entregas anteriores de Feedback.
- **Evidência hosted:** E2E-5 `CLOSED / PASS`, run
  `260916024159-e593c0`, 62/62 PASS e contrato 24/24 provado. Esse gate fecha o
  recorte formal de Feedback originado em avaliação; capacidades deferidas não
  transformam a capacidade inteira em `Concluída`.

### Desenvolvimento

- **Objetivo:** transformar gaps e feedback em planos e ações acompanháveis.
- **Status:** Parcial.
- **Dependências:** Pessoas, Competências, Avaliações e Feedback.
- **Critérios de conclusão:** planos, objetivos, ações e templates funcionais;
  acesso protegido; acompanhamento periódico; recomendações apenas sobre dados
  autorizados.
- **Documentação:** ADR-0002, ADR-0003, PD-018 e
  `docs/Product/RH_BEST_PRACTICES.md`; contrato D-P0 em
  `docs/Execution/D-P0-DEVELOPMENT-PRIVACY-ACTORS-LIFECYCLE-CONTRACT.md`.
- **PRs relacionadas:** #65 e entregas históricas do módulo Development.
- **Readiness de jornada:** contrato de produto, privacy, atores e lifecycle
  congelado pelo D-P0; fronteiras de DB e cutover de produto entregues por
  D-DB1/D-DB2, D-SEC1, D-P3 e D-P4A/D-P4B. O contrato hosted está congelado em
  D-E2E0 e a jornada foi **provada em Review como `E2E-6`** — ver
  `Execution/E2E-6-DEVELOPMENT-JOURNEY-CLOSURE.md`.

### Planejamento Organizacional

- **Objetivo:** avaliar cenários sem alterar o estado operacional durante a
  análise e publicar snapshots reproduzíveis.
- **Status:** Concluída na fundação; depende do gate de Fundação para uso seguro.
- **Dependências:** Fundação, Organização e Pessoas.
- **Critérios de conclusão:** baseline, change sets, projeção, comparação,
  insights, timeline, branching e publicação determinísticos e persistidos.
- **Documentação:** `docs/Architecture/organization-planning.md` e ADRs 0007–0009.
- **PRs relacionadas:** #19–#45 e #72–#73.
- **Evidência hosted operacional:** PLN-P6 `CLOSED / PASS`; run
  `260924115952-39d810`, `main`
  `71c0df749d92ad64a34349774a41b6dae3d3bd7e`, 9/9 testes e passos 1–19
  PASS sem retry. Ver
  `Execution/PLN-P6-HOSTED-PLANNING-JOURNEY-CLOSURE.md`. Esse fechamento não
  declara concluídas as capacidades restantes de RH Estratégico.

### Executive

- **Objetivo:** consolidar contexto, prioridades e sinais para decisão executiva.
- **Status:** Parcial.
- **Dependências:** domínios operacionais, Planning e KPI.
- **Critérios de conclusão:** contexto explícito; dashboard e Decision Feed
  compostos por contratos públicos; falhas parciais representadas; nenhum dado
  inventado; acesso respeita autorização dos domínios de origem.
- **Documentação:** README local de Executive Context, KPI Dashboard e
  `docs/EPICS.md`.
- **PRs relacionadas:** #57 e #59–#76.

### KPI

- **Objetivo:** calcular, persistir e operar indicadores determinísticos.
- **Status:** Concluída na fundação.
- **Dependências:** Fundação e fontes dos módulos proprietários.
- **Critérios de conclusão:** registry, avaliação, histórico, execução durável,
  recovery, worker, scheduler e adapters operacionais; KPIs reais permanecem
  responsabilidade dos módulos.
- **Documentação:** `apps/web/src/features/kpi-engine/README.md` e README local do
  KPI Dashboard.
- **PRs relacionadas:** #46–#57.

### Financeiro

- **Objetivo:** explicar impacto financeiro de cenários organizacionais.
- **Status:** Parcial.
- **Dependências:** Fundação, Cargos, Planning e KPI.
- **Critérios de conclusão:** fonte de custo aprovada; consulta determinística;
  painel e feed sem estimativas inventadas; isolamento e autorização.
- **Documentação:** `docs/EPICS.md` e contratos locais de Financeiro Executivo.
- **PRs relacionadas:** #70–#75.

### Analytics

- **Objetivo:** transformar dados dos domínios em métricas e leituras acionáveis.
- **Status:** Parcial.
- **Dependências:** Fundação e contratos canônicos dos módulos.
- **Critérios de conclusão:** métricas com definição e fonte documentadas;
  cálculos fora da UI; sem fontes paralelas; dashboards com estados completos.
- **Documentação:** playbook de dashboards e `docs/EPICS.md`.
- **PRs relacionadas:** #1, #2, #13 e entregas analíticas posteriores.

### IA

- **Objetivo:** explicar, resumir, sugerir e ensinar sobre resultados
  determinísticos sem tomar decisões humanas.
- **Status:** Parcial.
- **Dependências:** Fundação, autorização e engines dos domínios.
- **Critérios de conclusão:** contexto autorizado; transparência; confirmação
  humana; rastreabilidade; degradação segura; nenhuma engine substituída por IA.
- **Documentação:** `docs/Product/IA_PHILOSOPHY.md`, PD-002, PD-009 e ADR-0009.
- **PRs relacionadas:** entregas de Copilot e integrações contextuais anteriores.

### Enterprise

- **Objetivo:** oferecer extensibilidade e operação para organizações maiores.
- **Status:** Futura, fora do MVP atual.
- **Dependências:** conclusão de todas as capacidades necessárias ao MVP.
- **Critérios de conclusão:** serão definidos somente quando a capacidade entrar
  no roadmap.
- **Documentação:** `docs/Product/PRODUCT_VISION.md` e `docs/EPICS.md`.
- **PR responsável:** nenhuma.

## Gate do MVP

O MVP só pode ser declarado pronto quando nenhuma capacidade necessária estiver
Bloqueada, os critérios de Fundação forem comprovados e as jornadas de
implantação, avaliação, feedback, desenvolvimento, liderança e decisão executiva
puderem ser executadas com autorização e persistência confiáveis.

### Evidência atual de jornadas completas

| Gate | Jornada comprovada | Estado |
| --- | --- | --- |
| E2E-0/1 | Harness de Review e lifecycle de falha | CLOSED / PASS |
| E2E-2 | Implantação estrutural: Organização e Pessoas | CLOSED / PASS |
| E2E-3 | Career, Seniority, Competencies e gap canônico | CLOSED / PASS |
| E2E-4 | Primeiro ciclo completo de Avaliação | CLOSED / PASS |
| E2E-5 | Feedback formal de avaliação | CLOSED / PASS — 24/24 PROVEN |
| E2E-6 | Jornada de Desenvolvimento ponta a ponta | CLOSED / PASS — 29/29 PROVEN |
| PLN-P6 | Jornada operacional de Organization Planning | CLOSED / PASS — passos 1–19 HOSTED-PROVEN |
| L-P1/L-DB1/L-P2 | Contrato, trusted read boundary e cutover de Liderança | CLOSED / PASS — hosted E2E ainda não congelado nem executado |

Desenvolvimento e a jornada operacional de Planning estão comprovados em Review.
**Planning não equivale à Jornada 6**: turnover, clima, desempenho agregado,
potencial, sucessão e planos estratégicos permanecem abertos. **Liderança
(Jornada 5)** possui contrato, boundary e produto publicados, mas ainda depende
do freeze e da execução hosted para ser comprovada. Decisão executiva e o restante
de RH Estratégico continuam não comprovados.
