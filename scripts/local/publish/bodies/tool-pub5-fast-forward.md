## The observation

PR #169 was open at `f7c22ff`. Adding the TOOL-PUB4 commit produced `a0a110e`,
and the gate refused to push:

```
remote branch exists at f7c22ff… — classify the divergence, do NOT force push
```

## There was no divergence

```
a0a110e  parent = f7c22ff   tree = ce7598a
f7c22ff  parent = dd17723   tree = 8f56f86
dd17723  parent = 1f2a485   tree = 872b0a7

merge-base(f7c22ff, a0a110e) = f7c22ff
a0a110e^                     = f7c22ff
```

The history is strictly linear. `f7c22ff` is the *parent* of the candidate, so
the push adds one commit and rewrites nothing.

Step 2/9 asked whether the remote head was **identical** to the candidate, and
stopped on any inequality. But "not identical" is not divergence — it is the
ordinary case of adding a review commit to a branch whose PR is already open.
The correct question is **ancestry**.

A reconciliation merge would have satisfied the old rule, and it would have been
the wrong repair: a merge commit manufactured to work around a tooling bug,
permanently in the history, hiding the defect instead of fixing it.

## Correction

`scripts/local/publish-push-precondition.sh` decides the push:

| Remote state | Decision |
| --- | --- |
| absent | push (creates the branch) |
| equal to candidate | push (no-op — this is what makes an interrupted publication resumable) |
| ancestor of candidate | push (fast-forward) |
| not an ancestor | **refuse** — classify, never force |
| object absent locally | **refuse** — ancestry unproven, fail closed |

Nothing force-pushes. True divergence is still refused, and so is an unprovable
claim of safety.

It is a separate filter because step 2/9 needs `gh` and a live remote, so the
rule could not be exercised where it is used.

## Regression coverage

43/43 pass, six new: absent remote; remote equal; remote an ancestor (the PR #169
shape, built as a real parent commit in a fixture repo); a genuine sibling
divergence refused; an unknown remote object refused; and a static assertion that
the step decides by ancestry and still never passes `--force`.

Verified red against the restored inequality rule, green against the correction.

## Scope

Tooling only. `dd17723`, `f7c22ff` and `a0a110e` are all carried unchanged and
pinned in the manifest's `ancestors`.
