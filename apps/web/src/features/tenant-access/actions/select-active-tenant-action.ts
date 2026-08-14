"use server"

import { randomUUID } from "node:crypto"

import { z } from "zod"

import { createClient } from "@/lib/supabase/supabase/server"

import { selectActiveTenant } from "../preferences/select-active-tenant-persistence"

// MVP-PR1 Phase 7 (PR 7C). Thin server Action to select the active tenant. The
// browser supplies only an intended companyId; it is NOT authority. Actor,
// idempotency key and correlation id are all derived server-side, and the
// trusted RPC re-validates an active membership. No membership is created or
// changed here.
const inputSchema = z.object({ companyId: z.string().uuid() }).strict()

export type SelectActiveTenantInput = z.input<typeof inputSchema>

export type SelectActiveTenantResult =
  | Readonly<{ status: "selected"; companyId: string }>
  | Readonly<{ status: "denied"; message: string }>
  | Readonly<{ status: "session_expired" }>
  | Readonly<{ status: "invalid_input"; message: string }>
  | Readonly<{ status: "failed"; message: string }>

export async function selectActiveTenantAction(
  input: SelectActiveTenantInput,
): Promise<SelectActiveTenantResult> {
  const parsed = inputSchema.safeParse(input)
  if (!parsed.success) {
    return { status: "invalid_input", message: "Empresa inválida." }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    return { status: "session_expired" }
  }

  const result = await selectActiveTenant(supabase, {
    companyId: parsed.data.companyId,
    idempotencyKey: randomUUID(),
    correlationId: randomUUID(),
  })

  if (result.status === "succeeded") {
    return { status: "selected", companyId: result.companyId }
  }
  if (result.status === "denied") {
    return {
      status: "denied",
      message: "Não foi possível selecionar esta empresa com a sua conta.",
    }
  }
  return { status: "failed", message: "Não foi possível selecionar a empresa. Tente novamente." }
}
