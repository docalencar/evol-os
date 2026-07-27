"use client"

import { useState } from "react"

import {
  sendOrganizationProposalForApprovalAction,
} from "../actions/send-organization-proposal-for-approval-action"


type Props = {
  proposalId: string
  hasPendingChanges: boolean
}


export function OrganizationProposalApprovalButton({
  proposalId,
  hasPendingChanges,
}: Props) {

  const [message, setMessage] =
    useState<string | null>(null)


  async function handleSend() {

    await sendOrganizationProposalForApprovalAction({
      proposalId,
    })


    setMessage(
      "Proposta enviada para aprovação."
    )
  }


  if (hasPendingChanges) {
    return (
      <div
        className="
          rounded-lg
          border
          p-4
          text-sm
          text-muted-foreground
        "
      >
        Existem alterações aguardando decisão antes de enviar para aprovação.
      </div>
    )
  }


  return (
    <div className="space-y-3">

      <button
        className="
          rounded-md
          border
          px-4
          py-2
        "
        onClick={handleSend}
      >
        Enviar para aprovação
      </button>


      {
        message && (
          <p className="text-sm">
            ✓ {message}
          </p>
        )
      }

    </div>
  )
}
