import "server-only"
import { createServerDatabase } from "@/lib/database/server-database"
import { PlanningScenario } from "../domain/planning-scenario"
import { mapScenario, type ScenarioRow } from "./scenario-record"
type RpcResult=Readonly<{data:unknown;error:Readonly<{message:string}>|null}>
type Database=Readonly<{rpc(name:string,parameters:Readonly<Record<string,unknown>>):PromiseLike<RpcResult>}>

export function createScenarioRepositoryAdapter(database: Database) {
  async function rpc(name:string,parameters:Readonly<Record<string,unknown>>){const{data,error}=await database.rpc(name,parameters);if(error)throw new Error(error.message);return data}
  async function all(companyId:string){const data=await rpc("get_planning_scenarios_v1",{p_company_id:companyId});if(!Array.isArray(data))throw new Error("PLANNING_SCENARIO_INVALID_DATA");return data.map((row)=>mapScenario(row as ScenarioRow))}
  return {
    findAllByCompany:all,
    async findById(companyId:string,scenarioId:string){return(await all(companyId)).find((scenario)=>scenario.id===scenarioId)??null},
    async create(scenario:PlanningScenario){const value=scenario.toContract();return mapScenario(await rpc("create_planning_scenario_v1",{p_workspace_id:value.workspaceId,p_base_snapshot_id:value.baseSnapshotId,p_scenario_id:value.id,p_name:value.name,p_description:value.description}) as ScenarioRow)},
    async save(){throw new Error("PLANNING_ARCHIVE_RESTORE_RETIRED")},
    async createBranch(scenario:PlanningScenario,sourceVersion:number){return mapScenario(await rpc("create_planning_scenario_branch_v1",{p_source_scenario_id:scenario.parentScenarioId,p_expected_version:sourceVersion,p_scenario_id:scenario.id}) as ScenarioRow)},
    async rename(scenarioId:string,expectedVersion:number,name:string){return mapScenario(await rpc("rename_planning_scenario_v1",{p_scenario_id:scenarioId,p_expected_version:expectedVersion,p_name:name}) as ScenarioRow)},
    async deleteDraft(_companyId:string,scenarioId:string,expectedVersion:number){await rpc("delete_planning_scenario_v1",{p_scenario_id:scenarioId,p_expected_version:expectedVersion})},
  }
}
export async function createScenarioRepository(){return createScenarioRepositoryAdapter(await createServerDatabase() as unknown as Database)}
