import type { GlobalCatalogOperation, GlobalConceptVersion, MappingOperation, TenantCompetencyMapping } from "./types"

export interface GlobalCompetencyRepository {
  listPublished(): Promise<readonly GlobalConceptVersion[]>
  execute(actorUserId:string, operation:GlobalCatalogOperation, payload:Readonly<Record<string,unknown>>, reason:string):Promise<string>
}
export interface TenantMappingRepository {
  list(companyId:string):Promise<readonly TenantCompetencyMapping[]>
  execute(input:Readonly<{companyId:string; conceptVersionId:string; competencyId:string; operation:MappingOperation; mappingId?:string; reason:string}>):Promise<string>
}
export interface GlobalAuthorityRepository {
  manageDelegation(input:Readonly<{actorUserId:string;beneficiaryUserId:string;capability:string;operation:"grant"|"revoke";reason:string;expiresAt?:string}>):Promise<string>
}
