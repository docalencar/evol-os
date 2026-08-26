# Evol OS — Próxima entrega

## Slice 0115-B2-C — Direct-Report Anonymity / Aggregation Discovery (DISCOVERY ONLY)

### Objetivo

Definir, em modo **discovery only**, o contrato seguro que permitirá futuramente
expor a perspectiva `direct_report` nos Assessment Results — deliberadamente
omitida desde B2-A/B2-B2 até existir política de anonimato. Nenhuma implementação
neste passo: discovery → (futuras) Product Decision/ADR → Implementation Plan
versionado → implementação.

A discovery deve cobrir, no mínimo:

- anonimato e proteção contra reidentificação;
- cardinalidade mínima e comportamento para grupos pequenos;
- estratégia de agregação (sem média individual que permita inferência);
- relação com `assessment_visibility`;
- ausência de qualquer evaluator identity leak;
- apresentação em People e em Assessments;
- coerência com o boundary administrativo já validado na migration `0118`.

### Estado confirmado (baseline `338efd5872a7f861c09fa5fe9815be23bfba846e`)

- Trilha **Assessment Results 0115–0118** concluída e alinhada em `0118` (Local e
  Canonical Review); ver [CHANGELOG](./CHANGELOG.md) e
  [ENVIRONMENT-MIGRATION-STATUS](./execution/ENVIRONMENT-MIGRATION-STATUS.md).
- **B2-B2-B — People “Últimas avaliações” = CLOSED / PASS** (commit `338efd58`,
  `feat(people): add recent assessment results`).
- Canonical Review DB boundary (`0118`) validado (matriz multi-role transacionada,
  27 assertions, `ROLLBACK`); application smoke **PASS no subset executado**.
- **Explicit runtime coverage debt** (não executada; não marcada como executada):
  render runtime in-tenant de Admin/HR e Manager/Employee por role específica;
  resultados quantitativos e qualitativos reais; CTA/return-context e deep-link
  `assessments-results` com `responseId` real. Não bloqueante — coberto pelo
  boundary `0118` validado e por cobertura determinística automatizada.

### Governança / adiado (não reabrir sem decisão)

- A trilha **Career / Seniority** (PD-021 Approved, ADR-0017 Accepted, Slice 1A —
  Seniority Catalog Foundation) permanece **planejada e adiada**; não é o próximo
  passo agora. A autoridade atual é o estado real do `main`/HEAD.
- Production `gzrrwyiqfbnyprkdeqvm` — **UNKNOWN / REVERIFY BEFORE USE**.
- Legacy `oudngmrdtgengilpqqnz` — **NOT A PROMOTION TARGET**.

### Regra de parada

- B2-C começa como **DISCOVERY ONLY**; nenhuma migration, RPC, RLS, UI ou `0119`.
- Nenhuma implementação até discovery aprovada e Implementation Plan versionado.
- Sem promoção de ambiente e sem push como parte desta reconciliação.
