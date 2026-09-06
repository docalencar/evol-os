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

export type BlockingMechanism = "immutable-trigger" | "restrict-fk"

export type RetentionTable = Readonly<{
  /** PostgREST table name. Every entry is company-scoped via `company_id`. */
  table: string
  mechanism: BlockingMechanism
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
  { table: "activity_events", mechanism: "immutable-trigger", evidence: "0039:158,168" },

  // Notification domain — five immutable tables, all cascading from companies.
  { table: "notifications", mechanism: "immutable-trigger", evidence: "0063:312" },
  { table: "notification_events", mechanism: "immutable-trigger", evidence: "0063:327" },
  { table: "notification_delivery_attempts", mechanism: "immutable-trigger", evidence: "0063:331" },
  { table: "notification_audit", mechanism: "immutable-trigger", evidence: "0063:335" },
  { table: "notification_deliveries", mechanism: "immutable-trigger", evidence: "0063:370" },

  // Approval ledger.
  { table: "approval_decisions", mechanism: "immutable-trigger", evidence: "0046:690" },
  { table: "approval_domain_events", mechanism: "immutable-trigger", evidence: "0046:694" },

  // Planning snapshots.
  {
    table: "organization_planning_snapshots",
    mechanism: "immutable-trigger",
    evidence: "0048:154",
  },

  // Tenant-access audit, append-only.
  { table: "tenant_access_audit_events", mechanism: "immutable-trigger", evidence: "0070:204" },

  // RESTRICT straight to companies — no trigger involved, one row is enough.
  { table: "development_template_versions", mechanism: "restrict-fk", evidence: "0068:84" },
  { table: "development_template_version_goals", mechanism: "restrict-fk", evidence: "0068:144" },
  { table: "development_template_applications", mechanism: "restrict-fk", evidence: "0068:226" },
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
