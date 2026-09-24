## The failure

Publishing the prepared PLN-P6 documentation slice stopped in step 1/9 on macOS:

```
scripts/local/publish-gate.sh: line 167: m_guards[@]: unbound variable
PUBLICATION=BLOCKED
```

Both dry-run and real invocation stopped there. **Nothing was pushed, opened or
merged** — the failure is before any remote mutation.

## Root cause

macOS ships bash 3.2, where an **empty array is indistinguishable from an unset
one**. Under `set -uo pipefail`, both `"${m_guards[@]}"` and `${#m_guards[@]}`
therefore abort whenever a manifest declares no guard — which is most of them.
bash 4.4 changed that rule, so the identical manifest passes on Linux and the
defect is invisible to CI.

## Correction

`nounset` stays enabled; it is contractual.

- the guard array is only ever expanded as `${m_guards[@]+"${m_guards[@]}"}`,
  correct on 3.2 and 5.x alike;
- the count is a plain integer, so `${#m_guards[@]}` is never needed;
- an empty `guard =` value now fails closed at parse time with a named error,
  instead of reaching the loop and reporting a missing file called `""`.

Zero guards runs zero guard commands and passes. **No no-op guard is required.**
One or many guards execute exactly as before.

## Regression coverage

23/23 pass. Seven are new: zero guards continues and reports a zero count; one
guard executes exactly once; three guards each execute in declared order; a
failing guard blocks even when another passed; a missing guard path fails closed;
an empty guard value fails closed rather than counting as zero.

The seventh is **static**, and it is the one that matters: bash ≥ 4.4 cannot
reproduce this defect, so a behavioural test on Linux CI would never catch its
return. It strips comments and known-safe expansions, then asserts no bare
`${arr[@]}` or `${#arr[@]}` survives and that `set -uo pipefail` is still
present. Verified red against a copy with the old idiom restored, green against
the fix.

## Scope

Tooling only — two files under `scripts/local/`. No product, documentation,
migration or environment change.
