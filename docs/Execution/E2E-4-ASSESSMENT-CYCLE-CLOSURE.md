# E2E-4 — Complete assessment cycle: hosted closure

```
E2E4_STATUS=CLOSED/PASS
HOSTED_RUN=260911193129-2d30b3
TESTS=57/57 PASS  (0 failed, 0 not run)
E2E4_PROPERTIES=15/15 PASS
DURATION=8.9m
TERMINAL_STATE=RETIRED
QUARANTINED=NO
PRODUCT_REGRESSION=NO
SECURITY_REGRESSION=NO
AUTH_REGRESSION=NO
```

E2E-4 is closed because one complete run passed against canonical hosted Review
on the integrated `main` SHA. Local collection, guards and CI were publication
gates; they were not substitutes for this browser evidence. This record captures
the whole path to closure: teardown readiness, the product gaps found and fixed,
the harness failures classified and remediated, the final security and
authorization probes, and the healthy terminal lifecycle.

| | |
| --- | --- |
| Canonical Review | `https://evol-os-review.vercel.app` |
| Supabase Review ref | `rwfvxvbzaosgcyfxdjpt` |
| Deployment / `main` SHA | `6287b894c4a8e92a15632a329d8c3d809e9176ff` |
| Final run | `260911193129-2d30b3` |
| Result | **57/57 PASS**, 0 failed, 0 not run |
| Terminal state | **RETIRED**, postconditions PASS |

---

## 1. What the journey proves

The run exercises the complete assessment cycle through the rendered product:

```
active template
  -> section
    -> competency-linked question
      -> persisted preview
        -> draft cycle
          -> participant
            -> activation
              -> assessment generation + execution snapshot
                -> evaluator answer + reload readback
                  -> submit + immutability
                    -> server-derived score
                      -> assessed-person result
                        -> tenant isolation + role authorization
                          -> healthy retirement
```

The fifteen closure properties are:

| # | Property | Result |
| ---: | --- | --- |
| 1 | Template is created active and read back from the catalog | PASS |
| 2 | A section is created in the template and read back | PASS |
| 3 | A question is linked to a competency owned by the tenant | PASS |
| 4 | Preview renders the persisted template structure | PASS |
| 5 | A cycle is created in draft over the active template | PASS |
| 6 | A person is added to the cycle as participant | PASS |
| 7 | The cycle transitions from draft to active | PASS |
| 8 | Generation produces assessments and freezes the execution snapshot | PASS |
| 9 | The evaluator answers and the response survives reload | PASS |
| 10 | Submit is accepted and the response becomes immutable | PASS |
| 11 | The scored result is derived by the server, not the test | PASS |
| 12 | The assessed person sees their own result in **Meus resultados** | PASS |
| 13 | Tenant B cannot observe tenant A's assessment resources | PASS |
| 14 | A non-admin employee cannot obtain the cycle administration surface | PASS |
| 15 | Teardown reaches healthy `RETIRED` while preserving immutable retention | PASS |

Every normal journey step is reached through product navigation. Direct URLs are
used only for explicit security and authorization probes. Resource identifiers
for those probes are first discovered from run-owned UI links; no database read,
service-role shortcut, fixture-internal id or hardcoded resource id replaces the
browser journey.

---

## 2. Slice closure history

| Slice | Scope | Publication | Closure evidence | Status |
| --- | --- | --- | --- | --- |
| E4-S1 | Assessment teardown readiness | PR `#92`, merge `69f441d31ef99faadd31b5449659fa292e76a1b5` | Post-main CI SUCCESS | CLOSED/PASS |
| E4-S1B | Snapshot retention count boundary | PRs `#93` and `#94`, final main `7f20d74629beea8f2031e26e8e1aac9b4ba19be8` | Review read-only verification PASS | CLOSED/PASS |
| E4-S2 | Catalog, template and cycle, properties 1–7 | PR `#95`, merge `eea29de60b63fd232d080f3c651820edfa0b9ddb` | `260909182519-e46417`, 46/46 PASS, RETIRED | CLOSED/PASS |
| E4-P1 | Evaluator pending-work wiring | PR `#96`, merge `01a72d01a9197582169aebc36100f748adac7a72` | Post-main CI SUCCESS | CLOSED/PASS |
| E4-S3 | Generation, execution, submit and result, properties 8–12 | PRs `#97`, `#100`, `#101`; final merge `a05bee65dbf2d47c60508c4ce128bcfbfd79dced` | `260911121807-37d01c`, 52/52 PASS, RETIRED | CLOSED/PASS |
| E4-S4 | Tenant isolation and role authorization, properties 13–14 | PRs `#102`, `#103`, `#104`; final merge `6287b894c4a8e92a15632a329d8c3d809e9176ff` | Final canonical run, 57/57 PASS | CLOSED/PASS |

### E4-S1 — teardown readiness

Harness observability was extended to the assessment graph. Retention blockers
were modelled for `assessment_responses`, `assessment_answers` and the execution
snapshot family before the complete journey was allowed to create retained data.
This was harness-only work: no product behavior was changed.

### E4-S1B — closed snapshot pressure boundary

Migration `0127` introduced
`get_company_assessment_snapshot_pressure_v1`. The boundary counts snapshot
retention without restoring direct `SELECT` or exposing the tables to the
browser. Validation covered local migrations through `0127`, pgTAP, exactly-once
application in Review, `SECURITY DEFINER`, a safe `search_path`, and `EXECUTE`
for `service_role` only.

Promotion produced a useful operational incident: the mutation applied, but the
post-verifier failed. There was no blind retry. The verifier was corrected, and
a final read-only verification passed. The incident changed verification tooling,
not the already-applied migration or its security posture.

### E4-S2 — catalog and cycle

Candidate `7b4bef4440c24248bad150add2cd8ca833097e29` specified properties 1–7.
Hosted run `260909182519-e46417` completed 46/46 PASS and `RETIRED`, closing the
template-to-active-cycle half of the journey.

### E4-P1 — evaluator pending work

The slice found a real product wiring gap: non-admin evaluators did not receive
their pending-work surface because evaluator responses were loaded only for
admins, and the non-admin assessment home returned before rendering the priority
card. Backend authorization was already correct.

The role-aware correction loads evaluator responses for the authenticated
`personId`, resolves only cycles belonging to that person's open responses, and
renders pending work plus **Meus resultados** for non-admin users. It introduced
no caller-controlled evaluator id, browser service role or authorization widening.
The finding is classified `PRODUCT_GAP / WIRING_GAP`, not an authorization flaw.

### E4-S3 — execution and result

The first scenario used `assessment_visibility = 'none'`; cycle configuration
then became intentionally locked after draft. This was a scenario precondition
blocker, not a product or security defect. The valid journey creates a second
cycle over the same active template, chooses **Resultado completo**, adds the
authenticated employee, activates, generates, and lets that employee execute.

Properties 8–12 were first specified in PR `#97`. Subsequent hosted evidence was
classified before any remediation:

| Hosted run | Observation | Classification |
| --- | --- | --- |
| `260910000901-890ae9` | Navigation did not establish the intended surface | `HARNESS_DEFECT — navigation` |
| `260910160422-9ffd9e` | Redundant navigation to the page already open | `HARNESS_DEFECT — redundant self-navigation` |
| `260910235625-3e0d24` | Employee dashboard invoked the admin-only competency expectation RPC `0124` | `PRODUCT_GAP` |
| `260911010345-e00abb` | Assessment home marker assumed the admin rendering | `HARNESS_DEFECT — role-blind home marker` |
| `260911121807-37d01c` | 52/52 PASS, teardown RETIRED | E4-S3 CLOSED/PASS |

The product gap was closed by the role-aware dashboard in PR `#100`, merge
`de8c283d1650382c15198c8351569b877759e147`. The role-blind harness marker was
fixed by PR `#101`, merge `a05bee65dbf2d47c60508c4ce128bcfbfd79dced`.

### E4-S4 — isolation and authorization

Candidate `45afb304a8016535d3b4ff7e8d901e021303d0b6`, published through PR `#102`
and merge `773b74cd2c3af56b63f7814c9f1f14ee78ee8b16`, added harness-only proofs for:

- tenant B list isolation;
- foreign template id indistinguishable from nonexistent;
- foreign cycle id indistinguishable from nonexistent;
- foreign response/result id indistinguishable from nonexistent;
- denial of the cycle administration surface to a real non-admin employee.

---

## 3. Final-attempt chronology and remediation

### First attempt: several symptoms, no product or security regression

Hosted run `260911125904-a5f6ac` reported 46 passed, 4 failed and 7 not run,
then reached healthy `RETIRED`.

| Point | Evidence-based classification |
| --- | --- |
| Test 24 | `ENVIRONMENTAL / HARNESS_TIMING` |
| Test 31 | `HARNESS_DEFECT / ACTION_COMPLETION_TIMING` |
| Test 34 | `DOWNSTREAM_CASCADE` |
| Test 54 | `HARNESS_DEFECT — incorrect actor switch`; the security probe never began |

PR `#103` closed the harness defects with two commits:

- `386500b172899b3fb55035b2a7b869d2bb40548a` — actor switching through the
  real **Sair** control, `/login`, **Entrar na Evol**, login and authenticated
  shell proof;
- `cf9f65f0daf5ae120f419a76e6424cfa82640f80` — keyboard activation of the
  Seniority trigger plus explicit dialog readiness.

The merge was `43c5153f47895af995985d5147416f0c009ef5e4`. Neither correction used forced
interaction, sleeps or inflated timeouts.

### Second attempt: ambiguous response locator

Hosted run `260911134632-a1feb8` reported 55 passed, 1 failed and 1 not run.
Tests 24, 31 and 34 passed, as did isolation tests 53–55. Test 56 failed before
the security probe and test 57 did not run because the serial group stopped.

The page contained the same employee in two tables: **Participantes**, whose row
has no **Abrir** link, and **Avaliações**, whose row has the response link. A
global row lookup followed by `.first()` selected the wrong table. This was
`HARNESS_DEFECT — AMBIGUOUS_ROW_LOCATOR`; it was not evidence against the
product, tenancy or authorization boundary.

PR `#104`, commit `1167840bb8882baf5dce6aa1624f6c2c7713f82b`, changed discovery to:

```
semantic section with exact heading "Avaliações"
  -> run employee row
    -> "Abrir" link
```

No positional selector, database lookup, fixture-internal id or hardcoded
response id remains. A guard rejects the global pattern. Deliberately restoring
the ambiguous lookup made the guard RED; the byte-identical restore returned it
to GREEN. PR `#104` merged as
`6287b894c4a8e92a15632a329d8c3d809e9176ff`.

---

## 4. Final canonical hosted evidence

Run `260911193129-2d30b3` is the closure authority for E2E-4.

| | |
| --- | --- |
| Main SHA | `6287b894c4a8e92a15632a329d8c3d809e9176ff` |
| Target | `https://evol-os-review.vercel.app` |
| Supabase ref | `rwfvxvbzaosgcyfxdjpt` |
| Canonical target proof | `true` |
| Run company | `e2e-review-260911193129-2d30b3` |
| Run company UUID | `e2d815b1-56b2-4386-a158-9f009f9ca4f5` |
| Tenant B UUID | `2bd0c14a-0617-4f71-82d7-920ab820a824` |
| Collection | 57 tests |
| Result | **57 passed, 0 failed, 0 not run** |
| Duration | 8.9 minutes |

Exactly one hosted execution was made under the final-run authorization. No
retry was needed or performed.

### Final isolation tests

| Test | Proof | Result |
| ---: | --- | --- |
| 53 | Tenant B's assessment lists reveal none of tenant A | PASS — 5.5s |
| 54 | Foreign template and nonexistent template have the same observable denial | PASS — 14.9s |
| 55 | Foreign cycle and nonexistent cycle have the same observable denial | PASS — 14.8s |
| 56 | Foreign response/result and nonexistent response have the same observable denial | PASS — 18.1s |
| 57 | Employee cannot obtain the administrative cycle surface | PASS — 13.5s |

There was no serial cascade.

### Property 13 — tenant isolation is non-oracular

Tenant B list isolation passed. Template, cycle and response/result direct probes
each compared a real tenant A id with an id that exists nowhere and required the
same route and rendered denial, with no tenant A secret in the body.

For response/result specifically, the admin discovered the run-owned response
through the scoped **Avaliações** UI, signed out through the real product control,
logged in as tenant B, proved the tenant B shell, then executed both the foreign
and nonexistent probes before `expectIndistinguishableDenial`. Thus the evidence
is not a hidden-menu assertion: foreign and nonexistent resources are
observationally indistinguishable.

### Property 14 — role authorization is capability denial

Test 57 first discovered the run-owned cycle as admin, then signed out and
authenticated the real employee through the UI. It attempted the administrative
cycle URL directly and proved that the administrative capability and controls
were unavailable. Menu absence was supplementary evidence; the direct attempt
was the primary proof.

### Previous-failure regression check

| Test | Final result |
| ---: | --- |
| 24 | PASS — 11.7s |
| 31 | PASS — 9.3s |
| 34 | PASS — 9.7s |

This final evidence clears the earlier environmental timing, proves the
Seniority readiness correction and eliminates its downstream cascade.

---

## 5. Terminal lifecycle: healthy RETIRED

The final run measured immutable assessment and activity retention before
choosing its lifecycle. Physical deletion was incompatible with that retained
graph, so teardown retired the two run-owned tenants instead.

| Resource | Terminal action/result |
| --- | --- |
| Companies | 2 set inactive |
| Run-owned people | terminated |
| Non-owner memberships | inactive |
| Run-owned auth identities | 4 banned |
| Immutable audit and assessment retention | unchanged |
| `UNKNOWN` | 0 |
| `QUARANTINED` | 0 |

Main-company retention remained:

| Relation | Count |
| --- | ---: |
| `activity_events` | 70 |
| `assessment_responses` | 1 |
| `assessment_answers` | 1 |
| `assessment_execution_snapshots` | 1 |
| `assessment_execution_snapshot_sections` | 1 |
| `assessment_execution_snapshot_questions` | 1 |

The onboarding company retained two `activity_events`. Retention is expected and
is the reason `RETIRED` is the correct healthy outcome; it is not teardown
failure. Postconditions passed before the journal was finalized.

---

## 6. Final classification

```
PRODUCT_REGRESSION=NO
SECURITY_REGRESSION=NO
AUTH_REGRESSION=NO
HARNESS_GAP=NO
HARNESS_DEFECT=NO
PRODUCT_GAP=NO
SECURITY_GAP=NO
ENVIRONMENTAL_BLOCKER=NO
DOWNSTREAM_CASCADE=NO
E2E4_STATUS=CLOSED/PASS
```

The historical product and harness gaps above are closed findings in the journey
chronology. They are not open defects in the final classification.

---

## 7. Methodology conclusions

- Hosted Review evidence closes the journey; local green and CI only qualify the
  candidate.
- Failures are classified from traces and observed state before code changes or
  reruns. A failed security setup step is not a failed security boundary.
- Cross-tenant denial must be non-oracular: foreign and nonexistent resources
  have the same observable result.
- Authorization is proved by attempting the capability as the real role, not by
  checking only whether navigation is hidden.
- Actor switching crosses the real logout and login boundaries and proves the new
  authenticated shell and tenant before probing.
- The test reads server-derived scores and persisted state; it does not reproduce
  scoring logic in the harness.
- Immutable retention is never weakened for cleanup. `RETIRED` is healthy when
  postconditions pass and retained rows remain unchanged.
- Serial cascades are reported as downstream outcomes, never counted as
  independent product failures.

---

## 8. Known non-blocking debt

GitHub Actions emitted a future-runtime warning: actions such as
`actions/checkout@v4` and `actions/setup-node@v4` currently target Node.js 20 and
are being moved to Node.js 24 by the hosted runner. This is
`INFRASTRUCTURE_DEBT — NONBLOCKING`; it did not fail PR or post-main CI and is not
part of E2E-4 remediation.

No workflow or dependency change is included in this closure record.

---

## 9. Operational evidence (not committed)

Only a non-sensitive reference is recorded here. The run directory is gitignored
and no operational credentials or journal contents are part of this document.

| Artifact | Location |
| --- | --- |
| Redacted retired-run archive | `apps/web/e2e/.run/archive/260911193129-2d30b3.retired.json` |

The run-owned identities are banned and both companies are inactive. This record
does not reproduce passwords, tokens, service keys or credential-bearing
connection material.
