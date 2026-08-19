# Implementation Plan — Career / Seniority + Position Taxonomy

**Status:** Approved / Versioned
**Baseline:** `a912f16`
**Normative sources:** [PD-021](../Product/PRODUCT_DECISIONS.md) (Approved),
[ADR-0017](../adr/0017-position-seniority-profile-as-career-assignment-boundary.md)
(Accepted), [ADR-0012](../adr/0012-tenant-owned-referential-integrity-strategy.md),
[ADR-0013](../adr/0013-platform-global-authority-and-trusted-execution.md).

## 1. Purpose

Implementar PD-021 + ADR-0017 por rollout incremental —
**additive → backfill → compatibility → cutover → deprecate** — sem big-bang
migration. Cada slice é deployável de forma independente e preserva os invariantes
durante toda a transição.

## 2. Current state (provado no schema)

- `positions(id, company_id, name, description, department_id, hierarchical_level ∈
  {intern..executive}, status ∈ {draft,active,inactive,obsolete}, work arrangement,
  deleted_at, updated_at)`; unicidade só `(id, company_id)` — **sem unicidade de
  negócio**.
- `position_competencies(id, company_id, position_id, competency_id, expected_level,
  weight, required, type)`; FKs `on delete cascade`; unique ativo `(position_id,
  competency_id)`.
- `competencies(name, description, category, active, expected_level, weight)` —
  `expected_level`/`weight` **duplicados/misplaced**.
- `people(position_id NULL, team_id NULL, manager_id NULL)` — sem `department_id`.
- Chaves compostas tenant-safe `(id, company_id)` em people/departments/teams/
  positions/competencies (ADR-0012).
- **Inexistente:** senioridade, profiles, matriz por profile.

## 3. Target architecture

```text
seniority_levels (company-owned, ordered, archiveable, optional)
        ↓
position_seniority_profiles (surrogate id, tenant-safe, position_id,
                             seniority_level_id NULL → base profile)
        ├─ People.position_seniority_profile_id  (lotação; department derivado)
        └─ position_seniority_competencies (profile_id, competency_id,
                                            expected_level, weight, required, type)
competencies (name, description, category, active)   [expected_level/weight deprecated]
gap = expected(profile, competency) − demonstrated(person, competency)
```
Todas as FKs novas usam chaves compostas tenant-safe `(id, company_id)` (ADR-0012).

## 4. Invariants (verificáveis)

Multi-tenant estrito; `auth.uid()` autoritativo; FKs compostas tenant-safe; trusted
boundaries `SECURITY DEFINER` sem grant de tabela; fail-closed; sem RLS widening;
sem `service_role` browser-side. Identidade de Cargo = `(company, department,
normalized title)` (só após audit gate). Todo Cargo tem ≥1 profile; base profile =
senioridade NULL; sem "N/A" artificial. Departamento derivado do profile→position.
Matriz e lotação referenciam o profile. Gap = esperado(profile) − demonstrado(pessoa).

## 5. Compatibility rules

**SINGLE-WRITE AUTHORITY + COMPATIBILITY READ; sem dual-write.**
- **People:** old source `position_id`; nova autoridade futura `position_seniority_profile_id` (additive); `position_id` **permanece** (derivável, não removido).
- **Competency matrix:** old `position_competencies`; new profile-based matrix; a antiga fica compatibility/deprecated durante o rollout.
- **`competencies.expected_level/weight`:** permanecem fisicamente; deixam de ser autoridade após o Slice 4; remoção física = pós-MVP.

## 6. Backfill rules

- **A. Seniority catalog** — **sem seed automático obrigatório**; empresa pode ter zero níveis; UX futura pode oferecer defaults opcionais.
- **B. Profiles** — todo Cargo existente recebe **exatamente um base profile** (`seniority_level_id NULL`); determinístico, idempotente, tenant-safe.
- **C. People** — `position_id NOT NULL` → base profile daquela position → `position_seniority_profile_id`; `position_id NULL` → profile permanece NULL. **Nenhuma pessoa perde seu cargo.**
- **D. Competency matrix** — cada `position_competencies` → base profile → nova matriz, preservando exatamente `expected_level, weight, required, type`. **Zero perda.**

## 7. Slice map final

1A Seniority Catalog Foundation (DB) · 1B Seniority Catalog Admin (UI) · 2A
Position-Seniority Profiles Foundation + base backfill (DB) · 2B Cargo↔Senioridade
Config (UI) · 3A People Profile Assignment + backfill (DB) · 3B People Lotação UX
(UI) · 4A Competency Matrix Relocation + backfill (DB) · 4B Competency Matrix +
Scale Semantics (UI) · 5 Competency Assignments + Gap. **Gate separado:** Position
Uniqueness Audit. **Follow-ups:** career movement/activity; Recruitment Taxonomy
Convergence; Development/Succession consumers; physical removal of deprecated
competency columns (pós-MVP).

## 8. Slices

### Slice 1A — Seniority Catalog Foundation (DB-only)
Objetivo: `seniority_levels` company-owned. Campos: id, company_id, code, label,
rank, active, timestamps. Requisitos: company-owned; composite tenant-safe key; sem
enum rígida; empresa pode ter zero níveis; sem seed obrigatório. Boundaries:
create/update/archive (reorder só se o contrato justificar). Security: SECURITY
DEFINER, hardened search_path, auth.uid, owner/admin/hr, no table grants, no RLS
widening, fail-closed, Activity atômica quando aplicável. Test: focused pgTAP +
full DB + security review. **Sem Human Review** (DB-only). OUT: aplicabilidade, UI.

### Slice 1B — Seniority Catalog Admin (UI)
Objetivo: gerir níveis (create/update/archive/ordenar) em settings/admin. Pré-req:
1A. Migration: nenhuma. Wiring: repository→RPC (padrão 0099). Test: wiring, tsc,
lint, build. **Human Review:** create/update/archive/order/refresh. OUT: profiles.

### Slice 2A — Position-Seniority Profiles Foundation (DB)
Objetivo: `position_seniority_profiles` + base profile obrigatório para todos os
cargos. Cargo sem senioridade = 1 profile com seniority NULL (sem "N/A"). Migration:
tabela (FKs compostas tenant-safe; unique base `(position_id) where seniority NULL`;
unique `(position_id, seniority_level_id)`); boundaries add/remove/activate; backfill
idempotente. pgTAP: **every position has ≥1 profile after backfill**, base
uniqueness, tenant isolation, FK safety, backfill idempotency, no grants. **Sem
Human Review.** OUT: People/matriz. Risco: médio (backfill em massa).

### Slice 2B — Cargo ↔ Senioridade Configuration (UI)
Objetivo: configurar senioridades aplicáveis no Cargo; base-profile semantics.
Pré-req: 2A, 1B. **Human Review:** Analista RH com Jr/Pleno/Sr; Gerente sem
senioridade (base profile); refresh. OUT: People. (Não mexer People ainda.)

### Slice 3A — People Profile Assignment (DB)
Objetivo: `people.position_seniority_profile_id` (additive) + backfill
`position_id → base profile`; **não remover `position_id`**. Boundary de lotação
valida: profile∈position, position∈tenant, Team∈Department, sem cross-tenant.
Pré-req: 2A. pgTAP: backfill, validação de combinação, cross-tenant, fail-closed,
no grants. **Sem Human Review.** Risco: médio (toca People) → additive + compat-read.

### Slice 3B — People Lotação UX (UI)
Objetivo: cascata Departamento→Cargo(filtrado)→Senioridade(aplicável)→Time(compatível)
→Gestor; Departamento explícito na UX mas derivado da Position. Pré-req: 3A.
**Human Review:** combinações válidas/inválidas; refresh. OUT: matriz.

### Slice 4A — Competency Matrix Relocation (DB)
Objetivo: `position_seniority_competencies` (profile-based) + backfill de
`position_competencies` para o base profile, preservando expected_level/weight/
required/type; leituras compatíveis; iniciar deprecação de `competencies.
expected_level/weight`. Pré-req: 2A. pgTAP: **zero-loss por counts**, uniqueness,
cross-tenant, no grants, integridade. **Sem Human Review.** Risco: **alto (dados)**.

### Slice 4B — Competency Matrix + Scale Semantics (UI)
Objetivo: gerir competências esperadas por (Cargo, Senioridade); catálogo global
deixa de pedir expected_level/weight; escalas com legenda. Proficiência: 1 Inicial ·
2 Básico · 3 Proficiente · 4 Avançado · 5 Referência. Peso: 1 Complementar · 2 Baixa
· 3 Importante · 4 Alta · 5 Crítica. Mostrar helper/tooltip/legend. Pré-req: 4A, 2B.
**Human Review:** Cargo+Senioridade, adicionar competência, expected_level/weight com
legenda, required/type; refresh. OUT: assignments.

### Slice 5 — Competency Assignments + Gap (P1)
Objetivo: employee/position assignments no modelo final + gap
(`current_level` vs `expected(profile, competency)`); **sem readiness algorithm**.
Pré-req: 4A. pgTAP + wiring. **Human Review:** atribuir nível demonstrado, ver gap.

## 9. Position uniqueness gate (separado)
Antes de qualquer constraint: listar positions ativas → normalizar títulos só para
análise → detectar duplicatas por `company + department + normalized title` → mapear
FKs → relatório → **decisão humana/produto** (merge/rename/archive) → reconciliar
dados preservando FKs → só então unique index parcial. **Nunca automatizar merge.**
Não incluído em nenhuma migration do rollout normal.

## 10. Human Review matrix
DB-only (1A, 2A, 3A, 4A) → pgTAP + full DB + security, **sem** Human Review UI.
UI (1B, 2B, 3B, 4B, 5) → **Human Review obrigatório**. Uniqueness gate → decisão
humana/produto.

## 11. Test / Security matrix
Cada DB slice: focused pgTAP + full DB — contrato/assinatura, SECURITY DEFINER,
hardened search_path, authenticated-execute/anon-denied, **no table grants**, authz
owner/admin/hr, tenant isolation, cross-tenant, invalid selector, FK integrity,
backfill zero-loss/idempotency, uniqueness. Cada app slice: wiring tests (**zero DML
direto protegido**), tsc `--noEmit`, lint, build (fonts=environment-only), `git diff
--check`; Human Review quando houver UI.

## 12. Data safety (invariantes verificáveis por pgTAP)
Nenhum People perde Position; nenhuma Position fica sem base profile; nenhuma
position_competency perde valores; nenhum assignment órfão; nenhuma vaga perde
referência; nenhum tenant mistura profiles/seniorities; nenhuma uniqueness constraint
antes do audit. Counts antes/depois assertados no mesmo teste.

## 13. Recruitment follow-up (registrado, não implementado)
**Recruitment Taxonomy Convergence** (futuro): job opening → profile/position
authority; department derivado; seniority via profile; `title` só display label.
**Não perder** as dívidas de Recruitment: draft persistence, headcount authority,
replacement, quadro ideal, lifecycle remainder (`cancelled/closed/paused/filled`),
rejection reason, notifications, analytics/stat cards.

## 14. Out of scope
Compensation; candidates/hiring; readiness/nine-box; succession algorithm; Job
Family; Role Profile; behavioral anchors por competência; permissão por nível
hierárquico; employment history estruturado; timeline/Activity UX; remoção física
das colunas depreciadas; implementação de Recruitment; Development/Talent consumption.

## 15. Cutover rules
Por slice: old source → new authority additive → app migra a leitura → single-write
na nova autoridade → deprecation da antiga. Preferir compatibility read; evitar
dual-write inconsistente. `position_id` e `competencies.expected_level/weight`
permanecem fisicamente durante o programa.

## 16. Completion criteria
DB slices todos verdes (pgTAP + full DB); UI Human Reviews todos PASS; People usando
profile com segurança; matriz de competências profile-based; expected_level/weight
fora da UX do catálogo global; assignments trusted; gap funcionando; backfills
provados zero-loss; zero DML direto protegido nos novos write paths; uniqueness gate
resolvido OU explicitamente deferred/documented; Recruitment follow-up preservado;
sem regressão nos gates anteriores.

## 17. Commit strategy (isolado por slice)
Ex.: `feat(career): add seniority catalog foundation` · `feat(career): wire
seniority catalog management` · `feat(career): add position seniority profiles` · …
DB foundation e app wiring em commits separados, conforme o padrão do projeto.

## 18. Recommended first executable slice
**Slice 1A — Seniority Catalog Foundation (DB-first)**: sem dependências, risco
baixo, valida o padrão de boundary da taxonomia e destrava 2A. Fluxo: migration +
pgTAP → validação local → STOP; depois 1B (UI + Human Review).
