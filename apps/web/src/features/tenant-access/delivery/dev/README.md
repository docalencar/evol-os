# Dev-only invitation delivery capture (TEMPORARY — Phase 6 smoke)

This directory contains a **temporary, development-only** substitute for the
invitation-link transport, used to run the first real acceptance smoke without a
verified email domain. It is a local **mailcatcher**: it records the invitation
URL in memory and reports an accepted delivery, so the owner can reveal/copy the
link on a dev-only page and continue the real signup + acceptance flow.

## Double gate (both required)

The capture transport activates **only** when BOTH are true:

- `process.env.NODE_ENV === "development"`
- `process.env.DEV_INVITATION_CAPTURE_ENABLED === "true"`

If either is false (including any production build, or development without the
flag), the real Resend transport is used, unchanged. There is no `.env.example`
in this repo; set the flag **manually** in `apps/web/.env.local` **only** for the
smoke, then remove it:

```
DEV_INVITATION_CAPTURE_ENABLED=true
```

Never default this to `true`.

## What it does / does not do

- Keeps the real Issue Action, orchestration, issue RPC and **digest-only**
  persistence. Only the delivery transport is substituted, under the double gate.
- Records only `{ invitationUrl, destinationEmail, capturedAt }` in a
  `globalThis`-namespaced in-memory holder (single latest capture, 10-min TTL).
- Never writes to a database, filesystem, cookie, browser storage, log, analytics
  or audit payload. Never uses `service_role`. No RLS/grant/migration change.
- Introduces no second acceptance-authority path; the accept RPC remains the sole
  grantor of membership/People binding.

## Files to remove after the smoke

- `apps/web/src/features/tenant-access/delivery/dev/` (this whole directory)
- `apps/web/src/app/(dashboard)/app/dev/invitation-capture/` (reveal UI)
- Revert the double-gate branch in
  `apps/web/src/features/tenant-access/delivery/server/create-server-tenant-invitation-delivery.ts`
- Unset `DEV_INVITATION_CAPTURE_ENABLED` in `apps/web/.env.local`
