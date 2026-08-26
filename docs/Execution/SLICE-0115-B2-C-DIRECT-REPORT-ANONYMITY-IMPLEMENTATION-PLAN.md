# SLICE 0115-B2-C — Direct-Report Anonymity / Aggregation — Implementation Plan

**Status:** Approved (plan). **Implementação não autorizada a iniciar** — aguarda
aprovação explícita do Product Architect (ver Regra de parada).

**Fontes normativas:** [PD-022](../Product/PRODUCT_DECISIONS.md) (Approved) e
[ADR-0018](../adr/0018-direct-report-anonymity-and-aggregation.md) (Accepted).
Baseline `338efd58` (main; Assessment Results 0115–0118 concluída; B2-B2-B
CLOSED/PASS).

## 1. Objetivo

Entregar a exibição **agregada e anônima** da perspectiva `direct_report`,
derivando a migration necessária, o contrato exato da RPC, a suíte de
pgTAP/threat-model, a integração de aplicação e a validação em Canonical Review —
sem enfraquecer anonimato, autoridade de scoring ou isolamento de tenant.

## 2. Fases e dependências

```text
Phase 1 (DB-first)  → migration 0119: aggregate boundary + pgTAP/threat tests → validação local → STOP
Phase 2 (App read)  → schema/repository/query/read-model dedicados (sem client aggregation)
Phase 3 (Presenter) → view-model aggregate-only + suppressed/qualitative/score
Phase 4 (People UX)  → superfície "Feedback de subordinados — anônimo"; 3ª dimensão Self×Manager
Phase 5 (Validation) → DoD gates + Canonical Review DB validation + app smoke
```

Cada fase é uma PR pequena, com um objetivo verificável, na ordem acima. Nenhuma
fase inicia sem a anterior validada.

## 3. Phase 1 — DB-first (migration 0119)

**Migration esperada: `0119` (REQUIRED).** Cria uma nova função trusted
`SECURITY DEFINER`, `set search_path = public, pg_temp`, `EXECUTE` para
`authenticated`, revogada de `public`/`anon`/`service_role`.

### 3.1 Contrato da RPC

```text
public.get_tenant_person_direct_report_aggregate_v1(p_company_id uuid, p_person_id uuid)
returns table(
  cycle_id      uuid,
  cycle_name    text,
  model_name    text,     -- snapshot template name
  cycle_date    date,     -- coalesce(close_date, end_date, start_date)
  aggregate_score numeric, -- média dos overallScore elegíveis; NULL se qualitativo
  is_qualitative boolean,  -- true quando não há score quantitativo agregável
  suppressed     boolean   -- true quando elegíveis < 4 (k)
)
```

- **NÃO** retorna `respondent_count`/cardinalidade, `response_id`, `evaluator_id`,
  nome/e-mail, timestamps/status individuais, `raw_score`, min/max, distribuição,
  score individual ou ordem — conforme PD-022 §Metadata.
- Autorização: `owner`/`admin`/`hr` (via `require`/`has_company_role`), senão
  `42501`; Person deve pertencer à empresa (fail-closed, sem revelar existência).
- Uma linha por Cycle com `≥1` response `direct_report` elegível; quando os
  elegíveis do ciclo forem `< 4`, a linha vem com `suppressed = true` e
  `aggregate_score = NULL`, `is_qualitative = false`, **sem** qualquer outro dado.
- Ordenação determinística por `cycle_date` desc, desempate por `cycle_id`.

### 3.2 Elegibilidade e cálculo (server-side)

- Elegíveis = `perspective = 'direct_report'` + `status in ('submitted','completed')`
  + `assessment_visibility <> 'none'`, escopados por `company_id`/`employee_id`.
- Para cada elegível, chamar `compute_assessment_scored_result_v1(p_company_id,
  response_id)` (autoridade única; snapshot); coletar `overallScore`.
- `count(elegíveis) < 4` ⇒ `suppressed = true` (nada mais).
- `count ≥ 4` ⇒ `aggregate_score = avg(overallScore) filter (where overallScore is
  not null)`; se todos `NULL` ⇒ `is_qualitative = true`, `aggregate_score = NULL`.
- **Sem** acumulação entre ciclos; **sem** rolling aggregate.

### 3.3 Auditoria

- Uma chamada a `audit_secure_administrative_read(p_company_id, 'assessments',
  'person', p_person_id, 'read_person_direct_report_aggregate',
  'view_direct_report_aggregate')` por leitura — nunca por response.

### 3.4 Grants / segurança

- `revoke all ... from public, anon, service_role`; `grant execute ... to
  authenticated`; helper privado (se necessário) fechado a todas as roles.

## 4. pgTAP / threat-model tests (Phase 1)

Provar, transacionado (`BEGIN … ROLLBACK`, `ON_ERROR_STOP=1`):

- **k enforcement:** 3 elegíveis ⇒ `suppressed`, sem score/cardinalidade; 4 ⇒
  agregado exibido.
- **Suppression fail-closed:** `< k` não expõe score, count nem metadata.
- **No cross-cycle accumulation:** dois ciclos com 2+2 nunca somam para 4.
- **Visibility:** responses `none` não entram no agregado nem na contagem.
- **Status:** `draft`/`in_progress`/`cancelled` excluídos sem marcador.
- **Authorization matrix:** `owner`/`admin`/`hr` permitidos; `manager`/`employee`
  e não-membro/cross-tenant negados (`42501`); `auth.uid()` NULL negado.
- **No leak:** payload sem `evaluator_id`/nome/`response_id`/`raw_score`/timestamps
  individuais/`respondent_count`.
- **Score semantics:** média correta; qualitativo ⇒ `is_qualitative`, `NULL` nunca
  vira 0; snapshot como base.
- **Differencing:** adicionar/remover uma response não revela um agregado corrente;
  só cruza `k` de forma discreta.
- **Extreme score:** um score extremo não é isolável (só a média).
- **Tenant coherence:** Person/Cycle/Responses da mesma empresa.
- **Audit:** exatamente um evento por leitura.

## 5. Phases 2–4 — App integration (após 0119 validada)

- **Phase 2:** schema **dedicado** (não reutilizar o schema do directory 0117/0118),
  repository + query + read-model consumindo a RPC via client autenticado; uma
  leitura por Person; **nenhuma** agregação client-side.
- **Phase 3:** presenter/view-model `PersonDirectReportAggregateViewModel`
  (aggregate-only: rótulo "Subordinados diretos — agregado anônimo", score pt-BR /
  "Resultado qualitativo" / estado suprimido "dados insuficientes para exibição
  anônima"); **sem** `responseId`/`href`/evaluator.
- **Phase 4:** superfície People **separada** "Feedback de subordinados — anônimo"
  (sem CTA individual, fora de "Últimas avaliações"); em Self × Manager, terceira
  dimensão independente; sem "nota geral" combinada.

## 6. Phase 5 — Validation

- DoD gates (build, lint, `tsc --noEmit`, testes aplicáveis, `supabase test db`,
  `git diff --check`);
- Canonical Review: promoção explícita da 0119 + readback (parity/ACL) + matriz
  transacionada (threshold/suppression/authorization/no-leak) em `BEGIN … ROLLBACK`;
- application smoke direcionado (agregado exibido ≥k; suprimido <k; sem CTA; sem
  vazamento), registrando explicit debt residual se houver.

## 7. Migration impact

**MIGRATION REQUIRED — `0119`.** A agregação anônima precisa ser server-side em
boundary confiável (agregar no client exigiria enviar responses individuais =
vazamento). Nenhuma outra migration prevista. **`0119` não é criada por este plano.**

## 8. Regra de parada / governança

- Este plano é **DISCOVERY→PLAN aprovado**; **implementação não autorizada** a
  iniciar sem aprovação explícita do Product Architect.
- Não criar `0119`, não alterar schema/RLS/GRANT, não implementar UI/produto neste
  estado.
- Sem promoção de Production (`UNKNOWN / REVERIFY BEFORE USE`) nem Legacy (`NOT A
  PROMOTION TARGET`); sem push não autorizado.
- Uma PR por fase, com validação declarada no handoff.
