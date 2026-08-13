import "server-only"

// TEMPORARY — MVP-PR1 Phase 6 real acceptance smoke ONLY.
// Dev-only, in-memory "mailcatcher" state for the invitation-link transport.
// It never persists to a database, filesystem, cookie, browser storage, log or
// audit payload. Remove after the smoke (see ./README.md).

const CAPTURE_TTL_MS = 10 * 60 * 1000

export type DevInvitationCapture = Readonly<{
  invitationUrl: string
  destinationEmail: string
  capturedAt: number
}>

type CaptureHolder = { current: DevInvitationCapture | null }

// Namespaced on globalThis so the value survives Next.js dev module
// re-evaluation (HMR) within the single dev server process, between the Issue
// Server Action (which writes it) and the owner reveal read.
const GLOBAL_KEY = "__evolDevInvitationCapture__"

function holder(): CaptureHolder {
  const globalStore = globalThis as unknown as Record<string, CaptureHolder | undefined>
  const existing = globalStore[GLOBAL_KEY]
  if (existing) return existing
  const created: CaptureHolder = { current: null }
  globalStore[GLOBAL_KEY] = created
  return created
}

export function recordInvitationCapture(invitationUrl: string, destinationEmail: string): void {
  // Keep only the latest capture — no unbounded history.
  holder().current = { invitationUrl, destinationEmail, capturedAt: Date.now() }
}

export function readInvitationCapture(): DevInvitationCapture | null {
  const store = holder()
  const capture = store.current
  if (!capture) return null
  if (Date.now() - capture.capturedAt > CAPTURE_TTL_MS) {
    store.current = null
    return null
  }
  return capture
}

export function clearInvitationCapture(): void {
  holder().current = null
}
