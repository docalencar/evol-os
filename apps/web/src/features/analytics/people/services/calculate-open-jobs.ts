import type {
  JobOpeningStatus,
} from "../../../recruitment/job-openings/types/job-opening"

type JobOpeningStatusInput = {
  status: JobOpeningStatus
}

export function calculateOpenJobs(
  jobOpenings: readonly JobOpeningStatusInput[]
) {
  return jobOpenings.filter(
    (jobOpening) => jobOpening.status === "open"
  ).length
}
