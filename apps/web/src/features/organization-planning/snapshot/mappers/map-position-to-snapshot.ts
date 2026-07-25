import type { SnapshotPosition } from "../types"
import type {
  OrganizationPositionReadRow,
} from "../services"

export function mapPositionToSnapshot(
  position: OrganizationPositionReadRow
): SnapshotPosition {
  return Object.freeze({
    id: position.id,
    name: position.name,
    description: position.description,
    departmentId: position.department_id,
    teamId: null,
    reportsToPositionId: null,
    hierarchicalLevel: position.hierarchical_level,
    status: position.status,
    weeklyWorkloadHours: position.weekly_workload_hours,
    workModel: position.work_model,
    employmentType: position.employment_type,
    travelRequirement: position.travel_requirement,
    archivedAt: position.deleted_at,
  })
}
