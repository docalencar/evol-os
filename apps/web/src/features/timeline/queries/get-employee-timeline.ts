import "server-only"

import {
  getActivityTimeline,
} from "./get-activity-timeline"
import type {
  GetEmployeeTimelineInput,
} from "../types/employee-timeline"
import type {
  ActivityTimelineViewModel,
} from "../view-models/activity-timeline-item-view-model"

export async function getEmployeeTimeline(
  input: GetEmployeeTimelineInput
): Promise<ActivityTimelineViewModel> {
  const {
    employeeId,
    ...filters
  } = input

  return getActivityTimeline({
    ...filters,
    subjectType: "employee",
    subjectId: employeeId,
  })
}
