export function planningActionErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : ""

  if (message.includes("PLANNING_VERSION_CONFLICT")) {
    return "O cenário foi atualizado por outra pessoa. Recarregue a página."
  }
  if (message.includes("PLANNING_TRANSITION_INVALID") || message.includes("REQUIRES_DRAFT")) {
    return "Esta operação não está mais disponível para o estado atual."
  }
  if (message.includes("PLANNING_CHANGE_SET_ORDER_INVALID")) {
    return "A ordem das alterações está desatualizada. Recarregue a página."
  }
  if (message.includes("PLANNING_CHANGE_SET_INPUT_INVALID") || message.includes("EXPECTED_VERSION_INVALID")) {
    return "Os dados da alteração não são válidos. Revise o formulário."
  }
  if (message.includes("PLANNING_RESOURCE_UNAVAILABLE") || message.includes("permission")) {
    return "Você não possui autorização para esta operação."
  }
  return "Não foi possível concluir a operação de Planning."
}
