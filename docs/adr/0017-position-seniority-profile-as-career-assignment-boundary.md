# ADR-0017 — Position-Seniority Profile as Career Assignment Boundary

**Status:** Accepted

## 1. Context

A [PD-021](../Product/PRODUCT_DECISIONS.md) define a taxonomia de carreira:
Departamento, Cargo (Position), Senioridade, Nível hierárquico, Time e Gestor como
eixos ortogonais. O schema atual tem `positions(department_id, hierarchical_level,
status)` e `position_competencies(expected_level, weight, required, type)`, mas não
possui senioridade, não modela a aplicabilidade Cargo × Senioridade, não tem
identidade de negócio de Cargo e duplica `expected_level`/`weight` no catálogo
global `competencies`. Esta ADR registra a decisão **arquitetural** que sustenta a
PD-021; ela não repete a PD.

## 2. Decision

1. **`position_seniority_profiles`** é a entidade de aplicabilidade Position ×
   Seniority. Um profile representa uma combinação Cargo/Senioridade efetivamente
   aplicável.
2. Usa **surrogate id** (não chave composta natural exposta).
3. Possui **tenant/company context** e **FKs compostas tenant-safe**
   (`(position_id, company_id)`, `(seniority_level_id, company_id)`), conforme
   ADR-0012.
4. `seniority_level_id` pode ser **NULL somente** para representar o **base
   profile** de um Cargo que não usa senioridade.
5. Após o rollout, **todo Cargo possui pelo menos um profile**.
6. **People** referencia futuramente `position_seniority_profile_id` — não
   `position_id` + `seniority_id` independentes como source-of-truth da lotação.
7. A **matriz de competências** referencia futuramente
   `(position_seniority_profile_id, competency_id) → expected_level, weight,
   required, type`.
8. Assim a **FK garante** que tanto a lotação quanto a matriz usam uma combinação
   Cargo/Senioridade realmente aplicável.
9. `expected_level`/`weight` deixam de ser conceitualmente globais e migram
   **forward-only** para a matriz; o catálogo global mantém as colunas depreciadas
   até migration própria.
10. **Departamento** permanece **derivado** da Position (`profile → position →
    department`), sem `people.department_id`.
11. **Não** se introduz Job Family/Role Profile agora.
12. Role Profile permanece **evolução futura possível** — o profile é o seam
    natural para essa extração.
13. **Recruitment** deverá convergir para a mesma taxonomia, mas está **fora** do
    slice de implementação desta ADR.

## 3. Alternatives considered

- **A — `people.position_id` + `people.seniority_id` independentes e matriz
  `(position_id, seniority_id, competency_id)`.** Rejeitada: não prova
  aplicabilidade com uma única FK e espalha o par Cargo/Senioridade por duas
  representações que precisam ser mantidas consistentes (risco de matriz/lotação
  para uma senioridade não-aplicável).
- **B — nível de senioridade "N/A" no catálogo.** Rejeitada: polui analytics e
  career com uma senioridade artificial; o "sem senioridade" deve ser estrutural
  (base profile com NULL), não uma entrada de catálogo.
- **C — Role Profile / Job Family agora.** Rejeitada: abstração prematura sem
  necessidade comprovada no domínio atual; introduz dualidade Position × Role
  Profile antes da hora.

## 4. Consequences

Positions ganham identidade de negócio e a expectativa de competência passa a
variar por (Cargo, Senioridade) com integridade referencial. A lotação de People e
a matriz de competências convergem para uma única âncora (`profile_id`),
eliminando a duplicação de `expected_level`/`weight`. Movimentos de carreira
tornam-se conceitos distintos. O custo é uma tabela adicional (`seniority_levels`),
a tabela de profiles e o backfill forward-only das linhas existentes de
`position_competencies` para um base/ default profile.

## 5. Security / Tenancy

Preserva ADR-0012/0013: isolamento tenant estrito, FKs compostas tenant-safe,
`auth.uid()` autoritativo, mutações por trusted boundaries `SECURITY DEFINER` sem
grant de tabela (padrão 0089/0099), fail-closed, sem widening de RLS e sem
`service_role` no caminho humano.

## 6. Migration implications

Forward-only, sem editar migrations antigas: introduzir `seniority_levels`, depois
`position_seniority_profiles` (com base profile por Cargo), migrar a matriz de
`position_competencies` para referenciar o profile e depreciar
`competencies.expected_level`/`weight`, e passar People a referenciar o profile. A
unicidade de negócio de Cargo só após o **audit gate** definido na PD-021. Backfill
mapeia cada `(position, competency)` atual para o base profile do Cargo.

## 7. Future evolution

Extração de Role Profile reutilizável a partir do profile; Job Family; histórico
de assignment com vigências; compensation; readiness/succession. Nenhum deles é
construído agora, e a decisão atual não os impede.
