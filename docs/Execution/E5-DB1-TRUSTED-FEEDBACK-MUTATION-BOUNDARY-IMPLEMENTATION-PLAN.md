# E5-DB1 — Trusted Feedback Mutation Boundary — Implementation Plan

**Status:** Ready for implementation. **Baseline:** `6303e7ce`. **Migration:**
`NEXT_MIGRATION_NUMBER = derived at implementation time`.

**Normative inputs:** [PD-020](../Product/PRODUCT_DECISIONS.md) (Approved),
[PD-016](../Product/PRODUCT_DECISIONS.md) (Approved),
[ADR-0010](../adr/0010-assessment-authorization.md) (Accepted) and
[ADR-0012](../adr/0012-tenant-owned-referential-integrity-strategy.md)
(Accepted).

## 1. Objective and boundary

Replace the historical Feedback DML path with five purpose-bound trusted
mutations for Assessment Feedback. The release derives the actor and all
conversation identities server-side, creates the modern
`assessment_response_id` bridge, enforces the approved state machine and tenant
integrity, records privacy-safe audit in the same transaction, closes direct DML
bypass, and cuts the existing Actions/Repositories over to the RPCs.

This plan does not implement SQL or application changes. E5-P1 will add the
navigable Assessment-to-Feedback authorship surface. Hosted E2E belongs to later
E5-S slices.

## 2. Frozen product contract

- E2E-5 covers only `type = 'feedback'` created from an eligible modern
  `assessment_response`.
- One response has zero or one formal Assessment Feedback thread.
- Eligible means `perspective = 'manager'` and `status in
  ('submitted', 'completed')`.
- The authenticated evaluator is sender; `employee_id`/evaluatee is receiver.
- Company, participants, type, `visibility = 'participants'`, initial
  `status = 'awaiting_acknowledgement'`, title and timestamps are server-derived.
- The initial message is mandatory. Thread, message and audit are one atomic unit.
- Sender and receiver reply in `awaiting_acknowledgement` or `acknowledged`.
- Receiver alone acknowledges; both participants close; both archive only after
  close. There is no reopen, unarchive or mutation after archive.
- Owner, admin and HR receive no non-participant override.
- `public.feedbacks` is not read, written, backfilled or dual-written.

## 3. Current state

### 3.1 Write path

| Operation | Current path | Disposition |
| --- | --- | --- |
| Create | Action → `openFeedbackConversation` → thread INSERT → message INSERT → best-effort Activity | Replace; Action has no UI caller |
| Reply | Reply form → Action → thread SELECT → message INSERT → best-effort Activity | Adapt UI/Action; replace DML repository |
| Acknowledge | Thread actions → Action → acknowledgement INSERT → thread UPDATE → manual compensation → best-effort Activity | Replace |
| Close | Thread actions → Action → thread UPDATE → best-effort Activity | Replace |
| Archive | Thread actions → Action → thread UPDATE → best-effort Activity | Replace |

The current path depends on policies from migration `0043`. It can partially
persist create/acknowledge operations, accepts caller-controlled domain fields,
contains authorization differences between presenter, service and RLS, and logs
private titles/participants in company-visible Activity after the mutation.

### 3.2 Effective database model

`feedback_threads` has `company_id`, simple person FKs for sender/receiver, a
legacy `assessment_id`, type/status/priority/visibility, mandatory title and
acknowledgement/close timestamps. It has no modern response bridge and no origin
uniqueness.

`feedback_messages` and `feedback_acknowledgements` repeat `company_id` but use
simple FKs. Acknowledgements are unique by `(thread_id, employee_id)`.
Attachments and mentions are deferred but must not be made less safe.

`assessment_responses` uses `employee_id` for evaluatee, `evaluator_id` for
evaluator, and has `company_id`, `assessment_cycle_id`, `status`, `perspective`
and finalization timestamps. Migration `0114` gives cycles and responses
snapshot-scoped composite identity, but responses still need the canonical
`unique (id, company_id)` candidate key required by the new bridge.

The `0088` Feedback readers are stable `SECURITY DEFINER` boundaries with
`search_path = public, pg_temp`, active-membership/participant checks, HR access
only for `visibility = 'hr'`, empty results for inaccessible selectors, revoked
PUBLIC/anon/service-role execution and authenticated-only EXECUTE.

## 4. Schema changes

Add nullable `feedback_threads.assessment_response_id uuid`. Preserve
`assessment_id` unchanged; do not backfill or infer links for historical rows.

Add or reuse canonical candidate keys `unique (id, company_id)` and create these
same-tenant relationships in ADR-0012 order:

```text
feedback_threads(assessment_response_id, company_id)
  → assessment_responses(id, company_id)
feedback_threads(sender_employee_id, company_id)
  → people(id, company_id)
feedback_threads(receiver_employee_id, company_id)
  → people(id, company_id)
feedback_messages(thread_id, company_id)
  → feedback_threads(id, company_id)
feedback_messages(author_employee_id, company_id)
  → people(id, company_id)
feedback_acknowledgements(thread_id, company_id)
  → feedback_threads(id, company_id)
feedback_acknowledgements(employee_id, company_id)
  → people(id, company_id)
```

Nullable author/reference semantics remain unchanged. Add constraints as `NOT
VALID` and validate after preflight when the established migration pattern needs
to protect existing rows. A preflight must prove zero existing cross-tenant
violations; a non-zero count is a HOLD, not an automatic repair.

Create a unique partial index on `(company_id, assessment_response_id)` where
`assessment_response_id is not null`. Including company documents tenant scope;
the composite FK already ensures it matches the response. PostgreSQL uniqueness,
not check-then-insert, enforces the approved `0..1` cardinality.

Create an index supporting participant/history reads only if the existing
sender/receiver indexes do not already cover the final query. Do not add duplicate
indexes for stylistic symmetry.

## 5. Purpose-bound RPC architecture

Implement exactly five functions:

```text
public.create_assessment_feedback_v1(uuid, text) → jsonb
public.reply_feedback_v1(uuid, text) → jsonb
public.acknowledge_feedback_v1(uuid) → jsonb
public.close_feedback_v1(uuid) → jsonb
public.archive_feedback_v1(uuid) → jsonb
```

All functions are `SECURITY DEFINER`, use `set search_path = public, pg_temp`,
fully qualify objects, contain no dynamic SQL, and expose no caller-controlled
company, actor, sender, receiver, type, status, visibility, title, message type,
metadata or timestamps.

Mutation results are intentionally small:

- create: `status`, `feedbackThreadId`, `feedbackMessageId`;
- reply: `status`, `feedbackThreadId`, `feedbackMessageId`;
- acknowledge/close/archive: `status`, `feedbackThreadId`, `threadStatus`.

The canonical readers remain the durable readback authority. Mutation RPCs do
not reproduce thread or message content.

## 6. Actor and selector resolution

Each function first rejects `auth.uid() is null`. It resolves the selected
response or thread internally, derives its company, then requires an active
`company_members` row and resolves `current_person_id(company_id)`. It never
chooses one arbitrary membership for a multi-tenant user.

Create requires current person = response `evaluator_id`. Thread mutations
require current person in `(sender_employee_id, receiver_employee_id)`, with
receiver-only acknowledgement. Corporate role never substitutes for contextual
participation.

Foreign, same-tenant inaccessible and nonexistent response/thread selectors use
one externally indistinguishable unavailable result. Authorization checks occur
before duplicate/result disclosure, so the unique bridge is not an oracle.

## 7. Create transaction and title

`create_assessment_feedback_v1` receives only response ID and initial message.
Inside one transaction it:

1. validates authentication and non-empty bounded content;
2. locks the response row and validates `manager`, final status and evaluator;
3. loads the response's cycle through a same-tenant relationship;
4. validates sender and receiver as distinct same-tenant people;
5. derives title as `Feedback — <cycle name>` when the response/cycle context
   already authorizes both participants to know that name;
6. otherwise uses `Feedback da avaliação`;
7. inserts a `feedback`/`participants`/`awaiting_acknowledgement` thread;
8. inserts the initial `message` authored by sender with empty metadata;
9. inserts restricted, privacy-safe audit;
10. returns only the new IDs and status.

The title is trimmed and bounded to the existing UI-safe contract. It never uses
answers, scores, competencies, person names, initial-message content or arbitrary
metadata. It is not accepted from the caller and never copied into audit.

## 8. State-machine transactions

Every thread mutation uses `SELECT ... FOR UPDATE` before deciding authorization
or state.

| Function | Allowed state/actor | Write |
| --- | --- | --- |
| reply | awaiting/acknowledged; sender or receiver | Insert one message; state unchanged |
| acknowledge | awaiting; receiver | Insert one effective acknowledgement; set acknowledged timestamp/status |
| close | awaiting/acknowledged; sender or receiver | Set closed timestamp/status |
| archive | closed; sender or receiver | Set archived status; preserve closed timestamp |

Reply in closed/archived, acknowledgement in closed/archived, close in archived,
archive before closed and every archived mutation fail closed. `open` and other
conversation types are outside this machine.

## 9. Concurrency and idempotency

- Concurrent create: both calls revalidate authorization; the unique partial
  index guarantees at most one thread. The loser catches `unique_violation`,
  reloads only a same-response thread that the still-authorized evaluator may
  access, and returns `already_exists` with its thread ID. It creates no second
  message or audit.
- Create retry: same behavior as the concurrent loser. It never returns an
  existing identity before rechecking response eligibility and actor authority.
- Reply: not idempotent; every accepted call is a deliberate message. UI must
  serialize submission. A future offline/retry protocol may add an intent key.
- Acknowledge: a retry by the receiver returns `already_acknowledged` without a
  second row or audit. A sender never receives that result.
- Close/archive: an authorized participant retry of the already-achieved state
  returns `already_closed`/`already_archived`, without duplicate audit. Invalid
  predecessor states remain errors.

Lock ordering is response then origin lookup for create, and thread then child
write for other mutations. Reply racing close/archive either commits before the
transition or observes the terminal state and is rejected. Close racing
acknowledge is serialized; the second operation is evaluated against committed
state rather than a stale read.

## 10. Audit architecture — reuse with hardening

Use `activity_events` with `visibility = 'restricted'`, inside each mutation
transaction. Do not call Application `recordActivity` after cutover.

Minimum event data is company, stable operation type, module `feedback`, actor
Auth ID, entity type `feedback_thread`, thread ID and timestamp. Metadata is empty
or contains only a non-sensitive operation discriminator. It excludes title,
message/message ID, response ID, participants, names, assessment/cycle data,
score, competency and content.

Consumer audit:

| Consumer | Classification | Restricted behavior |
| --- | --- | --- |
| `get_tenant_activity_timeline_v1` / Dashboard | ACTIVE | Currently returns restricted rows: must be hardened |
| `get_tenant_entity_activity_timeline_v1` / management detail | ACTIVE | Already filters `visibility = 'company'` |
| Notification activity processing | ACTIVE | Explicitly ignores restricted events |
| Direct Activity/Timeline repositories | COMPATIBILITY | Direct client SELECT is closed; no trusted runtime reliance |
| `audit_secure_administrative_read` | ACTIVE writer | Existing producer of restricted audit |
| pgTAP direct reads | TEST_ONLY | Privileged transaction inspection only |
| retention/residual inspection | ACTIVE operational | Counts rows; does not expose content to tenant users |

Replace `get_tenant_activity_timeline_v1` with the same signature and return
shape but add `where visibility = 'company'`. Extend pgTAP to prove restricted
rows, including Feedback audit, never appear. Keep direct SELECT on
`activity_events` revoked for authenticated users. This closes the demonstrated
exposure without introducing a second audit store or breaking company-visible
Activity.

## 11. Grants, RLS and bypass closure

Revoke INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER and MAINTAIN on
`feedback_threads`, `feedback_messages` and `feedback_acknowledgements` from
PUBLIC, anon and authenticated. Verify direct SELECT remains closed and the
`0088` read RPCs remain the public read path.

For every new function, `revoke all ... from public, anon, authenticated,
service_role`, then grant EXECUTE only to authenticated. Private helpers receive
no client EXECUTE.

Historical `0043` policies are not product authority. Preserve read policies only
where a proven server/internal dependency needs them; replace or remove write
policies after consumer audit because direct grants are closed. RLS remains
enabled as defense in depth. No policy may grant owner/admin/HR non-participant
write access or restore `management` hierarchy access.

The implementation migration records before/after ACL and policy fingerprints so
an accidental widening is a hard failure.

## 12. Application cutover

Database boundary, application adapter cutover and direct-DML revoke are one
release unit to avoid a bypass window or broken deployed application.

- Replace create/reply/acknowledge/close/archive repository DML with strict
  server-only RPC adapters and validated minimal result schemas.
- Keep Server Actions thin: validate user text/UUID, call the adapter, translate
  typed safe errors, and preserve current revalidation/navigation.
- Remove best-effort `recordActivity` calls for these five operations.
- Retire `openFeedbackConversation` compensation logic and direct mutation
  methods after no consumer remains.
- Keep current read queries and presenters. Adjust presenter semantics only where
  required to match the already-approved state machine.
- Create remains without a navigable caller until E5-P1. E5-P1 consumes the new
  create adapter from the Assessment result surface.

No additive DB-only deployment may leave authenticated direct DML as an
alternative authority. If deployment mechanics cannot publish DB and compatible
application together, use an additive compatibility phase with no public UI,
then a single cutover migration/release that switches the adapter and closes DML.

## 13. Error and non-oracle contract

Use the repository's SQLSTATE/message-code pattern internally:

- `42501`: authentication or authorization denied;
- `22023`: invalid/empty/oversized content;
- `55000`: invalid state transition;
- `23505`: origin conflict handled only after reauthorization;
- safe unavailable code for foreign, inaccessible and nonexistent selectors.

Application errors are typed and generic. They never include PostgREST messages,
constraint names, tenant IDs, current state of an inaccessible row or whether a
foreign selector exists. Tests assert parity of status/code/payload for foreign
and nonexistent selectors.

Initial and reply content must be trimmed, non-empty and bounded server-side.
Reuse an established plain-text limit if the current Feedback contract gains one
during implementation discovery; otherwise freeze a documented conservative
limit in the implementation PR rather than building rich-text behavior.

## 14. pgTAP and deterministic tests

### Create and bridge

- unauthenticated and inactive membership denied;
- wrong evaluator and corporate-role-only callers denied;
- foreign/inaccessible/nonexistent response indistinguishable;
- only manager perspective and submitted/completed statuses eligible;
- valid evaluator creates exactly one thread/message/audit;
- company, sender and receiver derived correctly;
- type, participants visibility and awaiting status forced;
- caller cannot provide or override title/domain fields;
- cycle title derived when authorized; neutral fallback otherwise;
- title absent from audit and invisible to non-participants;
- same response retry/concurrent insert yields exactly one thread, initial
  message and create audit;
- no `public.feedbacks` row written.

### Reply, acknowledge, close and archive

- sender/receiver reply in both allowed states; state unchanged;
- non-participant, HR, owner and admin non-participants denied;
- closed/archived reply denied;
- receiver-only acknowledgement, correct transition and one effective row;
- acknowledge retry has no duplicate row/audit; closed/archived denied;
- sender and receiver close from both allowed states;
- only closed can archive; both participants allowed;
- archived blocks every conversational mutation;
- each successful first transition has exactly one restricted audit.

### Security and integrity

- exact five names/signatures, owner, volatility, `prosecdef` and search path;
- authenticated-only EXECUTE; PUBLIC/anon/service-role denied;
- direct client DML and SELECT posture exact;
- composite FK and partial unique-index fingerprints exact;
- attempted cross-tenant response/person/thread/child relationships fail;
- `get_tenant_activity_timeline_v1` excludes restricted rows;
- entity timeline and Notifications retain current behavior;
- direct client cannot read restricted audit;
- forced audit failure rolls back mutation and children;
- foreign/nonexistent oracle equivalence for both selector classes.

Use transaction-scoped fixtures and rollback. Add focused application
repository/Action wiring tests proving RPC-only writes and absence of
`recordActivity`/direct `.from()` mutation calls.

## 15. Migration PRE/POST verification

### PRE

- derive the next migration number from canonical main immediately before work;
- prove bridge column and unique origin index absent;
- prove all five exact signatures and same-name counts absent;
- capture feedback/activity table ACL, RLS and policy fingerprints;
- capture constraints, indexes, triggers and function owners/search paths;
- count null/non-null legacy references and all cross-tenant violations;
- prove current `get_tenant_activity_timeline_v1` body/fingerprint before replace;
- inventory live rows that could invalidate composite FKs;
- HOLD on unexpected objects, duplicate origin data or integrity violations.

### POST

- bridge column, nullability, legacy-column preservation and no artificial
  backfill;
- exact composite FK and validated-state fingerprints;
- unique partial index definition and concurrency proof;
- exact five signatures, namecount one, SECURITY DEFINER, hardened search path;
- exact EXECUTE and table-DML posture;
- Activity restricted audit and company-timeline exclusion;
- state-machine, non-oracle, atomicity and pgTAP suite green;
- `public.feedbacks` definition/count unchanged;
- no unexpected policy/ACL drift and schema cache reload declared.

## 16. Rollout and Review verification

Implementation sequence:

1. refresh baseline and migration number;
2. run read-only PRE inventory and freeze fingerprints;
3. write failing pgTAP for bridge, authorization, transitions and privacy;
4. implement additive bridge/integrity and purpose-bound functions;
5. harden Activity timeline and table/function privileges;
6. cut application repositories/Actions to RPCs and remove best-effort audit;
7. run focused and full pgTAP plus applicable TypeScript, lint, build and tests;
8. audit exact staged scope and publish the implementation PR;
9. after merge, prepare a separate fail-closed Review promotion runner;
10. promote only to canonical Review after explicit human authorization;
11. verify migration history, definitions, ACL/policies, functional matrix and a
    clean dry-run.

Production remains `UNKNOWN / REVERIFY BEFORE USE` and is never a fallback.
Legacy is not a target. Browser hosted E2E is not part of E5-DB1.

Rollback is forward-only: before promotion, revert code and migration while no
remote state exists. After migration, do not delete audit or infer legacy links;
disable new entrypoints and ship a compensating migration preserving threads,
messages and audit. Any partial application/database compatibility risk is HOLD.

## 17. Teardown and retention

Feedback threads, messages, acknowledgements, attachments, mentions and
`activity_events` are already present in the explicit residual graph.
`activity_events` remains an immutable retention blocker, so healthy runs end
`RETIRED`.

The new thread → assessment-response FK adds dependency order. Before hosted
E2E-5, extend the deterministic retirement/dependency audit so Feedback children
precede thread, thread precedes assessment response, and immutable restricted
audit remains visible to operational residual counting without exposing content.
This is a later harness-readiness slice, not E5-DB1 scope.

## 18. Hold conditions

Stop implementation or promotion on:

- migration-number collision or unexpected object with any proposed name;
- existing cross-tenant Feedback relationship;
- duplicate non-null assessment-response origin;
- inability to preserve current Feedback read boundaries;
- inability to close direct DML in the same release unit;
- restricted Activity reachable by a non-participant after hardening;
- any mutation able to commit without its audit, or audit without mutation;
- foreign/nonexistent distinguishability;
- unexpected `public.feedbacks` consumer or write;
- Review identity/history/fingerprint mismatch.

## 19. Deferred scope

E5-P1 authorship UX; hosted conversation/lifecycle/isolation specs; attachments;
mentions; other conversation types; AI generation; automatic sending;
Development/PDI; reopen/unarchive; individual archive; HR moderation;
extraordinary administrative access; `management` retirement; legacy
`public.feedbacks` retirement; Production promotion.

## 20. Completion gate

E5-DB1 is complete only when the trusted functions and application adapters are
the sole human write path, all physical and logical tenant invariants hold, every
approved transition is atomic with private audit, direct DML is closed, focused
and full validations pass, and canonical Review verification passes under a
separately approved promotion gate. E5-P1 does not start from an unverified DB
boundary.
