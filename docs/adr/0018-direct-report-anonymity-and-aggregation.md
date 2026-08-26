# ADR-0018 — Direct-Report Anonymity & Aggregation Architecture

**Status:** Accepted

## 1. Context

A [PD-022](../Product/PRODUCT_DECISIONS.md) define a política de anonimato e
agregação para a perspectiva `direct_report` (feedback ascendente: subordinados
avaliando o próprio gestor). O schema atual já suporta as quatro perspectivas
(`assessment_responses.perspective in ('self','manager','direct_report','legacy_unknown')`,
migration `0115`), com `employee_id` = avaliado e `evaluator_id` = avaliador. O
scoring é autoridade única em `compute_assessment_scored_result_v1` (por response,
baseado no snapshot oficial), fechado a todas as roles de aplicação; os directories
`0117` (avaliado) e `0118` (administrativo por Person) **omitem deliberadamente**
`direct_report` justamente até existir esta política.

Diferente de `self` (≈1) e `manager` (≈1), `direct_report` é **muitos-por-avaliado**
(uma response por subordinado). Exibi-las como responses individuais permitiria ao
avaliado, gestor, RH ou administrador — que conhecem a lista de subordinados —
reidentificar quem disse o quê, sobretudo em times pequenos. Esta ADR registra a
decisão **arquitetural** que sustenta a PD-022; não repete a PD.

## 2. Decision

1. **Trusted aggregate boundary server-only.** A exposição de `direct_report`
   ocorre exclusivamente por uma nova função `SECURITY DEFINER`
   (`get_tenant_person_direct_report_aggregate_v1(p_company_id, p_person_id)`),
   `search_path = public, pg_temp`, concedida a `authenticated` e autorizada a
   `owner`/`admin`/`hr`. **Nenhuma agregação client-side**; nenhuma response
   individual de `direct_report` trafega para o browser.

2. **Unidade de anonimato = `(company, Person/evaluatee, Cycle)`.** Cada ciclo é um
   anonymity set independente. **Sem acumulação entre ciclos**, sem rolling
   aggregate, sem usar ciclos anteriores para atingir o threshold.

3. **Threshold `k = 4`, aplicado server-side por `(Person, Cycle)`.** Com menos de
   4 responses elegíveis, o resultado é **suprimido**: o contrato carrega apenas a
   identidade do ciclo + `suppressed = true`, **sem** score, parcial, cardinalidade
   ou qualquer metadata. Fail-closed.

4. **Elegibilidade.** Participam apenas responses `perspective = 'direct_report'`,
   `status in ('submitted','completed')` e `assessment_visibility <> 'none'`.
   Responses `visibility = none` **não** participam do agregado **nem** da
   cardinalidade e não podem ser inferidas pelo resultado.

5. **Scoring reutilizado, agregação após o scoring individual.** A boundary chama
   `compute_assessment_scored_result_v1` por response (autoridade e snapshot
   inalterados) e então calcula o **agregado quantitativo = média dos `overallScore`
   elegíveis**. Se não houver score quantitativo, o agregado é **qualitativo**
   ("Resultado qualitativo"); `NULL` **nunca** vira zero. A fórmula de scoring não é
   duplicada nem recalculada sobre Questions vivas.

6. **Contrato público minimizado (anti-reidentificação).** O retorno **não** expõe:
   `respondent_count`/cardinalidade (nem quando `N ≥ 4`), `response_id`,
   `evaluator_id`, nome/e-mail do avaliador, timestamps/status individuais,
   `raw_score`, min/max, distribuição, score individual ou ordem das responses. A
   cardinalidade existe **apenas** como variável interna para aplicar `k`.

7. **Isolamento por ciclo (anti-differencing).** Nenhum agregado é revelado antes de
   atingir `k`; não há agregado corrente atualizado à medida que responses chegam;
   ciclos não se misturam. Isso mitiga differencing temporal e por resposta ausente.

8. **Auditoria.** Cada leitura agregada administrativa produz **no máximo um**
   evento via `audit_secure_administrative_read` (reason-coded, ex.
   `view_direct_report_aggregate`) — nunca um evento por response.

9. **Isolamento de tenant.** `company_id` derivado no boundary; Person/Cycle/Response
   coerentes; FKs compostas tenant-safe conforme ADR-0012; `SECURITY DEFINER` como
   nos directories `0117`/`0118`.

10. **Apresentação.** View-model **aggregate-only**, sem `responseId`/`href`/evaluator.
    Em People, superfície **separada** "Feedback de subordinados — anônimo", **sem
    CTA** para response individual e **fora** dos cards de "Últimas avaliações". Em
    Self × Manager, `direct_report` é uma **terceira dimensão independente**
    (Autoavaliação / Gestor / Subordinados diretos — agregado anônimo); **sem** "nota
    geral" combinando perspectivas e **sem** alterar a semântica Self × Manager
    existente.

## 3. Rejected alternatives

- Agregar no client (exigiria enviar responses individuais → vazamento);
- expor `respondent_count`/cardinalidade no contrato público;
- acumular ciclos ou manter rolling aggregate para atingir `k`;
- drill-down administrativo às responses individuais de `direct_report` nesta slice;
- `service_role` ou direct-table read como atalho;
- converter `NULL` de score qualitativo em zero;
- baixar `k` abaixo de 4;
- reutilizar os directories `0117`/`0118` para `direct_report` (contrato individual,
  incompatível com anonimato).

## 4. Consequences

`direct_report` deixa de ser omitido e passa a ser exibível de forma agregada e
anônima, com o segredo (identidade do avaliador) fora do contrato público e do
browser. Em contrapartida, times abaixo de `k` não têm resultado exibível no ciclo,
e o agregado não permite drill-down. A disponibilidade do agregado depende de
participação suficiente por ciclo.

## 5. Security invariants

- Anonimato = impedir razoavelmente a **reidentificação** do avaliador por
  combinação de score, cardinalidade, metadata, tempo ou comparação — não apenas
  ocultar o nome (princípio da PD-022);
- `evaluator_id`/identidade do avaliador nunca observável (nem por owner/admin/hr);
- agregação sempre server-side em trusted boundary; nunca client-side;
- somente snapshot oficial como base de scoring; `compute_assessment_scored_result_v1`
  permanece autoridade única;
- suppression e autorização falham fechado; `< k` não revela nada;
- tenant, Person, Cycle e Responses coerentes; nenhum atravessamento cross-tenant;
- no máximo um evento de auditoria por leitura agregada.
