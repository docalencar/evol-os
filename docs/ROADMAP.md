# Evol OS — Roadmap Estratégico

## Fonte oficial de priorização

Este documento é a fonte oficial para a ordem das próximas entregas do Evol OS.
Ele registra macrocapacidades, estado atual, dependências e sequência de evolução.

`EPICS.md` detalha o estado de cada capacidade. `NEXT_STEPS.md` transforma a ordem
definida aqui em uma fila operacional com critérios objetivos. Em caso de
divergência, este roadmap deve ser reconciliado primeiro com a `main`.

## Estado atual do produto

### Fundação organizacional — concluída

- autenticação, empresas, contexto da empresa e isolamento por tenant;
- pessoas, departamentos, times, cargos e competências;
- importação de pessoas e sincronização organizacional;
- avaliações, feedback contínuo e planos de desenvolvimento;
- timeline, atividades e notificações;
- recrutamento de vagas e fluxo reutilizável de aprovação.

### Sistema operacional da organização — concluído

- workspaces e cenários de planejamento;
- snapshots, change sets e projeção determinística;
- comparação, insights, timeline e branching de cenários;
- validação e publicação de cenários;
- autorização e proteção de acesso ao planejamento.

### Inteligência e tomada de decisão — concluída na fundação

- analytics de pessoas, organização, avaliações e desenvolvimento;
- KPI Engine com registry, avaliação, histórico e execução durável;
- recovery, worker, scheduler, triggers e adapters operacionais de KPI;
- dashboards executivo e de planejamento;
- Executive Decision Feed integrado a planejamento, recrutamento,
  desenvolvimento, avaliações, feedback, pessoas, organização e financeiro;
- copilots contextuais com conversas persistentes.

As capacidades acima estão concluídas em sua fundação. Isso não significa que
todos os casos de uso futuros desses domínios estejam encerrados.

## Próximos objetivos

### 1. Enriquecer o modelo de cargos

Ordem de entrega:

1. faixa salarial;
2. responsabilidades do cargo;
3. perfil ideal do cargo;
4. trilha de carreira;
5. organograma avançado.

Esse conjunto evolui a estrutura organizacional que já sustenta pessoas,
planejamento, KPIs e decisões executivas. A faixa salarial vem primeiro porque é
o dado estrutural ainda ausente necessário para futuras projeções de custo.

### 2. Completar inteligência de talentos

Ordem de entrega:

1. risco de desligamento determinístico;
2. Nine Box;
3. sucessão;
4. Talent Review;
5. recomendações de talento.

Depende de pessoas, competências, avaliações e desenvolvimento. Recomendações
devem explicar resultados determinísticos; não substituem as engines do domínio.

### 3. Completar jornadas de liderança

- workspace próprio de one-on-one;
- check-ins acompanháveis;
- reconhecimentos;
- planos de ação e desenvolvimento da liderança.

Depende das fundações existentes de pessoas, feedback, timeline e notificações.
Os tipos de feedback `one_on_one` e `check_in` existentes não representam, por si
só, essas jornadas completas.

### 4. Expandir performance e planejamento

- OKRs;
- acompanhamento operacional em tempo real;
- ampliação das projeções financeiras após a disponibilidade dos dados de custo;
- novas definições e adapters de KPI orientados a necessidades reais do produto.

### 5. Evoluir IA e capacidades enterprise

- predições somente sobre sinais e contratos determinísticos;
- benchmark organizacional interno;
- API pública;
- integrações externas;
- white label;
- marketplace.

Esses itens permanecem futuros e não devem preceder as capacidades estruturais
das etapas anteriores sem nova decisão de produto registrada neste roadmap.

## Regra de manutenção

Uma entrega só muda de estado quando estiver incorporada à `main`. Toda PR que
altere prioridade, dependência ou estado de macrocapacidade deve atualizar este
arquivo e, quando aplicável, seus derivados `EPICS.md` e `NEXT_STEPS.md`.
