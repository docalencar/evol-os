import "server-only"

import {
  createCostAssumptionsRepository,
} from "../repositories"


export async function getCostAssumptions(
  companyId: string
) {
  const repository =
    await createCostAssumptionsRepository()

  return repository.findByCompany(
    companyId
  )
}
