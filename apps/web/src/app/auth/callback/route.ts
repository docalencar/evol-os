import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/supabase/server"

// Supabase email-confirmation callback. Exchanges the one-time code for a
// session server-side, then hands off to /auth/continue which resolves any
// pending invitation continuation. No invitation token is read here; the code,
// access token and refresh token are never logged. On failure we redirect to a
// neutral auth page without exposing internal details.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}/auth/continue`)
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}
