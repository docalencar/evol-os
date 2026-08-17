# Evol OS — Roadmap

## O que vem agora?

### MVP Closure — ativação multiusuário do tenant

1. Aprovar a PR B DB-first — People + Organization Management Read Boundaries —
   e integrar seus contratos em uma PR app separada antes de retomar o smoke
   autenticado em `/app`.
   As PRs 9A, 9B e 9C foram concluídas nos merges `b4aae86`, `3070855` e
   `4d7b037`, respectivamente. A 9D1 foi concluída no merge `02168b9` e a 9D2
   no merge `3f13bbc`. A 9E1 foi concluída no merge `1e4ccbb`; a 9E consome sua
   fronteira v2 e as operações trusted existentes, sem migration ou RPC nova. A
   9E foi concluída no merge `f10d116`.

O primeiro slice está concluído pela migration 0064: as 14 relações de
Organization, People e Competencies agora preservam fisicamente o tenant. O
segundo slice está concluído pela migration 0065: as seis relações tenant-owned de
`recruitment_job_openings` agora usam as candidate keys do núcleo organizacional.
O recorte operacional do terceiro slice está concluído pela migration 0066: as
cinco relações entre `development_plans`, `development_goals` e
`development_actions` agora preservam fisicamente o tenant. O recorte de
templates globais permanece separado e sujeito à PD-018.
A PD-018 está aprovada e o Implementation Plan do Slice 3 está versionado em
`Execution/ADR-0012-SLICE-3-DEVELOPMENT-IMPLEMENTATION-PLAN.md`. A PR 3A está
concluída pela migration 0066. A PR 3B — Global Concepts and Tenant Mappings está
concluída pela migration 0067, incluindo a fundação de autoridade global definida
pela ADR-0013. A ADR-0014 está aceita. A PR 3C — Deterministic Template
Application and Snapshots possui Discovery concluída, Implementation Plan
aprovado e IRR tecnicamente concluído. Sua Fase 1 — Infrastructure, incluindo a
migration 0068 — foi incorporada à `main` em `53b12ec`; a Fase 2 — Deterministic
Resolver — foi incorporada em `ed15eca`. A Fase 3 — Trusted Persistence foi
revisada, validada, aprovada e incorporada à `main` no merge `fe08394`. A Fase 4
— Application Layer e composição foi implementada em `a393226` e incorporada à
`main` pelo merge `5c1d12f`. A Fase 5 — contrato retrocompatível foi implementada
em `e5bae39` e incorporada à `main` pelo merge `08bd7cf`. A Fase 6 — Actions e
experiência mínima foi implementada em `3cc8c38` e incorporada à `main` pelo
merge `ca2f173`. A Fase 7 — testes, observabilidade e cutover — foi implementada
em `529be29` e incorporada à `main` pelo merge `95625d4`.

A Fase 8 e a validação final da PR 3C foram concluídas e incorporadas no merge
`5c2675b`. Esse programa permanece como histórico e não é mais o gate ativo.

O MVP-PR1 — Tenant Multiuser Activation — é a execução vigente. A Phase 1 foi
incorporada pela migration 0070 e a Phase 2 pelas migrations 0071/0072, com merge
final `dbf592c`. O ambiente Supabase canônico foi reconstruído pela cadeia
`0001`–`0073`; o hardening 0073 foi incorporado em `f77b229`.

A Phase 3 — Trusted Persistence / Actor != Executor — foi concluída, integrada e
publicada pelo merge `3559a9b`. A migration 0074 está aplicada no projeto
Supabase canônico e alinhada Local/Remote. Sete RPCs v1 autenticadas preservam
`auth.uid()` como ator humano, grants mínimos, idempotência, auditoria,
ownership e concorrência transacional. O serviço mínimo de aplicação, port,
adapter autenticado e Composition Root server-only permanecem sem consumidor
funcional.

A Phase 4 — Application Layer — foi encerrada como **Complete by Prior Delivery**,
sem implementação adicional e sem ter sido executada como fase autônoma. A
fundação prevista — contracts, port, Application Service, adapter autenticado,
Composition Root server-only e testes — já havia sido incorporada de forma
controlada na Phase 3. Nenhuma segunda Application Layer deve ser criada.

As Phases 5, 6 e 7 entregaram, respectivamente, emissão/entrega de convites,
aceite integrado ao Auth e resolução/preferência de tenant. A Phase 8 encerrou o
cutover de autorização pelas migrations 0077/0078 e pela caracterização de suas
fronteiras. A execução vigente é a Phase 9 — Multiuser UI/UX. As PRs 9A–9C foram
concluídas. A PR 9D1 criou uma fronteira `SECURITY DEFINER` mínima para o estado de
membership/invitation de People; a PR 9D2 foi concluída no merge `3f13bbc` e a
9E1 no merge `1e4ccbb` e a 9E no merge `f10d116`. A PR 9F foi concluída no merge
`a6188dd`: regressões multiusuário/DB estão verdes e três defeitos de
feedback/acessibilidade foram corrigidos. O smoke autenticado em browser real,
incluindo mobile e teclado, encontrou um blocker real: os consumers ainda tentam
ler `company_members`, embora `authenticated` intencionalmente não possua SELECT.
A PR 10A foi concluída no merge `9d2a7ec` e adicionou pela migration 0081 a projeção mínima
`get_current_user_active_tenants_v1()` para enumerar somente os tenants ativos de
`auth.uid()`. A PR 10B integra essa fronteira no onboarding, current-user-context,
tenant selection e switcher, eliminando nesses consumers o SELECT direto
impossível. `/app/people/new` e `companies.service.ts` permanecem para avaliação
A PR 10B foi mergeada em `fb4ae6f1c6c71337c5d28be77c88e01bae561fe8`.
A PR 10C migra `/app/people/new` para o contexto server-side e fluxo canônico de
Employee, e remove o `companies.service.ts` sem consumers, sem mudança de DB.
A retomada do smoke encontrou reads diretos bloqueados de Company/Person. A
migration 0082 da PR 10D cria uma projeção mínima de `person_id` e `email` para
owner/admin ativo, sem SELECT grant em `people`; a aplicação permanece para a PR
10E. A PR 10D foi incorporada no merge `06622e2`. A PR 10E integra o nome da
Company pela 0081, o Person ID por `current_person_id`, o contato de emissão pela
0082 e mantém no resend o `destinationEmail` da operação trusted existente, sem
SELECT direto crítico de Company/People nesses consumers.
O MVP continua em 98% até o smoke autenticado passar.

A PR E DB-first cria pela 0087 boundaries separadas de Competencies,
Development plans/goals/actions e templates/goals/actions. Nenhuma UI, mutation,
policy, RLS ou tabela grant integra este recorte. A integração app é o próximo
passo; Human Review continua suspenso e o MVP em 98%.

Na baseline `035ef5f`, a PR F integra essas boundaries nas cinco rotas MVP de
Competencies e Development, sem leitura direta protegida no read path. Writes
continuam pendentes, assim como privacy gates de People/Development e hardening
da 0084; Human Review permanece suspenso e o MVP em 98%.

Antes de produção, Development exige privacy sign-off explícito: a matriz
histórica preservada pela 0087 permite que employee ativo leia plans, goals e
actions de outras pessoas do mesmo tenant.

A integração People + Organization consome as boundaries 0085. A correção
forward-only 0086 preserva o contrato `person` e inclui eventos persistidos com a
terminologia histórica `employee`, sem data migration ou mudança de grants. Os
writes, o privacy sign-off e o hardening da timeline 0084 continuam pendentes;
Human Review permanece suspenso.

O smoke após a PR 10E chegou ao Organization summary e falhou em `getTeams()`:
policies tenant-aware não substituem o SELECT ausente para `authenticated`. A PR
10F1 cria pela migration 0083 projections estreitas de Organization e People,
sem abrir grant de tabela, alterar RLS ou policies. Development, Recruitment,
Competencies e Activity permanecem explicitamente no recorte 10F2.
O merge `003e0b8` concluiu a PR 10F1. A migration 0084 da PR 10F2 fecha os
contratos DB de Development, Competencies, Recruitment e Activity, validada por
replay local integral sem abrir SELECT, RLS ou policy. A aplicação permanece para
a PR 10G. A PR 10F2 foi incorporada no merge `bebfa2f`; a 10G integra o path de
`/app` por um read model server-only que consome as seis projections 0083/0084,
valida seus outputs e não reabre acesso direto às tabelas. Após sua aprovação, o
smoke deve ser retomado com refresh de `/app`.

## Evidência da prioridade

- `HCOS_DOMAIN_AUDIT.md` exige resolver os riscos P0 antes de ampliar o produto;
- FKs company-owned ainda referenciam apenas o ID de diversas entidades.
- ADR-0012 define a estratégia canônica e autoriza hardening incremental por
  agregado; as migrations 0064, 0065 e 0066 concluem, respectivamente, o núcleo
  Organization, People e Competencies, o consumidor Recruitment e o agregado
  operacional de Development.
- PD-018 define a separação entre conceitos globais e competências operacionais,
  e o Implementation Plan aprovado recorta sua entrega em PRs 3B e 3C.
- PD-019 e ADR-0015 definem a ativação multiusuário, identidade, ownership,
  Trusted Persistence e separação entre ator humano e executor técnico.
- as Phases 1–8 do MVP-PR1 materializam a fundação, os fluxos confiáveis e o
  cutover de autorização necessários à UI multiusuário da Phase 9.

Este documento é a fonte oficial de priorização. O plano completo está em
`MVP_PLAN.md`; `NEXT_STEPS.md` contém somente a primeira entrega acima.

Concluído neste gate: autorização de Assessments conforme PD-016 e ADR-0010,
incluindo RLS, leitura administrativa auditável e visibilidade do avaliado.
Concluído também o hardening in-app de Notifications conforme PD-017, ADR-0011 e
migration 0063.
