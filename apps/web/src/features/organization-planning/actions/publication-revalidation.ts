export function getPublicationRevalidationPaths(scenarioId: string): readonly string[] {
  return Object.freeze([
    "/app/organization",
    "/app/organization/planning/timeline",
    `/app/organization/planning/${scenarioId}`,
  ])
}
