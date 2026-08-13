# MVP-PR1 · Phase 6 — Real Acceptance Smoke Evidence

Factual record of the first real end-to-end invitation acceptance smoke. It
references decisions in ADR-0015 (tenant multiuser activation) and ADR-0016
(invitation delivery) and the Phase 6 implementation plan. No raw invitation
token, invitation URL, token digest, password, access/refresh token, API key or
secret is recorded here.

## Scope

- Environment: local development.
- Target identity: a controlled test mailbox (`galileu_ga@hotmail.com`).
- Delivery of the invitation link during the smoke used a temporary, dev-only,
  double-gated capture transport (`NODE_ENV=development` +
  `DEV_INVITATION_CAPTURE_ENABLED=true`). That scaffolding is removed in this PR;
  production always uses the real Resend transport.

## Flow exercised (all real, except the invitation-link transport)

owner → People created via the normal `/app/people` flow → real Issue Action →
real issue orchestration → real `issue_company_member_invitation_v1` RPC → digest
persisted (raw token server-only) → dev-only capture transport recorded the link
in memory → owner revealed the link by human action → real signup → email
confirmation (Supabase Auth) → `/auth/callback` → `/auth/continue` →
`/invite/[token]` → human click "Aceitar convite" → real accept Action → real
`accept_company_member_invitation_v1` RPC → `People.user_id` linked → active
`employee` membership → invitation accepted → "Continuar" → `/app` → server-side
tenant resolver → access as employee → same-actor replay.

## Live-state evidence (verified read-only in Supabase Studio)

- People: `status = active`; `user_id` = the confirmed auth user.
- Auth: `email_confirmed = true`.
- Membership: count = **1**; role = `employee`; status = `active`.
- Invitation: `status = accepted`; `generation = 1`; `accepted_at` set;
  `accepted_by_user_id` = the confirmed auth user.
- Audit: `invite.accepted = 1`, `membership.created = 1`, `person.linked = 1`.
- Operations: `invite_accept` succeeded = **2** (first accept + one replay click).

## Interpretation

The same-actor replay was idempotent and safe: it produced one additional
completed `invite_accept` operation row but **did not** create a second
membership, did not re-link People, and did not duplicate any audit event. This
matches the accept RPC contract (already-accepted, same-actor branch returns the
existing membership without further mutation).

## Classification

- **REAL ACCEPTANCE SMOKE PASSED**
- **SECURITY / DATA INTEGRITY: PASS**

## Follow-up (non-blocking)

- UX/Presentation: reopening an already-accepted invite as the same actor
  re-shows the "Aceitar convite" button, and a further click returns an
  idempotent success. Safe (no data duplication). Any change to show an
  "already accepted → Continue" state would require a dedicated safe read path
  (a SECURITY DEFINER read RPC); it is intentionally NOT implemented here and is
  not part of this cleanup.
- Test-data cleanup (the smoke People/Auth/membership/invitation) is a separate,
  deliberate step and is not performed in this PR.
