import "server-only"

import { createSnapshotRepository } from "../repositories/snapshot-repository"
import { companyPlanningSchema } from "../schemas/planning-schemas"

export async function listSnapshots(companyId: string) {
  const input = companyPlanningSchema.parse({ companyId })
  const repository = await createSnapshotRepository()
  const { data, error } = await repository.findAllByCompany(input.companyId)

  if (error) throw new Error("Não foi possível carregar os snapshots.")
  return data ?? []
}
