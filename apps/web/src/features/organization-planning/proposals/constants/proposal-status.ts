export const PROPOSAL_STATUS_LABELS = {
  draft: "Rascunho",
  review: "Em revisão",
  ready_for_approval: "Pronta para aprovação",
  pending_approval: "Em aprovação",
  approved: "Aprovada",
  rejected: "Rejeitada",
  applied: "Aplicada",
} as const


export function getProposalStatusLabel(
  status: keyof typeof PROPOSAL_STATUS_LABELS
) {
  return PROPOSAL_STATUS_LABELS[status]
}