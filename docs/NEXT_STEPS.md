# Evol OS — Próxima entrega

## Discovery pós-reconciliação — próximo slice do MVP Closure

### Objetivo

Determinar, a partir da governança versionada já reconciliada com `main`, qual é
o próximo slice normativo do programa MVP Closure. Esta entrega é **apenas
Discovery**: não implementa código, migration nem comportamento.

### Estado confirmado (baseline `c5a5451`)

Desde a baseline `e71abce` (PR I2 — integração app das mutações core 0089), foram
incorporados a `main` os seguintes slices, agora reconciliados na documentação:

- **PR J1 — People historical safe reads** (migrations 0090/0091, commits
  `49e9ddc`, `fe1e604`, `7b6a85a`): boundaries `SECURITY DEFINER` aditivas que
  expõem pessoas em todos os status de ciclo de vida (incluindo `terminated`) e o
  detalhe de competências do perfil, removendo reads diretos protegidos (42501)
  dos paths envolvidos.
- **People Analytics safe reads** (migration 0092, commit `96f9ddf`): o dashboard
  de Analytics passa a ler vagas abertas e contagem de aprovações pendentes por
  boundaries seguras, sem abrir SELECT direto em tabelas protegidas.
- **Recruitment trusted mutation program** (migrations 0093–0098, commits
  `2ac18b8`, `cd65f40`, `9c3effd`, `2dd9794`, `c5a5451`): create → submit →
  approve → open → reject de vagas por trusted boundaries atômicas, reutilizando o
  Approval Framework como autoridade e consolidando a timeline de Job Opening.
  Human Review aprovado para esses comportamentos.

### Próximo passo imediato

Executar a **Discovery pós-reconciliação** para determinar o próximo slice
normativo, sem iniciar implementação. Candidatos conhecidos (sem prioridade
atribuída neste documento): o smoke autenticado core (P0) que retoma o Human
Review; os writes P1 restantes (Competencies/assignments, Import, Development
authoring, Assessment admin, Feedback — este último dependente de congelar a
matriz de transições PD-020); os remanescentes de Recruitment (transições
`cancelled`/`closed`/`paused`/`filled` ainda no caminho legado, que exigem
Discovery separada); e os gates pendentes de privacidade (People/Development) e o
hardening forward-only da 0084.

A escolha entre esses candidatos é uma decisão de priorização a ser registrada
após a Discovery. Nenhum deles está pré-selecionado aqui.
