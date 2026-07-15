import type { EmployeeNextAction } from "../types/employee-next-action"

export function createEmployeeNextActions(): EmployeeNextAction[] {
  return [
    {
      id: "create-development-plan",
      title: "Criar PDI",
      description: "Iniciar um plano de desenvolvimento para o colaborador.",
      type: "create-development-plan",
      priority: "high",
    },
    {
      id: "schedule-one-on-one",
      title: "Agendar 1:1",
      description: "Realizar uma conversa de acompanhamento.",
      type: "schedule-one-on-one",
      priority: "medium",
    },
  ]
}
