#!/usr/bin/env bash
#
# Decide whether pushing the candidate onto an existing remote branch is a
# fast-forward, or a divergence that must be classified by a human.
#
#   bash scripts/local/publish-push-precondition.sh <remote-sha-or-empty> <candidate-sha>
#
# exit 0 : safe to push normally — the remote is absent, already at the
#          candidate, or an ancestor of it.
# exit 1 : refuse — the remote has commits the candidate does not contain, or
#          its object is not present locally to prove otherwise.
# exit 2 : usage error.
#
# WHY THIS EXISTS
#
# The previous precondition was `[ "$REMOTE_BEFORE" != "$m_candidate" ]` and
# stopped on any inequality. That is not divergence, it is merely "not identical":
# it refused the ordinary case of adding a commit to a branch whose PR is already
# open, which is exactly how a review iteration works. A correct rule asks whether
# the remote head is contained in the candidate's ancestry.
#
# It stays fail-closed. Nothing here force-pushes, and an object that cannot be
# proven to be an ancestor is treated as divergent rather than assumed safe.
#
# It is a separate script because step 2/9 of the gate needs `gh` and a live
# remote, so this rule could not be exercised where it is used.

set -uo pipefail

[ $# -eq 2 ] || {
  printf 'usage: publish-push-precondition.sh <remote-sha-or-empty> <candidate-sha>\n' >&2
  exit 2
}

remote="$1"
candidate="$2"

[ -n "$candidate" ] || { printf 'candidate sha must not be empty\n' >&2; exit 2; }

# No remote branch yet: the push creates it.
[ -n "$remote" ] || exit 0

# Already published at exactly this candidate: the push is a no-op, which is what
# makes an interrupted publication resumable.
[ "$remote" = "$candidate" ] && exit 0

# Both objects must exist locally, or ancestry cannot be proven. Refuse rather
# than guess.
git cat-file -e "${remote}^{commit}" 2>/dev/null || {
  printf 'remote commit %s is not present locally; fetch before deciding\n' "$remote" >&2
  exit 1
}
git cat-file -e "${candidate}^{commit}" 2>/dev/null || {
  printf 'candidate commit %s is not present locally\n' "$candidate" >&2
  exit 1
}

# The only safe inequality: the remote head is already contained in the
# candidate, so pushing only adds commits and rewrites nothing.
git merge-base --is-ancestor "$remote" "$candidate" || exit 1
exit 0
