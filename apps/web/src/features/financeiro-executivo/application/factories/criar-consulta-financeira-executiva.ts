import "server-only"

import {
  PlanningProjectionReadService,
} from "@/features/organization-planning/application/services"
import {
  ScenarioExecutor,
} from "@/features/organization-planning/projection/execution"
import {
  createPlanningChangeSetRepository,
} from "@/features/organization-planning/repositories/planning-change-set-repository"
import {
  createScenarioRepository,
} from "@/features/organization-planning/repositories/scenario-repository"
import {
  createSnapshotRepository,
} from "@/features/organization-planning/repositories/snapshot-repository"

import {
  ConsultaFinanceiraExecutivaService,
} from "../services/consulta-financeira-executiva-service"

export async function criarConsultaFinanceiraExecutiva(
  companyId: string,
): Promise<ConsultaFinanceiraExecutivaService> {
  const [
    scenarios,
    snapshots,
    changeSets,
  ] = await Promise.all([
    createScenarioRepository(),
    createSnapshotRepository(),
    createPlanningChangeSetRepository(),
  ])

  const projecao =
    new PlanningProjectionReadService({
      companyId,
      scenarios,
      snapshots,
      changeSets,
      projector: ScenarioExecutor.create(),
    })

  return new ConsultaFinanceiraExecutivaService(
    projecao,
  )
}
