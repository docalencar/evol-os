# Evol OS — Roadmap

## O que vem agora?

### Fundação confiável

1. Endurecer integridade relacional entre tenants nas relações organizacionais e
   nos domínios que referenciam pessoas, cargos, times, departamentos e
   competências.

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
`main` pelo merge `5c1d12f`. A PR 3C permanece em andamento: as Fases 5–8 não
foram iniciadas.

O próximo gate é obter aprovação explícita para iniciar a Fase 5 — contrato
retrocompatível — conforme o Implementation Plan. A incorporação da Fase 4 não
autoriza automaticamente essa continuidade. Somente após a conclusão da PR 3C o
produto volta a expandir capacidades funcionais, começando pelo enriquecimento do
modelo de cargos.

## Evidência da prioridade

- `HCOS_DOMAIN_AUDIT.md` exige resolver os riscos P0 antes de ampliar o produto;
- FKs company-owned ainda referenciam apenas o ID de diversas entidades.
- ADR-0012 define a estratégia canônica e autoriza hardening incremental por
  agregado; as migrations 0064, 0065 e 0066 concluem, respectivamente, o núcleo
  Organization, People e Competencies, o consumidor Recruitment e o agregado
  operacional de Development.
- PD-018 define a separação entre conceitos globais e competências operacionais,
  e o Implementation Plan aprovado recorta sua entrega em PRs 3B e 3C.

Este documento é a fonte oficial de priorização. O plano completo está em
`MVP_PLAN.md`; `NEXT_STEPS.md` contém somente a primeira entrega acima.

Concluído neste gate: autorização de Assessments conforme PD-016 e ADR-0010,
incluindo RLS, leitura administrativa auditável e visibilidade do avaliado.
Concluído também o hardening in-app de Notifications conforme PD-017, ADR-0011 e
migration 0063.
