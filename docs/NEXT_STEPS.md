# Evol OS — Próxima entrega

## Slice 0115-B2-C — Direct-Report Anonymity / Aggregation — CLOSED / PASS

> **Governança (2026-08-27, autoridade = `main`/HEAD `ff2ba6db`).** O slice está
> **concluído em todas as fases** (DB boundary + app integration), com uma dívida
> residual explícita registrada (item Phase 5 abaixo). Nenhuma migration nova além
> da `0119`; contrato de anonimato PD-022 / ADR-0018 preservado ponta a ponta.

### Fases (todas CLOSED / PASS)

- **Phase 1 — DB boundary (`0119`)** — commit `865badd2`; validada localmente
  (pgTAP `Files=62, Tests=2142, PASS`) e **promovida/validada no Canonical Review**
  (`REVIEW 0119: ACTIVE / VALIDATED / PASS`: history + `pg_proc` parity +
  ACL/security + matriz funcional/threat-model `BEGIN … ROLLBACK`, zero `COMMIT`).
  Governança registrada em `3d91ccbb`.
- **Phase 2 — App read boundary** — commit `853dfb44`. `assessment-feedback-read`:
  schema Zod `.strict()` de 7 colunas, repository method, read-model discriminado
  (`forbidden`/`unavailable`/`ok`) com guard-before-RPC, barrel; sem agregação
  client-side; RPC consumido só pela repository.
- **Phase 3 — Presenter / ViewModel** — commit `de166e0`.
  `presentPersonDirectReportAggregate`: rows → ViewModel discriminado
  (quantitative / qualitative / suppressed), precedência fail-closed, reuso de
  `formatAssessmentPercentage` e da copy "Resultado qualitativo"; A e D produzem
  representação indistinguível.
- **Phase 4 — People UX** — commit `ff2ba6db`. Superfície separada **"Feedback de
  subordinados — anônimo"** na página da Pessoa, coexistindo com "Últimas
  avaliações" e Self × Manager; sem CTA individual, sem cardinalidade, sem
  identidade; `forbidden` oculta, `unavailable`/`empty` neutros. Build **PASS no
  Mac**.
- **Phase 5 — Final validation** — sem alteração de código. Cadeia
  `DB 0119 → repository → read-model → presenter → People UX` provada por auditoria
  estática de arquitetura + no-leak, **73 testes determinísticos PASS**, `tsc`
  PASS, `lint` PASS, `git diff --check` limpo; pgTAP inalterado (nenhum `supabase/`
  tocado pelas fases de app). Os invariantes de autorização/anonimato foram
  validados **ao vivo no Canonical Review** pela matriz da Phase 1.

### Dívida residual explícita (aceita — Opção 1)

- **Canonical Review app smoke autenticado ponta a ponta = NOT DEMONSTRATED
  (gated).** Exigiria toggle temporário de Confirm-email + fixtures descartáveis
  persistidas em Review (owner+company+people+cycles+≥4 respostas `direct_report`),
  operações remotas sensíveis que dependem de autorização. Não bloqueante: os
  invariantes que ele checaria já foram provados ao vivo no Review (matriz Phase 1)
  e pela suíte determinística do app. Registrado como dívida, no mesmo padrão da
  "explicit runtime coverage debt" da B2-B2-B.

### Próximo passo normativo

- Não há próxima fase da B2-C.
- **Career / Seniority — Slice 4A = CLOSED / PASS (2026-08-28, HEAD `cb6c68d`).**
  As **Slices 1A–3B** já estavam em `main` (catálogo `0100`/`0101`; profiles
  `0102`/`0106`; lotação `0103–0105`) e a **Slice 4A — Competency Matrix
  Relocation** foi implementada e validada por **`0120`** (matriz
  `position_seniority_competencies` + backfill zero-loss/fail-closed de
  `position_competencies` para o base profile; fonte preservada; sem dual-write) e
  **`0121`** (closed-table privilege hardening, revoke-only, descoberto na validação
  do Review). **Promovidas e validadas no Canonical Review — PASS** (`HISTORY
  0119/0120/0121 = 1`, `POST_CLIENT_EXPOSED_PRIV_COUNT=0`, integridade `0120`
  intacta, RLS=1/POLICIES=2, EXECUTE dos 4 RPCs preservado). **Não reimplementar
  1A–4A.** O próximo gate real do rollout é a **Slice 4B — Competency Matrix +
  Scale Semantics (UI)** (plano §8) — **ainda não iniciada**; exige recovery +
  re-read do
  [Implementation Plan](./execution/CAREER-SENIORITY-POSITION-TAXONOMY-IMPLEMENTATION-PLAN.md)
  + **autorização explícita** (Human Review obrigatório por ser UI) antes de
  qualquer código. O **Position Uniqueness audit gate** (plano §9) permanece um gate
  separado de decisão humana/produto (read-only, nunca automatizar merge).
- Alternativa: quitar a dívida do app smoke da B2-C via runner hard-gated, se o
  Product Architect autorizar o setup sensível.

### Invariantes de ambiente (não reabrir sem decisão)

- Production `gzrrwyiqfbnyprkdeqvm` — **UNKNOWN / REVERIFY BEFORE USE**.
- Legacy `oudngmrdtgengilpqqnz` — **NOT A PROMOTION TARGET**.

### Regra de parada

- Slice 4A encerrada em `0121`; **não criar `0122`** nem alterar `0119`/`0120`/`0121`
  sem autorização. Não iniciar a Slice 4B (UI) sem autorização explícita. Não
  promover Production/Legacy. Sem push.
