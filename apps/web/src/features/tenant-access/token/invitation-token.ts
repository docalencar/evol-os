import "server-only"

import { createHash, randomBytes } from "node:crypto"

const INVITATION_TOKEN_BYTES = 32

export type InvitationToken = Readonly<{
  rawToken: string
  digestHex: string
}>

export function digestInvitationToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex")
}

export function generateInvitationToken(): InvitationToken {
  const rawToken = randomBytes(INVITATION_TOKEN_BYTES).toString("base64url")

  return Object.freeze({
    rawToken,
    digestHex: digestInvitationToken(rawToken),
  })
}
