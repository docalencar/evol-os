import type { RemoteSnapshot, TurnoverBootstrapAdapter, TurnoverObservation } from "./bootstrap-runner"

/**
 * Credential-free boundary definitions for the future Review transport.
 * The entrypoint that receives authorization supplies authenticated functions;
 * this module never reads, logs or persists credentials.
 */
export type CanonicalTurnoverTransport = Readonly<{
  inspectReview(): Promise<RemoteSnapshot>
  createSyntheticAuthUser(marker: string, role: "owner"): Promise<{ userId: string }>
  callAsUser(userId: string, rpc: "create_company_with_owner", parameters: Readonly<{ p_name: string; p_slug: string }>): Promise<{ companyId: string; ownerPersonId: string }>
  callPeopleMutation(companyId: string, rpc: "create_tenant_person_v2", marker: string): Promise<{ personId: string }>
  callTurnoverRead(companyId: string, rpc: "get_company_turnover_v1", reason: "analytics_turnover_summary"): Promise<TurnoverObservation>
  verifyOwnedFixture(companyId: string, ownedIds: readonly string[]): Promise<boolean>
}>

export function canonicalTurnoverBootstrapAdapter(transport: CanonicalTurnoverTransport): TurnoverBootstrapAdapter {
  const adapter: TurnoverBootstrapAdapter = {
    inspect: () => transport.inspectReview(),
    createActor: ({ marker, role }) => transport.createSyntheticAuthUser(marker, role),
    createCompany: ({ ownerUserId, name, slug }) => transport.callAsUser(ownerUserId, "create_company_with_owner", { p_name: name, p_slug: slug }),
    createEmployee: ({ companyId, marker }) => transport.callPeopleMutation(companyId, "create_tenant_person_v2", marker),
    observeTurnover: (companyId) => transport.callTurnoverRead(companyId, "get_company_turnover_v1", "analytics_turnover_summary"),
    verifyOwnership: (companyId, ownedIds) => transport.verifyOwnedFixture(companyId, ownedIds),
  }
  return Object.freeze(adapter)
}
