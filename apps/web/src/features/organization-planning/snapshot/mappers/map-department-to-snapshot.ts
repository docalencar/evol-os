import type { SnapshotDepartment } from "../types"
import type {
  OrganizationDepartmentReadRow,
} from "../services"

export function mapDepartmentToSnapshot(
  department: OrganizationDepartmentReadRow
): SnapshotDepartment {
  return Object.freeze({
    id: department.id,
    name: department.name,
    description: department.description,
    parentDepartmentId: null,
    leaderId: department.manager_id,
    archivedAt: department.deleted_at,
  })
}
