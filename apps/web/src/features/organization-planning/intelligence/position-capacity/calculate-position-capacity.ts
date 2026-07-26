import type {
  ProjectedEmployee,
  ProjectedPosition,
} from "../../projection"

import type {
  PositionCapacityResult,
} from "./types"


type CalculatePositionCapacityInput = Readonly<{
  positions: readonly ProjectedPosition[]
  employees: readonly ProjectedEmployee[]
}>


export function calculatePositionCapacity(
  input: CalculatePositionCapacityInput
): PositionCapacityResult {

  const analyses =
    input.positions
      .filter(
        (position) =>
          position.status === "active"
      )
      .map((position) => {

        const occupants =
          input.employees.filter(
            (employee) =>
              employee.status !== "terminated" &&
              employee.positionId === position.id
          ).length


        if (occupants === 0) {
          return Object.freeze({
            positionId: position.id,
            positionName: position.name,
            occupants,
            risk: "attention" as const,
            message:
              "Cargo ativo sem colaboradores vinculados.",
          })
        }


        if (occupants > 5) {
          return Object.freeze({
            positionId: position.id,
            positionName: position.name,
            occupants,
            risk: "critical" as const,
            message:
              "Cargo com quantidade elevada de ocupantes. Avaliar dimensionamento.",
          })
        }


        return Object.freeze({
          positionId: position.id,
          positionName: position.name,
          occupants,
          risk: "healthy" as const,
          message:
            "Cargo com ocupação adequada.",
        })
      })


  return Object.freeze({
    positions: Object.freeze(analyses),

    totalPositions:
      analyses.length,

    vacantPositions:
      analyses.filter(
        (analysis) =>
          analysis.occupants === 0
      ).length,

    attentionCount:
      analyses.filter(
        (analysis) =>
          analysis.risk === "attention"
      ).length,

    criticalCount:
      analyses.filter(
        (analysis) =>
          analysis.risk === "critical"
      ).length,
  })
}
