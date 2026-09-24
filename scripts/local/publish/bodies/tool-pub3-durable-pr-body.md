## The failure

Publishing TOOL-PUB2 got further than before and then stopped:

```
Step 1/9 PASS
Step 2/9 push PASS
STOP: pr_body file not found: /tmp/tool-pub2-pr-body.md
PUBLICATION=BLOCKED
```

The branch had already been pushed. The remote was left holding
`TOOL-PUB2-publish-gate-zero-guards` at the exact candidate with **no PR** — a
partial publication caused by a check that costs nothing and needs no network.

## Root cause

Two faults, one of which is the serious one.

**Ordering.** `pr_body` existence was verified in step 3/9, *after* the push in
step 2/9. A purely local precondition was checked after a remote mutation, so a
wrong path could not fail safely. Dry-run exits at the end of step 1/9 and never
reached that line at all, so it reported `DRY_RUN_OK` for a manifest that could
not publish — the dry-run was not verifying what the real run verified.

**Durability.** The manifest format placed no constraint on the path, and the
README's own example was `pr_body = /tmp/my-pr-body.md`. A body under `/tmp`
exists only on the machine that wrote it. The TOOL-PUB2 manifest was prepared in
one environment and run in another, so the file was simply not there.

## Correction

- `pr_body` is verified in **step 1/9**, before any mutation, and therefore
  identically in dry-run and in a real run;
- the path must resolve **inside the repository**; a relative path resolves from
  the repo root, and an executor-local path is refused *even when it exists*,
  because existence on the preparing machine is not the property that matters;
- the README documents the rule and its example is repository-backed;
- PR bodies now live in `scripts/local/publish/bodies/`, including the one for
  TOOL-PUB2 so its publication can resume.

Fail-closed behaviour for a genuinely missing configured file is unchanged.

## Regression coverage

29/29 pass, six new: a repository-backed body resolves; a configured but missing
body fails closed; a body outside the repository is refused although it exists;
dry-run refuses exactly what a real run refuses; the body check precedes the push
in step order; and the push is never forced and still refuses a divergent remote,
which is what makes resuming from the already-pushed branch safe.

Verified **red** against the pre-fix shape — four of the six fail, including the
dry-run parity test — and green against the correction.

## Scope

Tooling only. This candidate carries TOOL-PUB2 unchanged as its first commit
(`dd17723`), preserved byte-for-byte and pinned in the manifest's `ancestors`.
No product, documentation, migration or environment change.
