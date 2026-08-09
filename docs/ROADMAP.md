# Evol OS — Roadmap

## O que vem agora?

### MVP Closure — ativação multiusuário do tenant

1. Revisar o escopo residual e obter aprovação explícita do Product Architect
   para iniciar a Phase 4 — Application Layer — do MVP-PR1.

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

A próxima fase prevista no Implementation Plan é a Phase 4 — Application Layer.
Como parte de sua fundação mínima foi incorporada no escopo aprovado da Phase 3,
o próximo gate é revisar o escopo residual para impedir duplicação e então obter
aprovação explícita do Product Architect. A Phase 4 não está iniciada ou
automaticamente autorizada; Actions, UI, Auth Admin, e-mail, seleção de tenant,
cutover RLS e observabilidade posterior permanecem fora do escopo concluído.

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
- as Phases 1/2 do MVP-PR1 materializam a fundação e os invariantes persistentes;
  a Phase 3 materializa as fronteiras confiáveis necessárias às fases seguintes.

Este documento é a fonte oficial de priorização. O plano completo está em
`MVP_PLAN.md`; `NEXT_STEPS.md` contém somente a primeira entrega acima.

Concluído neste gate: autorização de Assessments conforme PD-016 e ADR-0010,
incluindo RLS, leitura administrativa auditável e visibilidade do avaliado.
Concluído também o hardening in-app de Notifications conforme PD-017, ADR-0011 e
migration 0063.
