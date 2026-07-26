import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import type {
  CostAssumptions,
} from "../types"


type CostAssumptionsRow = {
  id: string
  company_id: string

  average_employee_monthly_cost: number
  average_hiring_cost: number
  average_termination_cost: number

  currency: string

  created_at: string
  updated_at: string
}


function mapCostAssumptions(
  row: CostAssumptionsRow
): CostAssumptions {
  return Object.freeze({
    id: row.id,
    companyId: row.company_id,

    averageEmployeeMonthlyCost:
      row.average_employee_monthly_cost,

    averageHiringCost:
      row.average_hiring_cost,

    averageTerminationCost:
      row.average_termination_cost,

    currency: row.currency,

    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}


export async function createCostAssumptionsRepository() {
  const database =
    await createServerDatabase()


  const select = `
    id,
    company_id,
    average_employee_monthly_cost,
    average_hiring_cost,
    average_termination_cost,
    currency,
    created_at,
    updated_at
  `


  return {

    async findByCompany(
      companyId: string
    ): Promise<CostAssumptions | null> {

      const { data, error } =
        await database
          .from("cost_assumptions")
          .select(select)
          .eq("company_id", companyId)
          .maybeSingle()


      if (error) {
        throw new Error(error.message)
      }


      return data
        ? mapCostAssumptions(
            data as CostAssumptionsRow
          )
        : null
    },


    async create(
      assumptions: CostAssumptions
    ) {

      const { error } =
        await database
          .from("cost_assumptions")
          .insert({
            id: assumptions.id,
            company_id:
              assumptions.companyId,

            average_employee_monthly_cost:
              assumptions.averageEmployeeMonthlyCost,

            average_hiring_cost:
              assumptions.averageHiringCost,

            average_termination_cost:
              assumptions.averageTerminationCost,

            currency:
              assumptions.currency,

            created_at:
              assumptions.createdAt,

            updated_at:
              assumptions.updatedAt,
          })


      if (error) {
        throw new Error(error.message)
      }
    },


    async update(
      assumptions: CostAssumptions
    ) {

      const { error } =
        await database
          .from("cost_assumptions")
          .update({

            average_employee_monthly_cost:
              assumptions.averageEmployeeMonthlyCost,

            average_hiring_cost:
              assumptions.averageHiringCost,

            average_termination_cost:
              assumptions.averageTerminationCost,

            currency:
              assumptions.currency,

            updated_at:
              assumptions.updatedAt,
          })
          .eq(
            "company_id",
            assumptions.companyId
          )


      if (error) {
        throw new Error(error.message)
      }
    },
  }
}


export type CostAssumptionsRepository =
  Awaited<
    ReturnType<
      typeof createCostAssumptionsRepository
    >
  >
