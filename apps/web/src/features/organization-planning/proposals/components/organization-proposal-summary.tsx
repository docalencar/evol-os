import type {
  OrganizationReorganizationProposal,
} from "../types/organization-reorganization-proposal"

import {
  getProposalChangeStatusLabel,
} from "../constants/proposal-change-status"


type Props = {
  proposal: OrganizationReorganizationProposal
}


export function OrganizationProposalSummary({
  proposal,
}: Props) {

  const total =
    proposal.changes.length


  const accepted =
    proposal.changes.filter(
      (change) =>
        change.status === "accepted"
    ).length


  const modified =
    proposal.changes.filter(
      (change) =>
        change.status === "modified"
    ).length


  const removed =
    proposal.changes.filter(
      (change) =>
        change.status === "removed"
    ).length


  const pending =
    proposal.changes.filter(
      (change) =>
        change.status === "suggested"
    ).length


  return (
    <section
      className="
        rounded-xl
        border
        bg-card
        p-6
      "
    >

      <h2 className="text-lg font-semibold">
        Resumo da reorganização
      </h2>


      <p className="mt-2 text-sm text-muted-foreground">
        {total} alterações encontradas
      </p>


      <div
        className="
          mt-5
          grid
          gap-4
          md:grid-cols-4
        "
      >

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Pendentes
          </p>

          <p className="text-2xl font-semibold">
            {pending}
          </p>
        </div>


        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Aceitas
          </p>

          <p className="text-2xl font-semibold">
            {accepted}
          </p>
        </div>


        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Modificadas
          </p>

          <p className="text-2xl font-semibold">
            {modified}
          </p>
        </div>


        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Rejeitadas
          </p>

          <p className="text-2xl font-semibold">
            {removed}
          </p>
        </div>

      </div>

    </section>
  )
}
