import { Projection } from "../domain/projection"
import type { ProjectionContract } from "../projection/contracts/projection-persistence-contract"

export function createProjection(
  input: ProjectionContract
) {
  return Projection.restore(input)
}
