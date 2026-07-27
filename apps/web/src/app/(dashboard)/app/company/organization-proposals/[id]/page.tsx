import { notFound } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"

import {
  getOrganizationProposalById,
  OrganizationProposalEditor,
  OrganizationProposalSummary,
  OrganizationProposalApprovalPanel,
  calculateOrganizationProposalStatus,
  getOrganizationProposalApprovalByProposalId,
} from "@/features/organization-planning/proposals"


type Props = {
  params: Promise<{
    id: string
  }>
}


export default async function OrganizationProposalPage({
  params,
}: Props) {

  const {
    id,
  } = await params


  const proposal =
    await getOrganizationProposalById(
      id
    )

    const approval =
  await getOrganizationProposalApprovalByProposalId(
    proposal.id
  )

  if (!proposal) {
    notFound()
  }


  const proposalStatus =
    calculateOrganizationProposalStatus(
      proposal
    )


  const canSendForApproval =
    proposalStatus.status ===
    "ready_for_approval"


  return (
    <div className="space-y-6">

      <PageHeader
        title={
          proposal.title
        }
        description={
          proposal.description ??
          "Revisão da proposta de reorganização."
        }
      />


      <OrganizationProposalSummary
        proposal={proposal}
      />


      <OrganizationProposalApprovalPanel
        proposalId={proposal.id}
        canSendForApproval={
          canSendForApproval
        }

        currentStatus={
          proposalStatus.label
        }

        approval={
          approval
        }
      />


      <section
        className="
          rounded-xl
          border
          bg-card
          p-6
        "
      >

        <p className="text-sm text-muted-foreground">
          Status:
          {" "}
          {proposalStatus.label}
        </p>


        <h2 className="mt-6 text-lg font-semibold">
          Alterações propostas
        </h2>


        <OrganizationProposalEditor
          proposal={
            proposal
          }
        />

      </section>

    </div>
  )
}
