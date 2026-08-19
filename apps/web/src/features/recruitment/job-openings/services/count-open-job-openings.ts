import type {
  JobOpeningStatus,
} from "../types/job-opening"

// Derives the "Vagas abertas" count from the recruitment workspace read model.
// Only openings effectively in the 'open' status are counted — draft,
// pending_approval, approved, paused, closed, cancelled and filled are excluded.
export function countOpenJobOpenings(
  jobOpenings: ReadonlyArray<{ status: JobOpeningStatus }>
): number {
  return jobOpenings.filter(
    (jobOpening) => jobOpening.status === "open"
  ).length
}
