# E2E-5 — Assessment feedback lifecycle: hosted closure

```
E2E5_STATUS=CLOSED/PASS
HOSTED_RUN=260916024159-e593c0
TESTS=62/62 PASS  (0 failed, 0 interrupted, 0 skipped)
E2E5_PROPERTIES=24/24 PASS
RETRIES=0
WORKERS=1
WORKAROUNDS=0
TERMINAL_STATE=RETIRED
TEARDOWN=HEALTHY
```

E2E-5 is closed because the final canonical run proved the complete frozen
contract against hosted Review. Earlier runs remain part of the history: they
found product, harness and proof gaps, but none of their partial results is used
as a substitute for final-run evidence.

| | |
| --- | --- |
| Canonical Review | `https://evol-os-review.vercel.app` |
| Supabase Review ref | `rwfvxvbzaosgcyfxdjpt` |
| Deployment / `main` SHA | `acc480db605fa385143fe2812599f7f27350c939` |
| Final run | `260916024159-e593c0` |
| Result | **62/62 PASS**, no retry or isolated rerun |
| Frozen contract | **24/24 PROVEN** |
| Terminal state | **RETIRED / HEALTHY** |

---

## 1. Purpose and scope

The journey turns one eligible, finalized manager-perspective assessment into a
formal participant-only Feedback conversation. It proves creation and durable
readback, acknowledgement, two-way conversation, close/archive terminality,
cardinality, privacy, tenant isolation and safe teardown through the rendered
product.

Normal journey mutations use the UI. The only trusted direct mutation is the
deliberate duplicate-creation probe for the cardinality property. Direct URLs are
used only for explicit security probes.

---

## 2. Frozen contract

| # | Property | Final result |
| ---: | --- | --- |
| 1 | An eligible modern finalized manager-perspective `assessment_response` exists | PASS |
| 2 | The evaluator creates Feedback through the canonical UI | PASS |
| 3 | Title, type, visibility, initial status, sender and receiver are server-derived | PASS |
| 4 | The product emits its explicit creation-success signal | PASS |
| 5 | The evaluator durably reads the created Feedback | PASS |
| 6 | The evaluatee sees the Feedback | PASS |
| 7 | The evaluatee opens the initial message | PASS |
| 8 | The receiver acknowledges | PASS |
| 9 | Acknowledgement persists | PASS |
| 10 | The evaluator replies | PASS |
| 11 | The evaluatee replies | PASS |
| 12 | Both messages persist with correct authorship | PASS |
| 13 | A participant closes the conversation | PASS |
| 14 | Closed state persists | PASS |
| 15 | Archive is available only after close | PASS |
| 16 | Archived state persists | PASS |
| 17 | Archived state is terminal | PASS |
| 18 | A second formal Feedback for the same response is blocked | PASS |
| 19 | Same-tenant nonparticipants, including employee, owner, admin and HR, cannot read participant-only Feedback | PASS |
| 20 | Tenant B cannot read tenant A Feedback | PASS |
| 21 | A foreign Feedback id is indistinguishable from a nonexistent id | PASS |
| 22 | Restricted Feedback audit does not leak into the company timeline | PASS |
| 23 | Attachment and mention paths are not required for this MVP journey | PASS |
| 24 | Canonical teardown is healthy and immutable audit is retained | PASS |

The final run itself proved every property. No PASS is inherited only from an
earlier hosted execution.

---

## 3. Lifecycle evidence

The final run independently exercised this sequence:

```
finalized manager assessment
  -> evaluator creates formal Feedback through UI
    -> product success signal
      -> durable evaluator and evaluatee readback
        -> receiver acknowledgement + persisted acknowledgement
          -> evaluator reply + evaluatee reply + authorship readback
            -> close + closed readback
              -> archive + archived readback
                -> terminal mutation denial
                  -> duplicate formal Feedback rejection
```

Success messages precede durable server-backed readback; a toast, action result
or optimistic state alone is not counted as proof. The creation fields are read
from persisted product state rather than supplied by the test.

---

## 4. Security evidence

The run keeps the security properties separate:

- the ordinary same-tenant employee nonparticipant cannot read the thread;
- the same-company owner cannot read it merely because of ownership;
- the same-company administrator cannot read it merely because of role;
- same-company HR cannot read a `participants` thread merely because of role;
- tenant B cannot read tenant A Feedback;
- foreign and nonexistent thread ids have equivalent observable denial;
- restricted Feedback events are absent from the company timeline.

### Property 19 — privileged nonparticipants

Four distinct, run-owned authenticated identities belonged to the Feedback
company and were neither manager/sender nor evaluatee/receiver:

| Probe actor | Real membership | Same company | Nonparticipant | Direct thread probe |
| --- | --- | --- | --- | --- |
| `employee` | `employee` | yes | yes | opaque denial |
| `admin` | `owner` | yes | yes | opaque denial |
| `company_admin` | `admin` | yes | yes | opaque denial |
| `hr` | `hr` | yes | yes | opaque denial |

For every actor, the canonical thread URL was attempted under that actor's own
session. The result was equivalent to the nonexistent-thread control: protected
title and initial message were absent, the thread heading was absent, and the
acknowledge, reply, close and archive controls were absent.

The owner company-timeline assertion belongs only to property 22. It is not used
as evidence for thread-read denial under property 19.

---

## 5. Terminal lifecycle

Teardown measured immutable retention and correctly selected `RETIRED` rather
than physical deletion.

| Resource | Terminal result |
| --- | --- |
| Run-owned companies | 2 inactive |
| Run-owned people | terminated |
| Non-owner memberships | inactive |
| Run-owned auth identities | all 7 banned, including company admin and HR |
| Immutable audit/assessment rows | counts preserved |
| Mutable operational orphan | none reported |
| Active journal | absent after finalization |

`RETIRED` is a healthy result: retained audit and assessment history is expected
and was not weakened to make cleanup appear successful.

---

## 6. Closure progression

E2E-5 required multiple controlled executions because validation exposed real
product and harness/proof gaps. The important progression was:

1. the trusted Feedback database boundary established the mutation and privacy
   contract;
2. E5-P1 made canonical creation reachable from the assessment result;
3. H1 introduced the complete hosted harness;
4. H2/H3 corrected locator classes exposed by hosted execution;
5. P3 corrected Feedback navigation semantics;
6. H4 required durable Position creation proof before dependent work;
7. H5 added direct privileged-nonparticipant coverage for owner, admin and HR;
8. the sixth controlled hosted run proved all 24 properties and retired cleanly.

Historical HOLD and `HARNESS_DEFECT` states were valid at their time. They are
closed findings, not erased history and not the current classification.

---

## 7. Final classification

```
E2E5_STATUS=CLOSED/PASS
FROZEN_CONTRACT=24/24 PROVEN
PRODUCT_REGRESSION=NO
SECURITY_CONTRACT_FAILURE=NO
HARNESS_DEFECT=NO
COVERAGE_GAP=NO
TEARDOWN=RETIRED/HEALTHY
E2E5_RERUN=NOT_REQUIRED
NEXT_HOSTED_RUN=NOT_AUTHORIZED
```

Playwright emitted `NO_COLOR ignored because FORCE_COLOR is set`. This is
`NON_BLOCKING / TOOLING_NOISE`; no configuration change is part of this closure.

---

## 8. Deferred and out of scope

This closure does not promote attachments, mentions, AI-generated Feedback,
auto-send, Development/PDI integration, Development action completion, reviews,
extraordinary administrative access, other Feedback types, reopen/unarchive, HR
moderation, management semantics or peer Feedback. Those remain separate product
decisions or future journeys.

Closing E2E-5 also does not prove the full Development journey. That journey
still requires its own readiness adjudication before a hosted contract is named.

---

## 9. Operational evidence (not committed)

The runtime directory is gitignored. These paths are references only; generated
evidence is not part of this documentation commit.

| Artifact | Location |
| --- | --- |
| Redacted retired-run archive | `apps/web/e2e/.run/archive/260916024159-e593c0.retired.json` |
| Finalized operational journal | `apps/web/e2e/.run/archive/260916024159-e593c0.run.json.retired` |
| HTML report | `apps/web/e2e/.run/report/index.html` |

The next dependency-consistent MVP domain is **Jornada 4 — Desenvolvimento**, as
named in `docs/Product/USER_JOURNEYS.md`. No `E2E-6` designation is created by
this record. Development first needs a readiness/discovery slice to reconcile
privacy, trusted writes, reachable plan creation, action completion and periodic
review requirements. No next journey implementation or hosted run is authorized.
