# Evol OS — Auditoria Funcional e Técnica HCOS

> **Documento histórico.** Esta auditoria registra o estado observado em
> 2026-07-29. Achados não são automaticamente o estado atual: devem ser
> revalidados contra a `main`. Migrations posteriores já absorveram parte dos
> achados de Planning e schema. Riscos ainda comprovados foram incorporados ao
> `docs/MVP_PLAN.md`, `docs/ROADMAP.md` e `docs/NEXT_STEPS.md`.

> **Reconciliação de Notifications — 2026-08-02.** PD-017, ADR-0011,
> `docs/domain/NOTIFICATION_DOMAIN.md` e migration 0063 concluíram HCOS-009. As
> FKs e a idempotência locais registradas em HCOS-029 foram absorvidas pelo mesmo
> hardening; a sequência histórica da seção 22 não define mais prioridade.
> O estado operacional corrente está exclusivamente em `docs/ROADMAP.md` e
> `docs/NEXT_STEPS.md`.

> **Primeiro slice tenant-owned — 2026-08-02.** A migration 0064 mitigou
> parcialmente HCOS-002 ao converter as 14 relações de Organization, People e
> Competencies para FKs compostas validadas. People, Departments, Teams,
> Positions e Competencies receberam `unique (id, company_id)`; preflight e
> pgTAP comprovam rejeição cross-tenant sem alterar RLS, optionalidade ou
> `ON DELETE`. HCOS-002 permanece aberto para os domínios consumidores.

**Data da auditoria:** 2026-07-29  
**Método:** inspeção estática do repositório, migrations e documentação; nenhum banco foi iniciado e nenhum fluxo foi executado.  
**Escopo:** árvore local completa no estado observado.  

## Convenções de evidência

- **[CODE]** fato observado no código.
- **[DB]** fato observado em migration ou seed.
- **[DOC]** fato declarado na documentação.
- **[INFERENCE]** conclusão derivada de evidências, ainda dependente de validação em runtime ou decisão de produto.
- **[RECOMMENDATION]** proposta; não descreve o estado atual.

Severidades: **P0** impede operação segura ou compromete confidencialidade/integridade; **P1** comportamento relevante incorreto ou contrato essencial ausente; **P2** dívida que limita evolução/escala; **P3** melhoria localizada.

# 1. Resumo executivo

O Evol OS já contém peças incomuns para um produto de RH nesta maturidade: domínio de aprovação com concorrência e outbox, Projection Engine determinístico, comparação de cenários, trilha imutável de atividade e módulos funcionais de competências, avaliações e desenvolvimento. A direção arquitetural documentada — engines determinísticas, IA auxiliar e organização como núcleo — é adequada a um HCOS.

Entretanto, o produto ainda não opera sobre uma única verdade organizacional. Há três bloqueios fundamentais:

1. **A cadeia de migrations não representa o schema requerido pelo código.** `departments` é referenciada, mas nunca criada; repositories de Team esperam colunas ausentes das migrations. Um ambiente criado apenas pelos artefatos versionados não é reproduzível.
2. **Isolamento lógico por `company_id` não garante integridade relacional entre tenants.** Várias FKs validam somente o ID da entidade relacionada, permitindo relações cruzadas entre empresas quando IDs são conhecidos.
3. **Organization Planning é hoje uma simulação estrutural parcial.** snapshots persistem metadados, a projeção começa de uma organização vazia e a publicação não aplica o resultado à organização real.

Além disso, as políticas de avaliações permitem leitura e alteração ampla por qualquer membro da empresa; notificações não têm policies e consultam uma tabela `employees` inexistente; Recruitment duplica dados de Position e sincroniza Approval/Job Opening sem atomicidade.

**Conclusão:** maturidade global **4,8/10**. O sistema é um conjunto promissor de módulos e engines, mas ainda não é um HCOS operacionalmente íntegro. Antes de ampliar funcionalidades, deve-se estabilizar schema, autorização, invariantes organizacionais e a semântica de publicação.

## Dez descobertas mais críticas

| Rank | ID | Sev. | Descoberta |
|---:|---|:---:|---|
| 1 | HCOS-001 | P0 | `departments` não é criada por nenhuma migration, embora seja referenciada por FKs e pelo código. |
| 2 | HCOS-002 | P0 | FKs de entidades company-owned não preservam `company_id`, permitindo vínculos cross-tenant. |
| 3 | HCOS-003 | P0 | Policies de Assessment permitem que membros leiam e atualizem respostas/respostas detalhadas de terceiros. |
| 4 | HCOS-004 | P0 | Team repository exige `manager_id`, `updated_at` e `deleted_at`, ausentes no schema versionado. |
| 5 | HCOS-005 | P1 | Planning projeta sobre organização vazia e snapshots não armazenam estado organizacional. |
| 6 | HCOS-006 | P1 | “Publicar cenário” grava metadados, mas não materializa mudanças na organização real. |
| 7 | HCOS-007 | P1 | Approval e Job Opening são atualizados em operações separadas e podem divergir. |
| 8 | HCOS-008 | P1 | Import/sync organizacional aplica itens sequencialmente sem transação atômica. |
| 9 | HCOS-009 | P1 | Notificações não têm policies e o diretório consulta `employees`, tabela inexistente. |
| 10 | HCOS-010 | P1 | `visibility='restricted'` de Activity não é aplicada pela RLS. |

# 2. Maturidade como HCOS

| Dimensão | Nota | Estado observado |
|---|---:|---|
| Produto | 6,0 | Boa visão, módulos numerosos; jornadas ponta a ponta ainda incompletas. |
| Domínio | 5,0 | Conceitos ricos, mas Organization Unit/slot/Employment/Hiring Need ausentes. |
| Dados | 3,0 | Schema versionado não reproduz o código; integridade tenant insuficiente. |
| Arquitetura | 6,0 | Feature-first e engines fortes; aplicação real viola algumas fronteiras. |
| Segurança | 3,0 | RLS disseminada, porém com falhas graves em Assessments e confidencialidade. |
| Planejamento | 4,0 | Motor determinístico existe; baseline, persistência e publicação real faltam. |
| Analytics | 5,0 | Métricas úteis, mas derivadas de fontes duplicadas/manualizadas. |
| IA | 3,5 | Abstração de provider existe; governança e integração real são incipientes. |
| Testabilidade | 4,0 | Engines têm bons testes; DB, RLS, repositories e jornadas não têm cobertura. |
| Operabilidade | 4,0 | CI faz lint/build, sem testes, migration verification ou observabilidade formal. |

**Estágio:** modular HR platform em transição para HCOS; não pronto para ser sistema mestre de organização sem o programa de fundação recomendado neste relatório.

# 3. Mapa do sistema

## 3.1 Inventário quantitativo

- **[CODE]** 1.255 arquivos rastreáveis por `rg --files`; 1.118 arquivos TypeScript/TSX sob `apps/web/src`.
- **[CODE]** 24 feature directories e 18 arquivos de teste.
- **[DB]** 48 migrations sequenciais (`0001`–`0048`) e `supabase/seed.sql`.
- **[DOC]** 74 documentos Markdown/MDX encontrados.
- **[CODE]** scripts raiz: `dev`, `build`, `lint`; workspace web: `dev`, `build`, `start`, `lint`, `test:projection`.
- **[CODE]** CI: `.github/workflows/ci.yml`; template: `.github/PULL_REQUEST_TEMPLATE.md`.

## 3.2 Features e papel aparente

| Feature | Papel | Centralidade | Evidência principal |
|---|---|---|---|
| organization | Department, Team, Position, estrutura e sync | Núcleo | `apps/web/src/features/organization/` |
| people | Employee, importação e perfil | Núcleo | `apps/web/src/features/people/` |
| organization-planning | workspace, snapshot, scenario, projection/comparison | Núcleo futuro | `apps/web/src/features/organization-planning/` |
| approval | decisão, estágios, outbox | Serviço transversal | `apps/web/src/features/approval/` |
| activity / timeline | eventos e apresentação histórica | Transversal | `apps/web/src/features/activity/`, `timeline/` |
| competencies / talent | catálogo, requisitos e gaps | Domínio | `competencies/`, `talent/` |
| assessments | templates, ciclos, respostas | Domínio | `assessments/` |
| development | planos, metas, ações, templates | Domínio | `development/` |
| recruitment | Job Opening e integração Approval | Domínio | `recruitment/` |
| feedbacks | conversas e mensagens | Domínio | `feedbacks/` |
| notifications | notificações e destinatários | Transversal incompleto | `notifications/` |
| analytics / executive | indicadores e dashboard | Consumidor | `analytics/`, `executive/` |
| manager/hr/organization intelligence | insights compostos | Consumidor | respectivas features |
| ai, ai-copilot, copilot | provider, skills e conversação | Transversal experimental | respectivas features |
| auth / customer-activation | sessão e onboarding | Fundação | respectivas features |

## 3.3 Rotas funcionais

**[CODE]** A árvore em `apps/web/src/app` expõe autenticação/onboarding e, sob `/app`, Home, Executive, Analytics, Indicators, Organization, Company/Departments/Teams/Positions/Sync History, People/Import, Competencies, Assessments, Development, Recruitment, Feedbacks, Copilot, Manager, HR e Settings. Não foi identificada rota de operação ponta a ponta de Organization Planning equivalente à riqueza do engine.

## 3.4 Entidades e tabelas por domínio

| Domínio | Entidades/tabelas principais |
|---|---|
| Identity/Tenant | `companies`, `company_members` |
| Organization | `teams`, `positions`, `people`; `departments` é usada mas não criada |
| Competencies | `competencies`, `position_competencies`, `employee_competencies`, `position_requirements` |
| Development | `development_plans`, `development_goals`, `development_actions`, templates e template goals/actions |
| Assessments | templates, sections, questions, cycles, participants, responses, answers |
| Activity/Timeline | `activity_events`, `organization_sync_executions` e receipts |
| Copilot | conversations/messages |
| Feedback | conversations, participants/messages/metadata conforme migration 0043 |
| Recruitment | `recruitment_job_openings` |
| Approval | requests, stages, assignments, decisions, events, outbox |
| Planning | workspaces, snapshots e scenarios |
| Notifications | notifications, preferences, templates |

## 3.5 Dependências

```text
Auth/Company context
  ├─> Organization ─> People ─┬─> Competencies/Talent ─> Development
  │                           ├─> Assessments
  │                           ├─> Feedbacks
  │                           └─> Intelligence/Analytics
  ├─> Recruitment ─> Approval ─> Activity/Outbox
  ├─> Organization Planning ─> Projection ─> Comparison/Presenter
  └─> AI/Copilot (contextual consumer)
```

**[CODE]** A direção pretendida é documentada em `CLAUDE.md` e `ARCHITECTURE.md`, mas há queries/services que acessam Supabase diretamente e imports profundos entre features. Exemplos: `apps/web/src/features/analytics/queries/`, `apps/web/src/features/development/application/`, `apps/web/src/features/notifications/directory/notification-recipient-directory-repository.ts` e páginas que importam `@/features/.../queries/...`.

# 4. Domínios e dependências

| Bounded context proposto | Dono da verdade | Consumidores | Acoplamento atual |
|---|---|---|---|
| Tenant & Identity | Company/Membership/Person identity | todos | Company corrente implícita e ambígua |
| Organization | Department/Team/Position/Employment | Planning, Recruitment, Talent, Analytics | People e Organization dividem o agregado |
| Planning | cenários e mudanças propostas | Approval, Organization | baseline/materialização ausentes |
| Talent | competências e gaps | Development, Analytics | gaps usam estado vivo sem versão |
| Development | planos e ações | Intelligence | razoavelmente isolado |
| Assessment | ciclos e respostas | Talent/Analytics | autorização insuficiente |
| Recruitment | Hiring Need/Opening/process | Approval, Organization | só Job Opening existe; duplica Position |
| Decision | Approval | Recruitment/Planning | forte internamente, integração parcial |
| Audit & Notification | Activity/Timeline/Notifications | todos | consistência e confidencialidade divergentes |
| Intelligence | métricas/IA | UI executiva | fontes e governança heterogêneas |

Não foi confirmado ciclo de import TypeScript fatal; o problema predominante é **acoplamento por conhecimento interno**, não necessariamente dependência circular de runtime.

# 5. Glossário AS-IS

| Termo | Significado atual | Entidade/arquivos | Consistência |
|---|---|---|---|
| Company | tenant e organização-raiz | `companies`, `company_members` | consistente, seleção corrente ambígua |
| Organization Unit / Unit | conceito documental futuro | documentação; sem entidade | ausente/ambíguo |
| Department | agrupamento de posições/times | repositories em `organization/departments`; FK em migrations | schema ausente |
| Team | agrupamento hierárquico, opcionalmente em Department | `teams`, `parent_team_id` | schema/repository divergentes |
| Position | perfil/cargo reutilizado por pessoas | `positions` | mistura job profile, lotação e condições de trabalho |
| Role/Job | usados informalmente como cargo/função | UI/docs | sem entidade canônica |
| Job Family/Specialty/Grade/Career Track | taxonomia pretendida | documentação pontual | não modelada |
| Employee/Person | vínculo funcional em `people` | people feature e tabela `people` | nomes concorrentes; não há Employment |
| Manager/Leader | `people.manager_id`; manager de team/department | people/org repositories | manual, não derivado consistentemente |
| Vacancy | item projetado no Planning | `ProjectedVacancy` | diferente de Job Opening, sem integração |
| Job Opening | requisição/vaga de recrutamento | `recruitment_job_openings` | agrega necessidade, autorização e anúncio |
| Hiring Need | necessidade anterior à vaga | fluxo pretendido | ausente |
| Headcount | contagem de pessoas ou número informado na vaga | analytics/recruitment | fontes concorrentes |
| Workspace | contêiner de planejamento | planning | consistente |
| Snapshot | metadado versionado, não estado organizacional | planning migration/repository | diverge do significado esperado |
| Scenario | alternativa sobre snapshot | planning | consistente no domínio, incompleto na persistência |
| Change Set | mudança ordenada em cenário | contratos/projection | não persistido |
| Projection | aplicação determinística em memória | projection engine | sólida, baseline vazio |
| Approval | agregado de decisão multiestágio | approval | maduro |
| Competency | habilidade global ou da empresa | competencies | consistente; FK tenant fraca |
| Requirement | requisito de Position não necessariamente competência | position requirements | relação com competency pouco explícita |
| Assessment | template/ciclo/resposta | assessments | rico, segurança problemática |
| Development Plan | plano com goals/actions | development | consistente |
| Timeline/Activity | leitura e evento persistido | duas features, mesma tabela | nomes parcialmente sobrepostos |

# 6. Glossário TO-BE

| Termo canônico | Definição recomendada | Relações essenciais |
|---|---|---|
| Company | fronteira de tenant e empregador lógico | possui Organization Units e Employments |
| Organization Unit | nó genérico versionável da estrutura | tipo: department/division/site/etc.; pai opcional |
| Department | tipo ou projeção especializada de Organization Unit | não entidade paralela sem necessidade |
| Team | unidade operacional, possivelmente hierárquica | pertence a uma Organization Unit; líder com vigência |
| Job Profile | definição reutilizável de trabalho | família, especialidade, senioridade, grade, competências |
| Position Slot | vaga estrutural ocupável e versionável | vincula Job Profile, Unit/Team, custo, capacidade |
| Employment | vínculo temporal pessoa–empresa | status, datas, gestor, slot e movimentações |
| Person | identidade humana | pode ter um ou mais Employments conforme política |
| Hiring Need | necessidade aprovada de capacidade | referencia Position Slot ou demanda de criação |
| Job Opening | processo de atração aberto a partir de Hiring Need | não duplica atributos canônicos do Position Slot |
| Candidate/Application/Hire | funil e resultado do recrutamento | Hire cria/atualiza Employment idempotentemente |
| Organization Snapshot | estado organizacional imutável e completo em uma versão | baseline da projeção |
| Scenario/Change Set/Projection | proposta, delta e resultado determinístico | publicação materializa por comando idempotente |
| Decision/Approval | autorização explícita sobre uma versão imutável | vincula objeto, versão e hash |
| Activity Event | fato auditável imutável | visibility aplicada por autorização |
| Notification | entrega derivada de evento | idempotente, preferências e canais |

# 7. Auditoria por domínio

## 7.1 Company, autenticação e tenant

- **[CODE]** `getCurrentCompanyContext()` escolhe uma associação ativa com `limit(1).maybeSingle()` sem escolha explícita ou ordenação (`apps/web/src/lib/auth/current-company.ts`). **Risco P1:** usuário multiempresa pode operar no tenant errado.
- **[CODE]** middleware protege `/app` por autenticação, não por autorização (`apps/web/src/middleware.ts`); autorização depende de RLS e services.
- **[DB]** helpers `is_company_member`, `has_company_role` e `current_person_id` são `SECURITY DEFINER` (`supabase/migrations/0003_rls_policies.sql`). O padrão é útil, mas exige testes de segurança e `search_path` restrito.
- **[RECOMMENDATION]** tornar company selection explícita na sessão/URL e validar todo comando contra esse contexto, nunca contra `companyId` livre do cliente.

## 7.2 Organization e People

Respostas objetivas:

1. Organization Unit: **não implementada**.
2. Department cumpre parcialmente o papel; Team também representa hierarquia.
3. Department pertence a Company segundo repositories/uso, mas sua DDL falta.
4. Team **não** é obrigada a ter Department (`department_id` nullable).
5. Team pode ter `parent_team_id`.
6. O repository assume `manager_id`, mas a migration não o cria.
7. Employee pode existir sem Team.
8. Employee pode existir sem Position.
9. Employee não possui Department direto; deriva potencialmente de Position/Team.
10. Manager é selecionado manualmente em `people.manager_id` e campos de estrutura.
11. Sim: Team, Position, Department e Manager podem ficar incoerentes.
12. O banco valida existência por FK, não coerência intraempresa/estrutural.
13. Services validam alguns casos locais, não o conjunto de invariantes.
14. Parte da prevenção depende de opções de UI.
15. Arquivamento não possui cascata organizacional uniforme.
16. Transferências existem por atualização/import/sync; histórico canônico de Employment não existe.
17. Dupla subordinação não é modelada.
18. Estruturas matriciais não são modeladas.
19. Colaborador compartilhado não é modelado formalmente.
20. Sites/filiais/unidades múltiplas não têm entidade própria.

Estados tecnicamente possíveis e funcionalmente inválidos:

- Employee em Team de uma empresa e Position de outra.
- Employee em Team de Department A e Position de Department B.
- Manager de outra empresa, terminado ou subordinado ao próprio Employee.
- ciclo de `manager_id` ou `parent_team_id`.
- Position ativa em Department arquivado.
- Team ativa sob parent arquivado.
- Department/Team/Position arquivados ainda referenciados por Employee.
- Team sem Department coexistindo com Position departamental sem regra explícita.

Evidências: `supabase/migrations/0001_initial_schema.sql`, `0015_add_deleted_at_to_positions.sql`, `0018_add_position_structure.sql`, `0041_add_department_id_to_teams.sql`, `apps/web/src/features/people/repositories/employee-repository.ts`, `apps/web/src/features/people/schemas/employee-schema.ts`, repositories sob `organization/`.

## 7.3 Competencies, Talent e Development

- **[DB]** competências esperadas de Position e atuais do Employee usam escala 1–5 (`0005`, `0006`).
- **[CODE]** gaps comparam competência atual com requisito da Position; a regra está em `apps/web/src/features/talent/`.
- **[INFERENCE]** alterações posteriores na competência esperada recalculam o passado, pois não há versão temporal do Job Profile/Position. Goals copiam níveis e preservam melhor o contexto do plano.
- **[CODE]** templates são copiados para planos por função SQL (`0012_apply_development_template_transaction.sql`), reduzindo acoplamento posterior.
- **[CODE]** cálculo agregado de gaps faz consultas por colaborador, com risco N+1 em empresas maiores.
- **[DB]** FKs para competências não são compostas com `company_id`; uma competência de outro tenant pode ser referenciada por ID.

## 7.4 Assessments

- **[DB] P0** policies em `0028_align_assessment_execution.sql` permitem a qualquer membro da empresa ler respostas/answers e atualizar responses/answers. Isso não restringe ao avaliador, avaliado ou RH.
- **[CODE]** actions de salvar/submeter validam estado, mas não comprovam que a pessoa corrente é o evaluator (`apps/web/src/features/assessments/actions/`).
- **[DB] P1** anonimato não é efetivo: IDs de avaliado e avaliador permanecem visíveis para membros.
- **[INFERENCE] P1** template/questions são consultados em estado vivo; mudanças durante ciclo podem alterar requisitos de submissão e leitura histórica.
- **[CODE]** salvar answer e transicionar response são operações separadas; falha intermediária pode deixar estado parcialmente atualizado.

## 7.5 Feedbacks

- **[CODE/DB]** existe fundação própria de conversas e mensagens (`apps/web/src/features/feedbacks/`, migration `0043_create_feedback_conversation_foundation.sql`).
- **[INFERENCE]** deve-se verificar em teste RLS que participantes, gestores e RH veem apenas conversas autorizadas; não há testes de RLS no repositório.
- **[RECOMMENDATION]** definir documentalmente confidencialidade, retenção, edição e relação com Performance antes de usar feedback como evidência decisória.

## 7.6 Activity, Timeline e Notifications

- **[DB]** `activity_events` é imutável e possui idempotency support (`0039`, `0047`).
- **[DB] P1** SELECT por company membership não filtra `visibility`, portanto `restricted` não restringe leitura.
- **[CODE]** Activity e Timeline representam o mesmo evento sob interfaces distintas; sync possui timeline separada (`0040`).
- **[DB] P1** `0034_create_notifications_foundation.sql` habilita RLS, mas não cria policies.
- **[CODE] P1** `notification-recipient-directory-repository.ts` consulta `.from("employees")`, enquanto a entidade persistida é `people`.
- **[DB]** notifications carecem de FKs essenciais e de unicidade/idempotência de entrega.

## 7.7 Analytics e Intelligence

- **[CODE]** analytics, executive, manager/hr intelligence compõem métricas de People, Development, Assessments e Recruitment.
- **[INFERENCE]** headcount pode divergir: Analytics deriva pessoas; Recruitment armazena `current_headcount`, `target_headcount` e `positions_count` informados.
- **[CODE]** algumas queries acessam Supabase diretamente, contrariando o princípio documental de repository único.
- **[RECOMMENDATION]** criar catálogo de métricas com nome, fórmula, população, data efetiva, owner e fonte; não materializar indicadores sem política de atualização.

# 8. Auditoria especial de Position

## Estado atual

`Position` contém nome, descrição, Department, nível hierárquico, status, carga, modelo de trabalho, tipo de contrato, viagem e requisitos (`apps/web/src/features/organization/positions/`; migrations `0017`–`0019`). Pessoas apontam diretamente para uma Position e várias pessoas podem compartilhar a mesma.

## Diagnóstico

**[INFERENCE]** a entidade mistura pelo menos três conceitos:

1. **Job Profile:** nome, descrição, competências/requisitos.
2. **Position allocation:** Department e nível.
3. **Employment arrangement:** workload, work model, employment type e travel.

Ela não é um Position Slot ocupável: não há capacidade, incumbent único, vigência, centro de custo, grade salarial ou histórico. Portanto “Position” hoje é mais próxima de um **cargo/perfil lotado**.

## Invariantes ausentes

- Position e Department devem ter o mesmo `company_id`.
- Position arquivada não deve aceitar novos vínculos.
- arquivamento deve verificar Employees, Job Openings e cenários publicados.
- competências/requisitos precisam de versão efetiva para decisões históricas.
- se evoluir para slot, ocupação simultânea deve obedecer capacidade e período.

## Decisão necessária

**[RECOMMENDATION]** ADR antes de alterar schema: separar `JobProfile` de `PositionSlot`, mantendo compatibilidade por migração incremental. Não renomear a entidade atual sem mapa de transição.

# 9. Auditoria especial de Recruitment

## Estado atual

Job Opening concentra motivo, Position, Department, gestores, quantidade, headcount, regime, local, faixa salarial, orçamento, prioridade, datas e aprovação (`0045_create_recruitment_job_openings.sql`). Não existem Candidate, Application, Selection Process ou Hire.

## Problemas

- **[DB/CODE] P1** atributos canônicos de Position são copiados para Job Opening; podem divergir após criação.
- **[CODE]** relações são validadas dentro da empresa e Position ativa; Department só é confrontado se a Position já tiver Department.
- **[CODE]** replacement não é validado como ocupante da Position nem como saída planejada.
- **[CODE] P1** Approval é persistido antes da sincronização do status da Job Opening. O próprio fluxo reconhece o estado “aprovação processada, mas status não sincronizado”.
- **[DB/CODE] P1** assignee pode ser pessoa comum no domínio, mas `save_approval_request` exige owner/admin/hr; aprovação delegada pode falhar.
- **[CODE]** contratação não atualiza Organization/People; não há idempotência de hire.

## Fluxo TO-BE

```text
Hiring Need(versionada) -> Approval -> Job Opening -> Application pipeline
-> accepted Hire command -> Employment/Position Slot -> Activity Event
```

Todos os passos de materialização devem ser idempotentes e conciliáveis; Approval deve referenciar versão/hash imutável da necessidade.

# 10. Auditoria especial de Organization Planning

## Capacidades fortes

- Projection Engine puro, ordenação determinística e eventos `change-set.executed`.
- validação de IDs duplicados e imutabilidade no Scenario Executor.
- comparadores e presenter desacoplados.
- optimistic version em Scenario e snapshots imutáveis.

## Lacunas críticas

- **[DB]** snapshot guarda metadados, não payload organizacional (`0048`).
- **[CODE]** `ProjectionContext.create()` chama `createEmptyProjectedOrganization()` (`projection/context/projection-context.ts`).
- **[CODE]** Change Sets não possuem persistência/repository.
- **[CODE]** ProjectedEmployee contém somente `id` e `positionId`, insuficiente para estrutura completa.
- **[CODE]** publicação salva Scenario e novo snapshot metadata, sem executar/aplicar organização (`application/handlers/publish-scenario-handler.ts`).
- **[CODE]** Planning não está integrado ao agregado Approval nem à Activity/Timeline.
- **[INFERENCE]** chamar o estado atual de “publicado” pode induzir usuário a acreditar que a organização real foi alterada.

## Contrato mínimo de publicação

1. carregar baseline imutável e completo;
2. executar conjunto persistido e versionado;
3. validar invariantes organizacionais;
4. aprovar exatamente hash/version do resultado;
5. materializar atomicamente ou por saga idempotente;
6. gravar receipt/audit e snapshot resultante;
7. permitir reconciliação e rollback compensatório.

# 11. Matriz Single Source of Truth

| Conceito | Fonte atual | Duplicações/derivações | Veredito |
|---|---|---|---|
| Company membership | `company_members` | company corrente escolhida implicitamente | parcial |
| Department | código/repositories | DDL ausente | sem SSOT executável |
| Team | `teams` | schema difere do repository | inconsistente |
| Position | `positions` | Job Opening copia atributos; Planning projeta cópia | parcial |
| Employee | `people` | chamado `employee` no código; projected subset | parcial |
| Headcount | contagem de People | valores manuais em Job Opening | duplicado |
| Competency expected | `position_competencies` | plans copiam níveis de propósito | aceitável se versionado |
| Organization baseline | deveria ser Snapshot | snapshot sem payload; engine vazio | ausente |
| Approval state | approval aggregate | status também em Job Opening | dual-write |
| Activity | `activity_events` | sync timeline separada | fragmentado |
| Notification recipient | deveria ser `people` | código consulta `employees` | quebrado |
| Scenario changes | contratos em memória | sem persistência | ausente |

# 12. Matriz de invariantes

| Invariante | DB | Aplicação | Teste | Estado |
|---|:---:|:---:|:---:|---|
| entidade relacionada pertence à mesma Company | não, em geral | parcial | não | P0 |
| Employee Team/Position compartilham Department | não | não | não | P1 |
| Manager pertence à empresa e não forma ciclo | não | parcial | não | P1 |
| Team parent não forma ciclo | não | não confirmado | não | P1 |
| entidade arquivada não recebe vínculo ativo | parcial | parcial | projection sim, CRUD não | P1 |
| Position referenciada não é arquivada | não globalmente | projection cobre employees | parcial | P1 |
| Assessment só é alterada pelo evaluator autorizado | não | não | não | P0 |
| cenário publicado é imutável | sim | sim | sim | adequado |
| snapshot é imutável | sim | sim | sim | conteúdo ausente |
| ChangeSet ID único por execução | n/a | sim | sim | adequado |
| Approval version é concorrente/idempotente | sim | sim | sim | forte |
| aprovação e agregado consumidor são consistentes | não | não | parcial | P1 |
| Activity restricted é confidencial | não | n/a | não | P1 |
| contratação atualiza organização uma vez | ausente | ausente | ausente | lacuna |

# 13. Banco de dados e migrations

## Reprodutibilidade

- **[DB] P0:** nenhuma migration contém `CREATE TABLE departments`; `0018` e `0041` a referenciam. `seed.sql` também não a cria.
- **[DB/CODE] P0:** `teams` nasce em `0001` sem `manager_id`, `updated_at` ou `deleted_at`; repositories leem/escrevem esses campos.
- **[DB]** a numeração é linear e legível, mas não há teste CI que suba banco limpo e aplique toda a cadeia.

## Integridade

- preferir chaves/uniques compostas `(id, company_id)` e FKs compostas para relações tenant-owned;
- definir checks de coerência temporal/status onde o banco puder garantir;
- evitar duplicar campos derivados sem provenance/as-of/version;
- incluir migrations de reparação e auditoria de dados existentes antes de tornar constraints estritas.

## Seed

**[DB]** `supabase/seed.sql` popula Company, Team, Position, People, Competencies e Assessments, mas não Department e não cobre Approval, Planning, Recruitment ou fluxos cross-domain. Não serve como cenário HCOS de integração.

# 14. Segurança e multi-tenancy

## Achados

1. **P0 — RLS Assessment permissiva:** `0028_align_assessment_execution.sql`.
2. **P0 — relações cross-tenant:** migrations de People/Organization/Competencies/Development/Recruitment usam FK simples.
3. **P1 — Activity restricted legível por todos os membros:** `0039_create_activity_engine.sql`.
4. **P1 — Notifications sem policies:** `0034_create_notifications_foundation.sql`.
5. **P1 — company context implícito:** `apps/web/src/lib/auth/current-company.ts`.
6. **P1 — actions recebem `companyId` do chamador:** exemplos em `people/actions/` e `notifications/actions/`.
7. **P2 — todos os membros leem vários dados sensíveis de Development/Approval:** confirmar matriz de papéis com Produto/Legal.

## Modelo recomendado

- Contexto tenant explícito e server-derived.
- Autorização por capacidade (`assessment.answer.own`, `approval.decide.assigned`, etc.), não só roles globais.
- RLS testada com matriz usuário × empresa × papel × recurso.
- FKs compostas, não apenas policies.
- Logs de acesso/decisão para dados sensíveis.
- Threat model para prompt/data exfiltration antes de IA real.

# 15. Arquitetura

## Pontos fortes

- ADRs e guias estabelecem feature-first e responsabilidades.
- Approval possui domínio rico, unit of work SQL, optimistic concurrency e outbox.
- Projection/Comparison são determinísticos e bem isolados.
- Presenters/ViewModels reduzem vazamento de domínio para UI em Planning.

## Desvios

- Acesso Supabase fora de repositories em analytics, development e outros pontos.
- Imports profundos entre features violam barrels públicos.
- `people` e `organization` compartilham invariantes sem agregado/application service único.
- dois mecanismos de mudança organizacional: sync snapshot-based e Planning ChangeSets, com semânticas divergentes.
- Activity, Timeline e sync timeline sobrepõem responsabilidade histórica.

## Circularidade

Não foi provado ciclo de runtime. **[RECOMMENDATION]** introduzir verificação automatizada de boundaries/import cycles; hoje a ausência de ciclo depende de disciplina manual.

# 16. UX e jornadas

| Jornada | Estado | Risco UX/negócio |
|---|---|---|
| onboarding -> company | presente | seleção multiempresa não explícita |
| montar organização | presente | inconsistências estruturais podem ser salvas |
| importar/sincronizar | presente | execução parcial e rollback limitado |
| avaliar pessoas | presente | confidencialidade/autorização inadequadas |
| desenvolver pessoa | presente | histórico de expectativa não versionado |
| abrir/aprovar vaga | parcial | sem candidatos/hire; status pode divergir |
| planejar/comparar | engine/componentes | baseline/publicação real ausentes |
| acompanhar por timeline | parcial | visibilidade e eventos best-effort |
| usar Copilot | protótipo | UI/conversa não conclui provider real |

**[RECOMMENDATION]** a UI deve explicitar “simulação”, “validado”, “aprovado” e “aplicado” como estados distintos; nunca apresentar publicação metadata-only como mudança efetiva.

# 17. Testes e qualidade

- **[CODE]** apenas 18 arquivos de teste para 24 features e 1.118 arquivos TS/TSX.
- **[CODE]** testes concentram-se em Planning Projection, Approval e poucos services.
- **[CODE]** `test:projection` é o único script de teste declarado no workspace.
- **[CODE]** CI executa lint/build, não a suíte de testes.
- **[DOC/CODE]** documentação menciona `npm run check`/`npm run test`, mas esses scripts não existem no package observado.

Coberturas ausentes de maior risco:

1. aplicação integral das migrations em banco limpo;
2. RLS/multi-tenancy e tentativa cross-company;
3. repository/schema contract tests;
4. sync/import com falha intermediária e retry;
5. Recruitment + Approval consistency;
6. Assessments authorization/anonymity;
7. Notification delivery/idempotency;
8. E2E das jornadas críticas;
9. performance de analytics/gaps;
10. Copilot data boundary e provider failure.

# 18. Casos de negócio essenciais

| # | Caso | Suporte atual | Resultado |
|---:|---|---|---|
| 1 | criar empresa e owner | função onboarding | parcial/positivo |
| 2 | usuário em duas empresas escolher tenant | implícito | falha |
| 3 | criar Department | código existe, schema não | falha |
| 4 | criar Team em Department | schema incompleto | falha provável |
| 5 | Team hierárquica sem ciclo | parent existe, invariant não | parcial |
| 6 | Position com competências | presente | parcial |
| 7 | impedir Position cross-company | não | falha |
| 8 | Employee sem Team | permitido | decisão requerida |
| 9 | Employee sem Position | permitido | decisão requerida |
| 10 | impedir Team/Position em Departments distintos | não | falha |
| 11 | impedir manager cross-company | não estruturalmente | falha |
| 12 | transferir Employee com histórico | update existe, histórico canônico não | parcial |
| 13 | terminar e recontratar | status simples, sem Employment | parcial |
| 14 | importar lote atomicamente | não | falha |
| 15 | repetir import com idempotência | sync possui matching/receipts | parcial |
| 16 | calcular gap atual | presente | positivo |
| 17 | preservar gap histórico | não versionado | falha |
| 18 | aplicar template de desenvolvimento | função transacional | positivo |
| 19 | avaliador editar só sua resposta | RLS ampla | falha crítica |
| 20 | avaliação anônima | IDs expostos | falha |
| 21 | abrir vaga coerente com Position | validação parcial | parcial |
| 22 | aprovar vaga atomicamente | dual-write | falha |
| 23 | processar candidatos | ausente | falha |
| 24 | contratação atualizar organização | ausente | falha |
| 25 | projetar estado real atual | baseline vazio | falha |
| 26 | comparar cenários determinística | presente | positivo sobre input disponível |
| 27 | aprovar exatamente cenário projetado | não integrado | falha |
| 28 | publicar e materializar cenário | não | falha |
| 29 | restringir activity sensível | visibility não aplicada | falha |
| 30 | notificar destinatário correto | tabela/policies quebradas | falha |
| 31 | executar Approval concorrente | version/lock/outbox | positivo |
| 32 | retry de outbox idempotente | presente | positivo |
| 33 | Copilot real explicar decisão com audit | não | falha |
| 34 | dashboard ter headcount canônico | fontes concorrentes | parcial |

# 19. Escalabilidade e operação

- **P1:** escolha de company sem índice/ordem semântica afeta correção antes de escala.
- **P2:** gap agregado faz N+1 por Employee; medir e substituir por query set-based/materialized read model se necessário.
- **P2:** analytics compostos podem repetir consultas; `Promise.all` reduz latência, não carga total.
- **P2:** sync sequencial aumenta janela de estado parcial e tempo de operação.
- **P2:** Activity/Approval outbox têm melhor base operacional; estender métricas de lag, retries e dead letters.
- **P2:** não há evidência de tracing, SLOs, audit de acesso ou alertas de divergência.
- **P2:** IA carece de orçamento/token limits, timeouts, circuit breaker, redaction e telemetry.

# 20. AS-IS × TO-BE

| Área | AS-IS | TO-BE | Gap |
|---|---|---|---|
| Organização | Company-Team/Department-Position-People | Company-OrgUnit-Team-JobProfile-PositionSlot-Employment | grande |
| Tenant | RLS por company_id | contexto explícito + FK composta + capability | crítico |
| Position | cargo/perfil/lotação combinados | JobProfile separado de slot | grande |
| Recruitment | Job Opening + Approval | Need->Approval->Opening->Candidate->Hire | grande |
| Planning | metadata snapshot + projection vazia | snapshot completo -> apply idempotente | crítico |
| Assessment | ciclo rico, acesso amplo | confidencialidade por participação | crítico |
| History | activity + timeline + receipts | event model canônico e visibility | médio |
| Analytics | consultas derivadas e campos manuais | metric catalog com provenance/as-of | médio |
| AI | mocks/provedor parcialmente ligado | copiloto governado e auditável | grande |
| Quality | build/lint, poucos testes | migration/RLS/integration/E2E gates | grande |

# 21. Catálogo completo de problemas

| ID | Sev. | Problema e evidência | Impacto / prob. | Correção mínima | Dependências / regressão / esforço |
|---|:---:|---|---|---|---|
| HCOS-001 | P0 | Department sem CREATE TABLE (`0018`, `0041`, seed) | deploy limpo falha / alta | baseline migration compatível e teste clean DB | auditar produção / alta / M |
| HCOS-002 | P0 | FKs simples ainda existem em domínios consumidores; as 14 relações do núcleo foram endurecidas pela migration 0064 | vazamento/corrupção / média | continuar uniques+FKs compostas em slices aprovados, sempre com preflight | quase todos domínios / alta / XL |
| HCOS-003 | P0 | Assessment RLS permite read/update a membros (`0028`) | confidencialidade e fraude / alta | policies por participante/capability | matriz de acesso / alta / L |
| HCOS-004 | P0 | Team repository/schema drift | CRUD falha / alta em clean DB | migration de alinhamento após inventário real | HCOS-001 / média / M |
| HCOS-005 | P1 | snapshot não contém organização; contexto vazio | projeção não representa realidade / certa | contrato/persistência de baseline completo | ADR snapshot / alta / XL |
| HCOS-006 | P1 | publicação não materializa resultado | falsa operação / certa | pipeline aprovado, idempotente e auditável | HCOS-005, Approval / alta / XL |
| HCOS-007 | P1 | Approval/JobOpening dual-write | status divergente / média | mesma transação ou saga/outbox reconciliável | Approval / média / L |
| HCOS-008 | P1 | sync/import não atômico | organização parcial / média | UoW, resume idempotente e compensação comprovada | repositories / alta / XL |
| HCOS-009 | P1 | notifications sem policies e usa `employees` | módulo indisponível / alta | corrigir directory e policies testadas | People / baixa / M |
| HCOS-010 | P1 | Activity visibility ignorada por RLS | exposição sensível / alta | policy por visibility/capability | consumer audit / média / M |
| HCOS-011 | P1 | company corrente implícita | operação tenant errado / média | seleção explícita persistida | auth/UI / média / M |
| HCOS-012 | P1 | Employee-Team-Position sem coerência | estrutura inválida / alta | validator canônico + constraints possíveis | modelo org / alta / L |
| HCOS-013 | P1 | Manager/parent cycles não prevenidos | hierarquia impossível / média | cycle validation transacional | org / média / M |
| HCOS-014 | P1 | DISC TypeScript aceita compostos, DB inicial restringe D/I/S/C | writes falham / alta | alinhar migration/contrato após decisão | dados existentes / baixa / S |
| HCOS-015 | P1 | Recruitment duplica Position/headcount | decisões sobre dado stale / alta | references+snapshot explícito/provenance | Position ADR / alta / L |
| HCOS-016 | P1 | approver design e SQL roles divergem | decisão atribuída falha / média | capability alinhada ao assignment | security / média / M |
| HCOS-017 | P1 | Assessment templates vivos afetam ciclos | histórico/submissão muda / média | snapshot/version no início | migration / média / L |
| HCOS-018 | P1 | Assessment save/status em operações separadas | estado parcial / média | RPC/UoW idempotente | assessments / baixa / M |
| HCOS-019 | P1 | Change Sets não persistidos | cenário não reprodutível / certa | repository/version/unique | HCOS-005 / média / L |
| HCOS-020 | P1 | Planning sem Approval/Activity | publicação sem governança | integração version/hash | HCOS-005/006 / média / L |
| HCOS-021 | P1 | Copilot conversa persiste e depois lança erro | histórico parcial/UX enganosa | transação/status e provider composition | AI governance / baixa / M |
| HCOS-022 | P2 | Position mistura conceitos | evolução e inconsistência | ADR + migração incremental | domínio / alta / XL |
| HCOS-023 | P2 | ausência Employment/histórico temporal | rehire/múltiplos vínculos frágeis | modelagem temporal | Position ADR / alta / XL |
| HCOS-024 | P2 | gaps não versionados | história muda retroativamente | effective-dated expectations | competencies / média / L |
| HCOS-025 | P2 | N+1 em gaps | latência/custo / alta com escala | query set-based após benchmark | DB / baixa / M |
| HCOS-026 | P2 | acesso DB fora repositories | regras de tenant/mapping dispersas | migrar incrementalmente | boundaries / média / L |
| HCOS-027 | P2 | imports profundos entre features | contratos frágeis | lint boundary + barrels | vários / baixa / M |
| HCOS-028 | P2 | Activity/Timeline/sync timeline fragmentadas | auditoria incompleta | canonical event taxonomy | docs/ADR / média / L |
| HCOS-029 | P2 | notifications sem FK/idempotência | órfãos/duplicatas | constraints+delivery key | HCOS-009 / média / M |
| HCOS-030 | P2 | IA sem política de dados/custos/audit | compliance/custo | governance + technical controls | legal/security / média / L |
| HCOS-031 | P2 | tests ausentes para RLS/migrations | regressões críticas invisíveis | gates CI | infra test / baixa / L |
| HCOS-032 | P2 | CI não executa testes | merge de regressões | script `test`/`check` real | test foundation / baixa / S |
| HCOS-033 | P2 | docs citam scripts inexistentes | handoff/DoD falsa | alinhar docs/scripts | engenharia / baixa / S |
| HCOS-034 | P2 | headcount possui fontes concorrentes | métrica incoerente | métrica canônica e as-of | org/recruitment / média / M |
| HCOS-035 | P3 | seed não cobre jornadas cross-domain | diagnóstico manual difícil | seed/fixtures determinísticos | migrations / baixa / M |

# 22. Priorização

## P0 — antes de novos módulos

1. Reproduzir schema limpo e corrigir Department/Team drift.
2. Fechar RLS de Assessments e validar anonimato.
3. Eliminar relações cross-company com reparação segura.

## P1 — fundação operacional

1. Company context explícito e authorization matrix.
2. Invariantes Organization/People.
3. Baseline e Change Sets persistidos.
4. Publicação real integrada a Approval/Activity.
5. Atomicidade/reconciliação de Recruitment e sync.
6. Notifications e Activity visibility.

## P2/P3 — consolidação

Position/Employment model, metric catalog, arquitetura boundaries, AI governance, performance, observabilidade, seeds e documentação.

# 23. Sequência recomendada de PRs

| PR | Título | Objetivo único | Dependências | Gates/rollback |
|---|---|---|---|---|
| HCOS-001 | Clean Schema Contract Test | CI aplica migrations+seed em DB vazio | nenhuma | não altera produção |
| HCOS-002 | Restore Organization Schema | criar/alinha Department e Team com preflight | 001 | migration forward-only; backup |
| HCOS-003 | Assessment Authorization Lockdown | policies por participant/capability | matriz aprovada | RLS tests; rollback policy |
| HCOS-004 | Tenant Referential Integrity Audit | detectar/reparar relações cross-company | 002 | dry-run report |
| HCOS-005 | Tenant Composite Foreign Keys | impor company nas relações | 004 | NOT VALID -> validate; compensatória |
| HCOS-006 | Explicit Company Context | seleção determinística de tenant | nenhuma | auth integration tests |
| HCOS-007 | Organization Invariant Service | Team/Position/Manager/archival invariants | 005/006 | contract tests |
| HCOS-008 | Activity Visibility Enforcement | aplicar visibility em RLS | 006 | access matrix |
| HCOS-009 | Notifications Recovery | people directory, policies, FKs/idempotência | 005/006 | delivery tests |
| HCOS-010 | Recruitment Approval Consistency | saga/outbox ou transação e reconciliação | Approval estável | failure injection |
| HCOS-011 | Organization Sync Safety | idempotência, resume e UoW/compensação | 007 | fault tests, receipts |
| HCOS-012 | Planning Snapshot ADR & Contract | decidir payload, hash, version e retention | domínio estabilizado | documentação somente |
| HCOS-013 | Persist Organization Snapshot | baseline completo e imutável | 012 | dual-read/migration |
| HCOS-014 | Persist Scenario Change Sets | versionamento e unicidade | 013 | repository tests |
| HCOS-015 | Planning Validation & Approval | aprovar hash/version projetado | 014 | stale approval tests |
| HCOS-016 | Idempotent Scenario Publication | aplicar à organização + receipts | 015/011 | canary, reconciliation, compensation |
| HCOS-017 | Position/Employment ADR | JobProfile/Slot/Employment decisão | invariantes claros | documentação somente |
| HCOS-018+ | Incremental Domain Evolution | implementar ADR em slices compatíveis | 017 | feature flags/backfill |
| HCOS-019 | Quality Gates | testes RLS/repository/E2E em CI | 001–016 | CI gradual |
| HCOS-020 | AI Governance Baseline | data classification, provider audit/cost | security/legal | mock remains default |

Cada PR deve atualizar documentação e matriz de invariantes correspondente. Migrations destrutivas ou ações sobre produção permanecem decisão do Human Reviewer.

# 24. Riscos de deployment

- Produção pode conter schema manual não representado no Git; uma migration “corretiva” ingênua pode conflitar.
- adicionar FKs compostas pode falhar por dados cross-company já existentes; requer relatório e quarentena.
- restringir RLS pode quebrar telas que dependem de acesso amplo; testar por papel antes do rollout.
- alterar seleção de company pode mudar URLs/cache e exigir migração de sessão.
- publicação Planning deve estrear atrás de feature flag e dry-run; jamais aplicar cenário histórico sem hash/revalidação.
- outbox/saga exige monitor de lag e procedimento de replay.
- rollback de migration deve ser compensatório e aprovado; nunca apagar dados para “voltar”.

# 25. ADRs necessários

1. Modelo canônico Organization Unit/Department/Team.
2. Separação Job Profile × Position Slot × Employment.
3. Tenant context e estratégia de FKs compostas.
4. Snapshot organizacional: payload, hash, schema version e retenção.
5. Change Set persistence e ordering/version semantics.
6. Validação, Approval e publicação idempotente de cenário.
7. Consistência cross-aggregate: transaction, saga e outbox.
8. Event taxonomy: Activity, Timeline, Notification e sync receipts.
9. Assessment confidentiality/anonymity and access matrix.
10. Recruitment aggregate: Hiring Need, Opening, Candidate e Hire.
11. Métricas canônicas e temporalidade (`as_of`).
12. IA: classificação de dados, consentimento, retention, explainability e human authority.

# 26. Documentação a atualizar

- `ARCHITECTURE.md`: refletir acessos DB reais, Planning incompleto e bounded contexts.
- `docs/AI_CONTEXT.md`: separar provider disponível de fluxos realmente integrados.
- documentação Organization/Planning/Recruitment: marcar AS-IS versus visão.
- `docs/engineering/development-workflow.md` e `CLAUDE.md`: alinhar comandos reais de teste/check.
- catálogo novo/canônico de entidades, invariantes, ownership e eventos após ADRs.
- runbooks de migration, RLS incident, outbox replay, sync recovery e publication reconciliation.
- data classification e access matrix para Assessment, Feedback, Development e Approval.

# 27. Questões sem resposta

1. O banco de produção possui `departments` e colunas Team criadas manualmente?
2. Position deve ser perfil reutilizável ou slot ocupável?
3. Employee pode legalmente ter múltiplos vínculos/empresas?
4. Team sem Department é estado válido?
5. Qual fonte decide Department do Employee: Team, Position ou Employment?
6. Manager é relação administrativa, funcional ou ambas?
7. Quem pode ver avaliações, feedbacks, planos e approvals?
8. O que “anonymous” significa em Assessment para cada papel?
9. Job Opening congela atributos da Position ou os acompanha?
10. Quem pode ser approver atribuído além de owner/admin/hr?
11. O sync deve ser all-or-nothing ou resumível por item?
12. Snapshot armazena JSON integral, tabelas versionadas ou event log?
13. Publicação altera organização imediatamente ou gera proposta operacional?
14. Quais métricas financeiras são autorizadas e qual fonte salarial?
15. Qual SLA/retention/audit é exigido para IA e dados de pessoas?

# 28. Recomendação final

**Não expandir o produto como HCOS antes de concluir os P0.** O próximo ciclo deve ser tratado como um programa de “fundação confiável”, não como refatoração estética:

1. provar que o banco nasce do Git;
2. provar isolamento e autorização por testes adversariais;
3. estabelecer invariantes organizacionais e uma fonte canônica;
4. só então conectar Planning, Approval, Publication e Recruitment ao estado real.

A arquitetura de engines e Approval merece ser preservada. A estratégia correta é evolução incremental com compatibilidade, migrations verificáveis, backfills auditados e PRs pequenas. O objetivo não é substituir o sistema existente, mas tornar explícitos os contratos que hoje estão implícitos ou divergentes.

**Go/No-Go:**

- novos dashboards/composições somente se não consolidarem métricas não canônicas: **go cauteloso**;
- uso do sistema como mestre organizacional: **no-go até HCOS-001–007**;
- avaliações sensíveis em produção: **no-go até HCOS-003**;
- publicação automática de cenários: **no-go até HCOS-012–016**;
- IA real com dados pessoais: **no-go até baseline de governança**.

---

## Apêndice A — árvore documental

**Raiz:** `README.md`, `CLAUDE.md`, `AGENTS.md`, `ARCHITECTURE.md` e demais `*.md/*.mdx`.  
**`docs/`:** arquitetura, ADRs, engenharia, produto/domínio, contexto de IA e planejamento encontrados recursivamente.  
**Feature-local:** READMEs e documentos sob `apps/web/src/features/**` quando presentes.  
**Operação:** `.github/PULL_REQUEST_TEMPLATE.md` e workflow CI.  

Inventário reproduzível usado na auditoria:

```bash
rg --files -g '*.md' -g '*.mdx'
find apps/web/src/features -maxdepth 1 -mindepth 1 -type d
find apps/web/src/app -type f
rg --files supabase/migrations
```

## Apêndice B — migrations

Foram inspecionadas 48 migrations, de `0001_initial_schema.sql` a `0048_create_organization_planning_foundation.sql`, cobrindo schema inicial, RLS, competencies, development, Position, assessments, onboarding, notifications, sync/activity, Copilot, feedback, recruitment, approval/outbox e Planning.

## Apêndice C — limites da auditoria

- Não houve conexão com Supabase nem comparação com schema de produção.
- Não foram executados build, testes, migrations ou análise dinâmica, pois a missão é auditoria estática sem alteração.
- Probabilidades são estimativas arquiteturais, não métricas de incidentes.
- Achados de confidencialidade devem ser validados com Product, Security e Legal; a permissividade técnica observada é factual.
