import {
  InvitationEntryCard,
  presentInvitationEntryState,
} from "@/features/tenant-access"
// Server-only format guard is intentionally kept out of the general feature
// barrel so its `server-only` marker never reaches barrel consumers.
import { isRawInvitationTokenFormatValid } from "@/features/tenant-access/invitation-token-format"
import { startInvitationContinuationAction } from "@/features/auth/invitation-continuation"
import { createClient } from "@/lib/supabase/supabase/server"

// Public route. The raw token arrives only in the path, is used solely for a
// server-side format check and is bound server-side into the continuation
// actions. It is never rendered, logged, stored client-side, forwarded to query
// params, nor passed to the client as plaintext. Invitation details (company,
// person, role, email, status) are intentionally NOT resolved here — the
// protected invitations table stays behind the acceptance RPC boundary.
export default async function InvitationEntryPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const tokenFormatValid = isRawInvitationTokenFormatValid(token)

  let isAuthenticated = false
  if (tokenFormatValid) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    isAuthenticated = Boolean(user)
  }

  const state = presentInvitationEntryState({ tokenFormatValid, isAuthenticated })

  const loginAction = startInvitationContinuationAction.bind(null, token, "/login")
  const signupAction = startInvitationContinuationAction.bind(null, token, "/signup")

  return (
    <main className="flex min-h-screen items-center justify-center bg-evol-surface px-4">
      <div className="w-full max-w-md">
        <InvitationEntryCard
          state={state}
          loginAction={loginAction}
          signupAction={signupAction}
        />
      </div>
    </main>
  )
}
