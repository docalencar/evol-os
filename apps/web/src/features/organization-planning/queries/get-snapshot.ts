import "server-only"

import { createSnapshotRepository } from "../repositories/snapshot-repository"
import { snapshotIdSchema } from "../schemas/planning-schemas"

export async function getSnapshot(companyId: string, snapshotId: string) {
  const input = snapshotIdSchema.parse({ companyId, snapshotId })
  const repository = await createSnapshotRepository()
  const { data, error } = await repository.findById(input.companyId, input.snapshotId)

  if (error) throw new Error("Não foi possível carregar o snapshot.")
  return data
}
