import "server-only"
import { createServerDatabase } from "@/lib/database/server-database"
import { OrganizationPlanningWorkspace } from "../domain/organization-planning-workspace"
type Row=Readonly<{id:string;company_id:string;version:number;created_at:string;updated_at:string}>
type Database=Readonly<{rpc(name:string,parameters:Readonly<Record<string,unknown>>):PromiseLike<Readonly<{data:unknown;error:Readonly<{message:string}>|null}>>}>
function map(row:Row){return OrganizationPlanningWorkspace.restore({id:row.id,companyId:row.company_id,version:row.version,createdAt:new Date(row.created_at),updatedAt:new Date(row.updated_at)})}
export function createWorkspaceRepositoryAdapter(database:Database){async function all(companyId:string){const{data,error}=await database.rpc("get_planning_workspaces_v1",{p_company_id:companyId});if(error)throw new Error(error.message);if(!Array.isArray(data))throw new Error("PLANNING_WORKSPACE_INVALID_DATA");return data.map((row)=>map(row as Row))}return{findAllByCompany:all,async findById(companyId:string,workspaceId:string){return(await all(companyId)).find((workspace)=>workspace.id===workspaceId)??null},async create(){throw new Error("PLANNING_WORKSPACE_CREATE_RETIRED")}}}
export async function createWorkspaceRepository(){return createWorkspaceRepositoryAdapter(await createServerDatabase() as unknown as Database)}
