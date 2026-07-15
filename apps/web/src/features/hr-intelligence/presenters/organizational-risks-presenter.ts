import type { OrganizationalRisk } from "../types/organizational-risk"
import type { OrganizationalRisksViewModel } from "../view-models/organizational-risks-view-model"

export function presentOrganizationalRisks(
  risks: OrganizationalRisk[]
): OrganizationalRisksViewModel {
  return {
    risks,
    empty: risks.length === 0,
  }
}
