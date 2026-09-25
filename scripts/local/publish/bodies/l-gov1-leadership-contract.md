## Objective

Canonize the already-frozen L-P1 Leadership MVP contract under the repository's
case-sensitive `docs/Execution/` authority and reconcile only the canonical state
references made stale by published L-DB1/L-P2.

## Scope

- preserves the frozen L-P1 contract bytes and semantics;
- adds the contract to the documentation map;
- records L-DB1 migration `0140` and the published L-P2 cutover;
- advances the documented next gate to L-E2E0 without creating or running E2E.

No application, database, migration or environment change is included.

## Validation

- committed-tree link validation;
- case-sensitive Git-index path validation;
- exact diff-scope validation;
- `git diff --check`;
- canonical publication-gate dry-run.
