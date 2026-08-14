import "server-only"

// MVP-PR1 Phase 7 (PR 7C). Minimal adapter over the trusted RPC
// `select_active_tenant_v1`. It only forwards the intended company id plus
// server-generated idempotency/correlation; the RPC (SECURITY DEFINER) derives
// the actor from auth.uid() and re-validates active membership. Results are
// mapped to a small internal union; raw DB/PostgREST errors never escape.
export type SelectActiveTenantPersistenceResult =
  | Readonly<{ status: "succeeded"; companyId: string }>
  | Readonly<{ status: "denied" }>
  | Readonly<{ status: "unexpected_persistence_failure" }>

export interface TenantSelectRpcClient {
  rpc(
    name: string,
    params: Readonly<Record<string, unknown>>,
  ): PromiseLike<Readonly<{ data: unknown; error: unknown }>>
}

export type SelectActiveTenantIntent = Readonly<{
  companyId: string
  idempotencyKey: string
  correlationId: string
}>

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export async function selectActiveTenant(
  client: TenantSelectRpcClient,
  intent: SelectActiveTenantIntent,
): Promise<SelectActiveTenantPersistenceResult> {
  try {
    const response = await client.rpc("select_active_tenant_v1", {
      p_company_id: intent.companyId,
      p_idempotency_key: intent.idempotencyKey,
      p_correlation_id: intent.correlationId,
    })

    if (response.error) {
      return { status: "unexpected_persistence_failure" }
    }

    const envelope = response.data
    if (isRecord(envelope)) {
      const status = envelope.status
      if (
        (status === "succeeded" || status === "idempotent_retry") &&
        isRecord(envelope.result) &&
        typeof envelope.result.preferredCompanyId === "string"
      ) {
        return { status: "succeeded", companyId: envelope.result.preferredCompanyId }
      }
      if (status === "denied") {
        return { status: "denied" }
      }
    }

    return { status: "unexpected_persistence_failure" }
  } catch {
    return { status: "unexpected_persistence_failure" }
  }
}
