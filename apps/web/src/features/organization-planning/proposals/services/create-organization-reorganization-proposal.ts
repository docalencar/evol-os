import type {
  OrganizationReorganizationProposal,
} from "../types/organization-reorganization-proposal"


type Input = {
  suggestedUnits: string[]
}


export function createOrganizationReorganizationProposal(
  input: Input
): OrganizationReorganizationProposal {

  return {
    id: crypto.randomUUID(),

    status: "draft",

    title:
      "Proposta de reorganização organizacional",

    description:
      "Sugestão inicial gerada pelo Evol OS para classificação da estrutura organizacional.",

    changes:
      input.suggestedUnits.map(
        (unit) => ({
          id: crypto.randomUUID(),

          type: "create_unit",

          originalName: unit,

          proposedName: unit,

          status: "suggested",
        })
      ),

    createdAt:
      new Date().toISOString(),
  }
}
