"use server"

import { redirect } from "next/navigation"

import { writeInvitationContinuation } from "./invitation-continuation"

export type ContinuationAuthDestination = "/login" | "/signup"

// Invoked by the invite page's "Entrar"/"Criar conta" form buttons. The raw
// token and destination are bound server-side (Next encrypts action arguments),
// so the token never appears in a URL, query string, or client-readable prop.
// The continuation cookie is set (if the token format is valid) and the user is
// redirected to the requested internal auth page.
export async function startInvitationContinuationAction(
  rawToken: string,
  destination: ContinuationAuthDestination,
  _formData: FormData,
): Promise<void> {
  void _formData
  await writeInvitationContinuation(rawToken)
  redirect(destination)
}
