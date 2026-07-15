import type { WorkforceHealth } from "../types/workforce-health"
import type { WorkforceHealthViewModel } from "../view-models/workforce-health-view-model"

export function presentWorkforceHealth(
  health: WorkforceHealth
): WorkforceHealthViewModel {
  return {
    ...health,
    empty: health.totalEmployees === 0,
  }
}
