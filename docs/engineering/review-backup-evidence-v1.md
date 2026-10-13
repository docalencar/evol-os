# Evol Review recoverable backup evidence v1

This contract gates governed migrations; it does not authorize a promotion.
It assumes one governed executor and makes no distributed replay guarantee.

Evidence is a canonical UTF-8 JSON manifest plus a detached Ed25519 signature.
It binds project `rwfvxvbzaosgcyfxdjpt`, environment `review`, source commit,
operation id, ledger interval, migration hashes, artifacts, and a separately
signed restore proof. Unknown/duplicate JSON keys, non-canonical input, unknown
or revoked keys, and test keys outside tests fail closed.

Two byte-identical logical-bundle copies at distinct real paths are required.
This proves copy integrity, not physical storage independence; sibling directories
on one filesystem do not constitute independent media. Each contains a custom
PostgreSQL dump, password-free roles,
extension/ACL/RLS inventory, and the migration ledger. It covers PostgreSQL,
not Storage objects, provider/Auth configuration, secrets, Edge Functions,
networking, logs, or external encryption keys. Those exclusions are explicit in
the manifest. Restore proof means the exact artifact was restored into disposable
PostgreSQL 17 and schema, data, ledger, RLS, ACL, fingerprints, duration, and
teardown passed.

Backup age and RPO are distinct. The signed document may live for at most 24h,
but its backup is operationally fresh for at most 4h. Accepted RPO is 14,400s;
all writes after capture are potentially lost. Accepted RTO is 28,800s and the
measured restore must fit it.

Immediately before a future mutation, one operation verifies both signed
documents and both bundle copies, then atomically creates and fsyncs a claim
(`O_CREAT | O_EXCL`, `0600`, `O_NOFOLLOW`). There is no command that claims an
unverified manifest. A partial or unreadable claim blocks reuse. A claim is
irreversible even after ambiguous failure. A receipt records
`APPLIED_AND_VERIFIED`, `UNKNOWN_REMOTE_OUTCOME`, or
`POST_FAILED_DO_NOT_RETRY`. Before writing a receipt, the same signed manifest is
verified again and every claim binding is reconciled against it. Existing,
corrupt, or divergent records reject the receipt and replay.

The sole local replay authority is derived from the designated repository's
absolute `git rev-parse --git-common-dir` and uses the fixed namespace
`review-backup-consumption/<project_ref>/<operation_id>/`. No CLI, environment
variable, manifest, bundle, or copy chooses this path. The repository top-level,
Git common directory, ownership, permissions, non-symlink directory identity and
claim bindings are validated before use. This authority is local to one
designated workspace: another clone or host does not share it automatically.
The threat model excludes hostile same-user processes and distributed replay.

The operational private key lives outside the repository. The operational
entrypoint reads only the versioned canonical trust store; environment overrides
and test keys are refused. No operational key is included in Slice A. Tests use
an isolated in-process trust store and generate ephemeral keys. Consumption is
safe only under the documented single governed executor model; it is not a
distributed replay lock. Human Review
owns RPO acceptance, external-dependency sufficiency, recovery decisions, and
operational key custody.

The local restore drill emits an unsigned synthetic proof only after teardown and
zero residual resources are confirmed. It compares deterministic source and
restored fingerprints. This is technical test output, never signed operational
Review evidence and never accepted by the operational trust store.
