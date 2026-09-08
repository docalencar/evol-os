/**
 * Tables whose contents make a run-owned tenant undeletable — RUNNER ONLY.
 *
 * The harness used to discover this the worst possible way: attempt
 * `DELETE FROM companies`, let Postgres raise, and read the error message. That
 * is exception-as-control-flow, and it is wrong twice over — it performs a
 * destructive attempt in order to ask a read-only question, and it can only ever
 * recognise the *first* blocker the database happens to report.
 *
 * This registry replaces that guess with an inventory, derived by auditing every
 * migration rather than by generalising from the one table we tripped over.
 *
 * ## Two distinct blocking mechanisms
 *
 * **Immutable, cascading.** `company_id references companies(id) ON DELETE
 * CASCADE`, plus a `BEFORE DELETE` (or `BEFORE UPDATE OR DELETE`) trigger that
 * raises unconditionally. The cascade reaches the row, the trigger refuses, the
 * whole company delete aborts.
 *
 * **Restricting.** `company_id references companies(id) ON DELETE RESTRICT`. No
 * trigger needed: one row is enough for Postgres to refuse the delete outright.
 *
 * Either way the answer is the same — this tenant cannot be deleted — so both
 * kinds live in one list and are probed identically.
 *
 * ## Why this list is not just `activity_events`
 *
 * `activity_events` is merely the one the org/people flows write on every single
 * create. Treating it as the whole answer would leave a run that happened to
 * touch notifications, approvals, planning or tenant-access silently
 * misclassified as CLEANED, and its delete would then fail at teardown — back to
 * exception-as-control-flow, but now with a wrong classification in front of it.
 */

/**
 * `immutable-trigger` and `restrict-fk` both describe the edge from the table
 * **straight to `companies`**: cascade-plus-refusing-trigger, or a plain
 * `company_id references companies(id) on delete restrict`.
 *
 * `intra-tenant-restrict-fk` is a third shape, found while preparing E2E-4. The
 * table's own `company_id` is `on delete cascade`, so the edge to `companies`
 * looks harmless — but the row carries a `RESTRICT` foreign key to a *sibling*
 * that cascades from the same company. Deleting the company therefore asks
 * Postgres to remove parent and child in one statement while a `RESTRICT` edge
 * runs between them, and `RESTRICT` is checked immediately rather than deferred
 * to the end of the statement the way `NO ACTION` is.
 *
 * Whether that aborts depends on the order the referential-integrity triggers
 * happen to fire, which is not part of any contract we can rely on. **This
 * registry does not claim the delete fails; it declines to claim it succeeds.**
 * Assuming the cascade unwinds cleanly would be inferring safety from the
 * outcome we want, which is the precise habit this module was written to
 * replace. A run holding these rows is classified RETIRED, and RETIRED is
 * always a safe answer: it deletes nothing.
 */
export type BlockingMechanism =
  | "immutable-trigger"
  | "restrict-fk"
  | "intra-tenant-restrict-fk"

/**
 * How the harness is permitted to count rows in this table.
 *
 * `DIRECT_READ` — `service_role` may `SELECT`, so a plain PostgREST head-count
 * works. This is the default and covers almost everything.
 *
 * `PRIVILEGED_COUNT_BOUNDARY` — `service_role` has had `SELECT` **deliberately
 * revoked** (migration 0069), so a direct read returns `403` and no amount of
 * retrying will change that. Counting goes through the counts-only
 * `SECURITY DEFINER` boundary instead.
 *
 * The distinction is recorded here rather than inferred from a failed request,
 * for the same reason the classifier no longer infers strategy from a failed
 * DELETE: a `403` must never be silently reinterpreted as "retained", and a
 * deliberate access boundary is a fact about the schema, not an error.
 */
export type RetentionAccess = "DIRECT_READ" | "PRIVILEGED_COUNT_BOUNDARY"

export type RetentionTable = Readonly<{
  /** PostgREST table name. Every entry is company-scoped via `company_id`. */
  table: string
  mechanism: BlockingMechanism
  access: RetentionAccess
  /** Migration that establishes the block, for anyone re-deriving this list. */
  evidence: string
}>

/**
 * Company-scoped tables that block `DELETE FROM companies`.
 *
 * Ordered so the ones the current product flows actually write come first; the
 * probe reports every non-empty table regardless, because "which one blocked us"
 * is evidence a human will want.
 */
export const COMPANY_RETENTION_TABLES: readonly RetentionTable[] = Object.freeze([
  // Written by EVERY organization/people create RPC, via
  // append_people_organization_activity (0089:59). Guaranteed non-empty for any
  // run that creates a department, team, position or person.
  { table: "activity_events", mechanism: "immutable-trigger", access: "DIRECT_READ", evidence: "0039:158,168" },

  // Notification domain — five immutable tables, all cascading from companies.
  { table: "notifications", mechanism: "immutable-trigger", access: "DIRECT_READ", evidence: "0063:312" },
  { table: "notification_events", mechanism: "immutable-trigger", access: "DIRECT_READ", evidence: "0063:327" },
  { table: "notification_delivery_attempts", mechanism: "immutable-trigger", access: "DIRECT_READ", evidence: "0063:331" },
  { table: "notification_audit", mechanism: "immutable-trigger", access: "DIRECT_READ", evidence: "0063:335" },
  { table: "notification_deliveries", mechanism: "immutable-trigger", access: "DIRECT_READ", evidence: "0063:370" },

  // Approval ledger.
  { table: "approval_decisions", mechanism: "immutable-trigger", access: "DIRECT_READ", evidence: "0046:690" },
  { table: "approval_domain_events", mechanism: "immutable-trigger", access: "DIRECT_READ", evidence: "0046:694" },

  // Planning snapshots.
  {
    table: "organization_planning_snapshots",
    mechanism: "immutable-trigger",
    access: "DIRECT_READ",
    evidence: "0048:154",
  },

  // Tenant-access audit, append-only.
  { table: "tenant_access_audit_events", mechanism: "immutable-trigger", access: "DIRECT_READ", evidence: "0070:204" },

  // RESTRICT straight to companies — no trigger involved, one row is enough.
  // These two keep DIRECT_READ: 0069 revoked `service_role` on the application
  // ledger but deliberately NOT on the version tables.
  { table: "development_template_versions", mechanism: "restrict-fk", access: "DIRECT_READ", evidence: "0068:84" },
  { table: "development_template_version_goals", mechanism: "restrict-fk", access: "DIRECT_READ", evidence: "0068:144" },

  // The application ledger. `revoke all … from service_role` (0069:89) is a
  // deliberate product boundary: only the three SECURITY DEFINER
  // reserve/complete/fail functions may touch these. Counting therefore goes
  // through the counts-only boundary rather than restoring a SELECT grant.
  {
    table: "development_template_applications",
    mechanism: "restrict-fk",
    access: "PRIVILEGED_COUNT_BOUNDARY",
    evidence: "0068:226 blocker; 0069:89 service_role SELECT revoked",
  },
  {
    table: "development_template_application_attempts",
    mechanism: "immutable-trigger",
    access: "PRIVILEGED_COUNT_BOUNDARY",
    evidence: "0068:775 immutable; 0069:89 service_role SELECT revoked",
  },
  {
    table: "development_template_application_snapshots",
    mechanism: "immutable-trigger",
    access: "PRIVILEGED_COUNT_BOUNDARY",
    evidence: "0068:781 immutable; 0069:89 service_role SELECT revoked",
  },
  {
    table: "development_template_application_lineage",
    mechanism: "immutable-trigger",
    access: "PRIVILEGED_COUNT_BOUNDARY",
    evidence: "0068:787 immutable; 0069:89 service_role SELECT revoked",
  },

  // Assessment execution. Both cascade from `companies` on their own edge, and
  // both carry RESTRICT foreign keys into the 0114 execution snapshot — the
  // `intra-tenant-restrict-fk` shape documented above. They are the readable
  // half of the assessment footprint: `service_role` keeps SELECT on them (0112
  // and 0113 revoke only from public/anon/authenticated), so a plain head-count
  // still works and no new boundary is needed.
  //
  // Between them they cover every E2E-4 shape that reaches generation: a
  // response cannot exist without a snapshot (`assessment_execution_snapshot_id`
  // is NOT NULL, 0114:306), and an answer cannot exist without a snapshot
  // question (0114:314). See UNCOUNTABLE_COMPANY_SCOPED_TABLES for the one
  // window this does not close.
  {
    table: "assessment_responses",
    mechanism: "intra-tenant-restrict-fk",
    access: "DIRECT_READ",
    evidence: "0027:8 company cascade; 0114:308 RESTRICT into assessment_execution_snapshots",
  },
  {
    table: "assessment_answers",
    mechanism: "intra-tenant-restrict-fk",
    access: "DIRECT_READ",
    evidence:
      "0028:1 company cascade; 0114:323 RESTRICT into assessment_execution_snapshot_questions, " +
      "0114:333 RESTRICT into assessment_questions",
  },
])

/** Tables the counts-only boundary is responsible for. Derived, never hand-listed. */
export const PRIVILEGED_COUNT_TABLES: readonly string[] = Object.freeze(
  COMPANY_RETENTION_TABLES.filter((entry) => entry.access === "PRIVILEGED_COUNT_BOUNDARY").map(
    (entry) => entry.table,
  ),
)

/** The counts-only boundary. Signature is pinned by pgTAP. */
export const RETENTION_PRESSURE_RPC = "get_company_retention_pressure_v1"

/**
 * Company-scoped tables the residual-graph inspector reports on.
 *
 * This is a superset of the retention list: it answers "what does this tenant
 * still hold?", not "what stops it being deleted?". It lives here so there is
 * exactly ONE place where company-scoped tables are enumerated.
 *
 * It is written out explicitly and reviewed by hand. An earlier revision
 * generated the inspector's list with a regex over the migrations that required
 * `create table if not exists`; `development_template_applications` is declared
 * with a plain `create table`, so it was silently dropped and the inspector's
 * clean run looked like evidence when it had never probed the table at all.
 * Generated lists fail quietly — explicit ones fail in review.
 */
export const COMPANY_SCOPED_TABLES: readonly string[] = Object.freeze([
  "activity_events",
  "approval_assignments",
  "approval_decisions",
  "approval_domain_events",
  "approval_requests",
  "approval_stages",
  "assessment_answers",
  "assessment_cycle_participants",
  "assessment_cycles",
  // The three 0114 snapshot tables are listed so the inspector SAYS SOMETHING
  // about them. `service_role` has no SELECT here (0114:885), so the head-count
  // answers 403 and the residual graph prints `UNREADABLE (…)`. That is the
  // intended outcome: a named access boundary is a fact worth printing, and
  // silence would read as "this tenant holds nothing" — the exact
  // misinterpretation this registry exists to prevent.
  "assessment_execution_snapshot_questions",
  "assessment_execution_snapshot_sections",
  "assessment_execution_snapshots",
  "assessment_questions",
  "assessment_responses",
  "assessment_sections",
  "assessment_templates",
  "assessments",
  "company_members",
  "competencies",
  "departments",
  "development_actions",
  "development_goals",
  "development_plans",
  "development_template_application_attempts",
  "development_template_application_lineage",
  "development_template_application_snapshots",
  "development_template_applications",
  "development_template_version_goals",
  "development_template_versions",
  "development_templates",
  "employee_competencies",
  "events",
  "feedback_acknowledgements",
  "feedback_attachments",
  "feedback_mentions",
  "feedback_messages",
  "feedback_threads",
  "feedbacks",
  // Notification and tenant-access domains. These were absent from the
  // inspector's regex-generated list even though several are retention
  // blockers — the same silent omission that hid the template ledger.
  "notification_audit",
  "notification_deliveries",
  "notification_delivery_attempts",
  "notification_events",
  "notifications",
  "tenant_access_audit_events",
  "organization_planning_change_sets",
  "organization_planning_scenarios",
  "organization_planning_snapshots",
  "organization_planning_workspaces",
  "organization_sync_timeline",
  "people",
  "position_competencies",
  "position_requirements",
  "position_seniority_competencies",
  "position_seniority_profiles",
  "positions",
  "recruitment_job_openings",
  "seniority_levels",
  "teams",
])

/**
 * Company-scoped tables the harness can LIST but cannot COUNT.
 *
 * `service_role` has no SELECT on the three 0114 execution-snapshot tables
 * (`revoke all … from public,anon,authenticated,service_role`, 0114:885), and
 * `BYPASSRLS` does not bypass table privileges. Two consequences, and it matters
 * that they are different:
 *
 * **The inspector** may still name them — a `403` printed as `UNREADABLE` is
 * information. They are therefore in `COMPANY_SCOPED_TABLES`.
 *
 * **The classifier** may not use them. `probeDirect` would return `rows: null`,
 * and `classifyTerminalStrategy` turns any unreadable retention table into
 * `unavailable` — refusing, correctly, to treat "I could not look" as "it is
 * empty". Adding these three to `COMPANY_RETENTION_TABLES` today would make
 * EVERY run unclassifiable, including E2E-0 through E2E-3, and cleanup would
 * stop mutating anything at all. The counts-only boundary cannot rescue them
 * either: `get_company_retention_pressure_v1` (0126) answers for a closed list
 * of exactly the four development-template ledger tables, and 0126's own scope
 * note already anticipated this — *"If it is ever added to the registry, it
 * needs its own reviewed extension of this list."*
 *
 * So they are recorded here rather than added anywhere they would do harm.
 *
 * ## The window this leaves open, stated rather than hidden
 *
 * A run holding snapshot rows but ZERO `assessment_responses` and ZERO
 * `assessment_answers` would not be seen. That shape is not reachable by an
 * assessment journey: generation writes the snapshot and its responses in one
 * RPC, and any journey that gets as far as a cycle has already created people
 * and organization rows, each of which writes an `activity_events` row — itself
 * a retention blocker. The window is real but empty; closing it properly needs
 * an authorised migration extending 0126, which is out of scope here.
 */
export const UNCOUNTABLE_COMPANY_SCOPED_TABLES: readonly Readonly<{
  table: string
  evidence: string
}>[] = Object.freeze([
  { table: "assessment_execution_snapshots", evidence: "0114:885 service_role SELECT revoked" },
  {
    table: "assessment_execution_snapshot_sections",
    evidence: "0114:885 service_role SELECT revoked",
  },
  {
    table: "assessment_execution_snapshot_questions",
    evidence: "0114:885 service_role SELECT revoked",
  },
])

/**
 * Tables that make a run-owned AUTH IDENTITY undeletable.
 *
 * Kept separate because the mechanism differs: these fire on
 * `DELETE FROM auth.users`, not on the company delete.
 *
 * The subtle case is a `SET NULL` foreign key into an immutable table — nulling
 * the column is an UPDATE, which an update-immutability trigger rejects just as
 * firmly as a delete. `activity_events.actor_id` is the known instance;
 * `notification_events.actor_id` is a second one with exactly the same shape.
 *
 * This list is informational: retirement never deletes an auth identity, it bans
 * it. It exists so the evidence explains *why* deletion was not attempted.
 */
export const AUTH_RETENTION_NOTES: readonly Readonly<{ column: string; evidence: string }>[] =
  Object.freeze([
    { column: "activity_events.actor_id (SET NULL into immutable)", evidence: "0039:29,158" },
    { column: "notification_events.actor_id (SET NULL into immutable)", evidence: "0063:86,327" },
    { column: "organization_sync_timeline.created_by (RESTRICT)", evidence: "0040:34" },
    { column: "notification_audit.actor_id (RESTRICT, NOT NULL)", evidence: "0063:172" },
    { column: "tenant_access_operations.actor_user_id (RESTRICT)", evidence: "0070:11" },
  ])
