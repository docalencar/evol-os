# Evol OS — Épicos funcionais

Este documento detalha o comportamento funcional das capacidades. Não define
prioridade (`ROADMAP.md`), plano completo (`MVP_PLAN.md`) nem próxima entrega
(`NEXT_STEPS.md`).

## Fundação e Governança de Dados — bloqueado

Entrega uma base reproduzível e segura para todos os módulos.

- migrations são a definição versionada do banco;
- relações entre entidades preservam o tenant;
- dados sensíveis possuem matriz de acesso, RLS e validação na aplicação;
- atividades, notificações e outbox são rastreáveis e idempotentes;
- validações automatizadas comprovam os contratos.

Pendências comprovadas: autorização de Assessments, policies de Notifications,
recipient directory e integridade relacional entre tenants.

## Organização e Pessoas — parcial

Entrega implantação da empresa, estrutura, cadastros, workspaces, importação e
sincronização revisável.

Concluído: departamentos, times, cargos, pessoas, competências, perfis,
workspaces, importação e Sync Engine.

Restante: hardening das invariantes e enriquecimento de cargos após o gate de
Fundação.

## Avaliações e Performance — bloqueado

Entrega templates, ciclos, participantes, execução, respostas, resultados e
estatísticas.

A jornada funcional existe, mas a capacidade não pode ser concluída enquanto o
acesso a responses e answers depender apenas de membership da empresa.

## Feedback e Liderança — parcial

Entrega registro, histórico, conversas, análise estruturada e integração com
decisões executivas.

Restante: autorização explícita de conteúdo sensível e jornadas próprias de
one-on-one, check-ins, reconhecimentos e planos de ação.

## Desenvolvimento — parcial

Entrega planos, objetivos, ações, templates, acompanhamento de estado e
recomendações contextuais.

Restante: comprovar autorização e fechar a jornada periódica com Feedback e
Liderança.

## Recrutamento e Aprovações — parcial

Entrega workspace e ciclo de vagas, timeline, Approval multiestágio e outbox.

Restante: garantir atomicidade da sincronização entre Approval e Job Opening e
eliminar referências cross-tenant possíveis.

## Organization Planning — concluído na fundação

Entrega cenários, snapshots, change sets, projeção determinística, comparação,
insights, timeline, branching, validação e publicação.

Seu uso operacional continua subordinado ao gate de Fundação e às invariantes da
organização de origem.

## KPI e Analytics — concluído na fundação

Entrega engine, registry, histórico, execução durável, recovery, runtime,
scheduler, adapters e dashboards.

Novos indicadores só entram quando o módulo proprietário possui fonte canônica e
uma pergunta de negócio documentada.

## Executive e Financeiro — parcial

Entrega dashboard, contexto e Decision Feed integrado, além da fundação da
consulta financeira.

Restante: respeitar integralmente autorização das fontes e evoluir custo somente
depois da definição de dados estruturais de remuneração.

## Talent Intelligence — parcial

Entrega gaps, insights e visão agregada de prontidão para promoção.

Restante: risco de desligamento determinístico, Nine Box, sucessão e Talent
Review, sempre antes das recomendações de IA correspondentes.

## Copilot e IA — parcial

Entrega providers, skills, contexto e conversas persistentes.

Toda evolução depende de engines determinísticas, dados autorizados,
transparência e decisão humana.

## Enterprise — futuro

API pública, integrações externas, white label e marketplace permanecem fora do
MVP e não possuem prioridade ativa.

## Trabalho absorvido

PR-079A, PR-079B, PR-080 e os antigos backlogs genéricos de dashboard,
Assessments, Feedback e Analytics foram absorvidos pelas capacidades acima.
