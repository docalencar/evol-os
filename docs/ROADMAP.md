# Evol OS — Roadmap

## O que vem agora?

### Fundação confiável

1. Definir e aplicar policies das tabelas de notificações e corrigir o diretório
   de destinatários para a entidade `people` existente.
2. Endurecer integridade relacional entre tenants nas relações organizacionais e
   nos domínios que referenciam pessoas, cargos, times, departamentos e
   competências.

Somente depois desse gate o produto volta a expandir capacidades funcionais,
começando pelo enriquecimento do modelo de cargos.

## Evidência da prioridade

- `HCOS_DOMAIN_AUDIT.md` exige resolver os riscos P0 antes de ampliar o produto;
- Notifications habilita RLS sem policies e seu recipient directory consulta
  `employees`, tabela ausente das migrations;
- FKs company-owned ainda referenciam apenas o ID de diversas entidades.

Este documento é a fonte oficial de priorização. O plano completo está em
`MVP_PLAN.md`; `NEXT_STEPS.md` contém somente a primeira entrega acima.

Concluído neste gate: autorização de Assessments conforme PD-016 e ADR-0010,
incluindo RLS, leitura administrativa auditável e visibilidade do avaliado.
