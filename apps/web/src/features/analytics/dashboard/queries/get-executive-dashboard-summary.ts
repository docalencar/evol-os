import type { ExecutiveDashboardSummary } from "../types/executive-dashboard-summary"

import { createExecutiveDashboardSummary } from "../services/create-executive-dashboard-summary"

type Input = {
  companyId: string
}

export async function getExecutiveDashboardSummary(
  input: Input,
): Promise<ExecutiveDashboardSummary> {
  // PR-084D em diante:
  // Buscar dados reais dos módulos de Employees, Departments,
  // Positions e Assessments e preencher o summary.
  //
  // O parâmetro é mantido desde já para estabilizar a API pública.

  void input

  return createExecutiveDashboardSummary()
}
