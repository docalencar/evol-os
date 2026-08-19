# Evol OS — Próxima entrega

## Slice 1A — Seniority Catalog Foundation (DB-first)

### Objetivo

Iniciar a implementação da taxonomia de carreira pelo primeiro slice do
[Implementation Plan versionado](./Execution/CAREER-SENIORITY-POSITION-TAXONOMY-IMPLEMENTATION-PLAN.md)
(Approved), derivado de **PD-021 (Approved)** e **ADR-0017 (Accepted)**. O
**Slice 1A** cria a fundação DB do catálogo de senioridade (`seniority_levels`
company-owned) + trusted boundaries, sem UI: migration + pgTAP → validação local →
STOP. Sem seed obrigatório; empresa pode ter zero níveis. Depois seguem 1B (UI +
Human Review) e os demais slices na ordem do plano. Nada iniciado neste documento.

### Estado confirmado (baseline `d5db5b3`)

- **Competency Catalog Core Mutation Boundary** concluída (commit `d5db5b3`,
  migration `0099`): create/update/archive do catálogo por trusted boundaries,
  Human Review dedicado PASS, pgTAP 43/43, full DB 1365/1365, zero DML direto
  protegido no catálogo.
- **AUTHENTICATED CORE SMOKE = PASS** — Auth/Tenant, Departments, Positions/Cargos,
  People, Competency Catalog, Analytics e Recruitment validados na UI. O Human
  Review core deixa de estar suspenso; os writes core (Organization, People,
  Competency Catalog) e o ciclo de Recruitment operam por trusted boundaries sem
  reads/writes diretos protegidos.

### Governança já decidida (não reabrir)

A taxonomia está resolvida por **PD-021** (Approved) e **ADR-0017** (Accepted):
Departamento/Cargo/Senioridade/Nível hierárquico como eixos ortogonais;
`position_seniority_profiles` como âncora de aplicabilidade Cargo × Senioridade
(base profile com senioridade NULL para cargos sem senioridade); lotação e matriz
de competências referenciando o profile; Departamento derivado da Position;
`expected_level`/`weight` migrando forward-only para a matriz; escalas 1–5 de
proficiência e de peso definidas; gate de auditoria de homônimos antes de qualquer
unicidade de Cargo.

### Ordem de dependência (a ser confirmada no Implementation Plan)

```text
Seniority Catalog
        ↓
Position-Seniority Profiles (âncora de aplicabilidade)
        ↓
People lotação por profile (Departamento derivado)
        ↓
Competency matrix relocation ((profile, competency); catálogo enxuto)
        ↓
Competency Assignments (P1)  →  Gaps  →  Development / Promotion / Succession / Recruitment matching
```

O backlog completo reconciliado após o smoke está registrado no
[PROJECT_STATE](./PROJECT_STATE.md); o recorte e a ordem completa dos slices estão
no Implementation Plan versionado. **Slice 1A é o próximo passo executável**;
nenhum slice está iniciado.
