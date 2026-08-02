"use server"
import { revalidatePath } from "next/cache"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"
import { createGlobalAuthorityRepository, createGlobalCompetencyRepository, createTenantMappingRepository } from "./repositories"
import { executeGlobalCatalogOperation, executeGlobalDelegationOperation, executeTenantMappingOperation } from "./services"
import type { GlobalCatalogOperation, MappingOperation } from "./types"
import { createServerDatabase } from "@/lib/database/server-database"
import { createGlobalCompetencyTrustedDatabase } from "./server/trusted-database"
export async function manageTenantCompetencyMappingAction(input:Readonly<{conceptVersionId:string;competencyId:string;operation:MappingOperation;mappingId?:string;reason:string}>){const {companyId,supabase}=await getCurrentCompanyContext();try{const id=await executeTenantMappingOperation(createTenantMappingRepository(supabase),{...input,companyId,actorType:"human"});revalidatePath("/app/development/templates");return {success:true,id}}catch{return {success:false,message:"Não foi possível administrar o mapping."}}}
async function loadGlobalActor(){const database=await createServerDatabase();const{data:{user}}=await database.auth.getUser();if(!user)throw new Error("GLOBAL_AUTHENTICATION_REQUIRED");return{database,user}}
export async function manageGlobalCompetencyCatalogAction(input:Readonly<{operation:GlobalCatalogOperation;payload:Readonly<Record<string,unknown>>;reason:string}>){try{const{database,user}=await loadGlobalActor();const trusted=createGlobalCompetencyTrustedDatabase();const id=await executeGlobalCatalogOperation(createGlobalCompetencyRepository(database,trusted),{...input,actorUserId:user.id});revalidatePath("/app/development/templates");return{success:true,id}}catch{return{success:false,message:"Operação global não autorizada."}}}
export async function manageGlobalDelegationAction(input:Readonly<{beneficiaryUserId:string;capability:string;operation:"grant"|"revoke";reason:string;expiresAt?:string}>){try{const{user}=await loadGlobalActor();const id=await executeGlobalDelegationOperation(createGlobalAuthorityRepository(createGlobalCompetencyTrustedDatabase()),{...input,actorUserId:user.id});return{success:true,id}}catch{return{success:false,message:"Operação global não autorizada."}}}
