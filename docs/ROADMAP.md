# Evol OS — Roadmap

## O que vem agora?

### Fundação confiável

1. Endurecer integridade relacional entre tenants nas relações organizacionais e
   nos domínios que referenciam pessoas, cargos, times, departamentos e
   competências.

O primeiro slice está concluído pela migration 0064: as 14 relações de
Organization, People e Competencies agora preservam fisicamente o tenant. O gate
permanece aberto para os domínios consumidores ainda não endurecidos. O recorte
seguinte deve ser explicitamente priorizado pelo Product Architect a partir do
inventário remanescente; a ADR-0012 não define uma ordem automática entre eles.

Somente depois desse gate o produto volta a expandir capacidades funcionais,
começando pelo enriquecimento do modelo de cargos.

## Evidência da prioridade

- `HCOS_DOMAIN_AUDIT.md` exige resolver os riscos P0 antes de ampliar o produto;
- FKs company-owned ainda referenciam apenas o ID de diversas entidades.
- ADR-0012 define a estratégia canônica e autoriza hardening incremental por
  agregado; a migration 0064 conclui o núcleo Organization, People e
  Competencies sem ampliar o escopo aos consumidores.

Este documento é a fonte oficial de priorização. O plano completo está em
`MVP_PLAN.md`; `NEXT_STEPS.md` contém somente a primeira entrega acima.

Concluído neste gate: autorização de Assessments conforme PD-016 e ADR-0010,
incluindo RLS, leitura administrativa auditável e visibilidade do avaliado.
Concluído também o hardening in-app de Notifications conforme PD-017, ADR-0011 e
migration 0063.
