import "server-only"

import {
  createCostAssumptionsRepository,
} from "../repositories"

import type {
  CostAssumptions,
} from "../types"


type UpdateCostAssumptionsInput =
  Readonly<{
    companyId: string
    averageEmployeeMonthlyCost: number
    averageHiringCost: number
    averageTerminationCost: number
    currency: string
  }>


export async function updateCostAssumptions(
  input: UpdateCostAssumptionsInput
) {
  const repository =
    await createCostAssumptionsRepository()


  const existing =
    await repository.findByCompany(
      input.companyId
    )


  const now =
    new Date().toISOString()


  const assumptions: CostAssumptions =
    {
      id:
        existing?.id ??
        crypto.randomUUID(),

      companyId:
        input.companyId,

      averageEmployeeMonthlyCost:
        input.averageEmployeeMonthlyCost,

      averageHiringCost:
        input.averageHiringCost,

      averageTerminationCost:
        input.averageTerminationCost,

      currency:
        input.currency,

      createdAt:
        existing?.createdAt ??
        now,

      updatedAt:
        now,
    }


  if (existing) {
    await repository.update(
      assumptions
    )
  } else {
    await repository.create(
      assumptions
    )
  }


  return assumptions
}
