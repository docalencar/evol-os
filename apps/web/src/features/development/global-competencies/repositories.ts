import type { SupabaseClient } from "@supabase/supabase-js"
import type { GlobalAuthorityRepository, GlobalCompetencyRepository, TenantMappingRepository } from "./contracts"
import type { GlobalConceptVersion, TenantCompetencyMapping } from "./types"

export function createGlobalCompetencyRepository(database:SupabaseClient, trusted:SupabaseClient):GlobalCompetencyRepository {
  return {
    async listPublished(){const {data,error}=await database.from("global_competency_concept_versions").select("id,concept_id,version_number,name,definition,category,status").eq("status","published").order("name");if(error)throw error;return (data??[]).map((r)=>({id:r.id,conceptId:r.concept_id,versionNumber:r.version_number,name:r.name,definition:r.definition,category:r.category,status:"published"})) as GlobalConceptVersion[]},
    async execute(actorUserId,operation,payload,reason){const {data,error}=await trusted.rpc("manage_global_competency_catalog",{p_actor_user_id:actorUserId,p_operation:operation,p_payload:payload,p_reason:reason});if(error)throw error;return data as string},
  }
}
export function createGlobalAuthorityRepository(trusted:SupabaseClient):GlobalAuthorityRepository{return{async manageDelegation(input){const{data,error}=await trusted.rpc("manage_platform_global_delegation",{p_actor_user_id:input.actorUserId,p_beneficiary_user_id:input.beneficiaryUserId,p_capability:input.capability,p_operation:input.operation,p_reason:input.reason,p_expires_at:input.expiresAt??null});if(error)throw error;return data as string}}}
export function createTenantMappingRepository(database:SupabaseClient):TenantMappingRepository {
  return {
    async list(companyId){const {data,error}=await database.from("tenant_competency_mappings").select("id,company_id,concept_version_id,competency_id,status,updated_at").eq("company_id",companyId).order("updated_at",{ascending:false});if(error)throw error;return (data??[]).map((r)=>({id:r.id,companyId:r.company_id,conceptVersionId:r.concept_version_id,competencyId:r.competency_id,status:r.status,updatedAt:r.updated_at})) as TenantCompetencyMapping[]},
    async execute(input){const {data,error}=await database.rpc("save_tenant_competency_mapping",{p_company_id:input.companyId,p_concept_version_id:input.conceptVersionId,p_competency_id:input.competencyId,p_operation:input.operation,p_mapping_id:input.mappingId??null,p_reason:input.reason});if(error)throw error;return data as string},
  }
}
