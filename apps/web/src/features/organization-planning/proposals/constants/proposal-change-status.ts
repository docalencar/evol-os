export const PROPOSAL_CHANGE_STATUS_LABELS = {
  suggested: "Aguardando decisão",
  modified: "Alterada pelo RH",
  accepted: "Aceita",
  removed: "Rejeitada",
} as const


export function getProposalChangeStatusLabel(
  status: keyof typeof PROPOSAL_CHANGE_STATUS_LABELS
) {
  return PROPOSAL_CHANGE_STATUS_LABELS[status]
}
