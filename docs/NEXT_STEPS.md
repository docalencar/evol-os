# Evol OS — Próxima entrega

## Product Decision — Career / Seniority + Position Taxonomy

### Objetivo

Definir a taxonomia organizacional que serve de raiz para a faixa P1 do MVP
Closure, antes de qualquer implementação. Esta é a próxima entrega normativa após
a reconciliação do smoke autenticado core; ela é **uma Product Decision**, não
implementação de código, migration ou comportamento.

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

### A Product Decision deve resolver, antes de implementação

- definição de Cargo/título;
- Departamento;
- Senioridade (Jr / Pleno / Sênior) — hoje inexistente no schema;
- Nível hierárquico (já existe em `positions.hierarchical_level`) e por que é
  distinto de senioridade;
- identidade/unicidade de Cargo (hoje homônimos coexistem, sem constraint);
- progressão horizontal (ex.: Analista Pleno → Sênior) vs promoção vertical
  (ex.: Analista → Coordenador);
- relação com People (Departamento explícito na lotação; Cargo filtrado por
  Departamento);
- relação com Competencies (Cargo + Senioridade ↔ Competency).

### Ordem de dependência (registrada, não iniciada)

```text
Career/Seniority + Position Taxonomy   (esta Product Decision)
        ↓
Cargo/Senioridade ↔ Competency
        ↓
Competency Assignments
        ↓
Competency Gaps
        ↓
Development / Promotion / Succession / Recruitment matching
```

O backlog completo reconciliado após o smoke está registrado no
[PROJECT_STATE](./PROJECT_STATE.md). Nenhum item P1 está pré-selecionado nem
iniciado; a Product Decision acima é o próximo passo e não é criada neste
documento.
