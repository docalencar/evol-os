import { createServerDatabase } from "@/lib/database/server-database"
import { createGlobalCompetencyRepository, createTenantMappingRepository } from "./repositories"
import { createGlobalCompetencyTrustedDatabase } from "./server/trusted-database"
export async function getPublishedGlobalCompetencies(){const database=await createServerDatabase();return createGlobalCompetencyRepository(database,createGlobalCompetencyTrustedDatabase()).listPublished()}
export async function getTenantCompetencyMappings(companyId:string){return createTenantMappingRepository(await createServerDatabase()).list(companyId)}
