# Evol OS — Épicos do Produto

## Estados

- **Concluído** — a capacidade descrita está incorporada à `main`.
- **Parcial** — existe uma fundação utilizável, mas permanecem jornadas explícitas.
- **Planejado** — não há implementação suficiente para considerar a capacidade disponível.
- **Absorvido** — o objetivo foi entregue por uma capacidade posterior e não exige trabalho próprio.
- **Cancelado** — deixou de fazer parte da direção do produto.

Este documento detalha o estado das capacidades. A ordem de execução pertence ao
`ROADMAP.md`; a fila operacional pertence ao `NEXT_STEPS.md`.

## Épico 1 — Organização e Pessoas

**Estado: Parcial**

Concluído:

- autenticação, empresa, contexto e isolamento por tenant;
- CRUD e workspaces de pessoas, departamentos, times e cargos;
- competências de cargos e colaboradores;
- importação e sincronização organizacional;
- estrutura profissional do cargo, incluindo departamento, jornada, modalidade,
  regime contratual e exigência de viagens.

Planejado:

- faixa salarial;
- responsabilidades e perfil ideal do cargo;
- trilha de carreira;
- organograma avançado.

Dependências: é a base para Planning, KPI, Talent Intelligence e Executive.

## Épico 2 — Avaliações e Performance

**Estado: Parcial**

Concluído:

- home de avaliações;
- templates, seções e perguntas;
- wizard de ciclos;
- participantes, execução e respostas;
- resultados e estatísticas do ciclo;
- integração com analytics e Executive Decision Feed.

Planejado:

- acompanhamento operacional em tempo real;
- OKRs.

Dependências: pessoas e organização. Alimenta desenvolvimento, talentos e
decisões executivas.

## Épico 3 — Feedback e Liderança

**Estado: Parcial**

Concluído:

- registro e histórico de feedbacks;
- experiência de conversa;
- análise estruturada por IA;
- integração com Executive Decision Feed;
- tipos de feedback para check-in e one-on-one.

Planejado:

- solicitação dedicada de feedback;
- workspace próprio de one-on-one;
- jornada acompanhável de check-ins;
- reconhecimentos;
- plano de ação e desenvolvimento da liderança.

Dependências: pessoas, timeline e notificações.

## Épico 4 — Desenvolvimento

**Estado: Concluído na fundação**

Concluído:

- dashboard de desenvolvimento;
- planos individuais e ações;
- templates reutilizáveis;
- aplicação transacional de templates;
- acompanhamento de estado e recomendações contextuais;
- integração com analytics e Executive Decision Feed.

Evoluções futuras dependem das prioridades de Talent Intelligence e Liderança.

## Épico 5 — Recrutamento e Aprovações

**Estado: Concluído na fundação**

Concluído:

- workspace e wizard de vagas;
- persistência e ciclo de status da vaga;
- detalhes e timeline de atividade;
- domínio, aplicação, persistência e outbox de Approval;
- integração da aprovação com recrutamento;
- integração com Executive Decision Feed.

## Épico 6 — Organization Planning

**Estado: Concluído**

Concluído:

- workspaces, cenários, snapshots e change sets;
- baseline e projeção determinística da organização;
- mudanças de departamentos, times, cargos, pessoas e vagas;
- comparação, insights e apresentação;
- dashboard, timeline, branching e operações de cenário;
- validação e publicação transacional;
- dashboard e experiência executiva;
- autorização e isolamento.

Dependências: organização e pessoas. Sustenta KPI, Financeiro Executivo e
Executive Decision Feed.

## Épico 7 — KPI e Inteligência Executiva

**Estado: Concluído na fundação**

Concluído:

- KPI Engine determinístico;
- registry, avaliação, SLA, tendências, benchmark e forecast;
- persistência e histórico;
- execução durável, recovery, worker, scheduler e triggers;
- adapters operacionais;
- dashboard executivo de KPIs;
- Executive Context e Decision Feed agregável;
- providers de planejamento, recrutamento, desenvolvimento, avaliações,
  feedback, pessoas, organização e financeiro;
- fundação do painel e da consulta financeira executiva.

Planejado:

- ampliar projeções financeiras após a disponibilidade dos dados de custo;
- adicionar KPIs somente quando houver pergunta de negócio e fonte de dados reais.

## Épico 8 — Talent Intelligence

**Estado: Parcial**

Concluído:

- gaps de competências;
- insights de pessoas;
- visão agregada de prontidão para promoção;
- recomendações contextuais existentes em pessoas e desenvolvimento.

Planejado:

- risco de desligamento determinístico;
- Nine Box;
- sucessão;
- Talent Review;
- recomendações explicativas sobre essas engines.

Dependências: pessoas, competências, avaliações e desenvolvimento.

## Épico 9 — Copilot e IA

**Estado: Parcial**

Concluído:

- providers e services de IA;
- copilots contextuais;
- skills e prompts por contexto;
- conversas persistentes;
- uso de IA em feedback e desenvolvimento.

Planejado:

- predições baseadas em sinais determinísticos;
- benchmark organizacional interno;
- expansão de recomendações estratégicas.

Dependências: engines e contratos determinísticos dos demais épicos.

## Épico 10 — Enterprise

**Estado: Planejado**

- API pública;
- integrações externas;
- white label;
- marketplace.

Auditoria básica já é atendida por activities, timelines, histórico de execução e
eventos de domínio; uma capacidade enterprise de auditoria só deve ser criada
quando houver requisitos adicionais comprovados.

## Trabalho absorvido

- PR-079A — absorvida pela organização atual do `PositionForm`;
- PR-079B — absorvida pela estrutura profissional de cargos já incorporada;
- PR-080 — absorvida pela Engineering Foundation e pelo sistema de colaboração;
- antigas entregas genéricas de dashboard, avaliações, feedback e analytics —
  absorvidas pelos épicos e implementações descritos acima.

Não há épicos cancelados registrados na direção atual.
