import "server-only"

import { createSnapshotRepository } from "../repositories/snapshot-repository"
import { companyPlanningSchema } from "../schemas/planning-schemas"

export async function listSnapshots(companyId: string) {
  const input = companyPlanningSchema.parse({ companyId })
  const repository = await createSnapshotRepository()
  try {
    return await repository.findAllByCompany(input.companyId)
  } catch {
    throw new Error("Não foi possível carregar os snapshots.")
  }
}
