"use client"

import {
  useState,
} from "react"


import {
  sendOrganizationProposalForApprovalAction,
} from "../actions/send-organization-proposal-for-approval-action"


import {
  updateOrganizationProposalApprovalAction,
} from "../actions/update-organization-proposal-approval-action"



type Approval = {

  id: string

  status:
    | "pending"
    | "approved"
    | "rejected"

  comment?: string | null

  approved_at?: string | null

}



type Props = {

  proposalId: string

  canSendForApproval: boolean

  currentStatus: string

  approval?: Approval | null

}



export function OrganizationProposalApprovalPanel({

  proposalId,

  canSendForApproval,

  currentStatus,

  approval,

}: Props) {


  const [
    message,
    setMessage,
  ] =
    useState<string | null>(null)



  const [
    loading,
    setLoading,
  ] =
    useState(false)



  async function handleSendForApproval() {


    setLoading(true)


    try {


      await sendOrganizationProposalForApprovalAction({
        proposalId,
      })


      setMessage(
        "Proposta enviada para aprovação."
      )


    } finally {

      setLoading(false)

    }

  }



  async function handleDecision(
    decision:
      | "approved"
      | "rejected"
  ) {


    setLoading(true)


    try {


      if (!approval) {
        return
      }


      await updateOrganizationProposalApprovalAction({

        approvalId:
          approval.id,

        proposalId,

        decision,

      })


      setMessage(
        decision === "approved"
          ? "Proposta aprovada."
          : "Proposta rejeitada."
      )


    } finally {

      setLoading(false)

    }

  }



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
        Aprovação da proposta
      </h2>



      <p className="mt-2 text-sm text-muted-foreground">

        Status atual:
        {" "}
        {currentStatus}

      </p>



      {
        approval?.status === "pending" && (

          <div className="mt-4 space-y-3">


            <p className="text-sm">
              Esta proposta está aguardando aprovação.
            </p>


            <div className="flex gap-3">


              <button

                disabled={loading}

                onClick={() =>
                  handleDecision(
                    "approved"
                  )
                }

                className="
                  rounded-md
                  border
                  px-4
                  py-2
                "
              >

                Aprovar proposta

              </button>



              <button

                disabled={loading}

                onClick={() =>
                  handleDecision(
                    "rejected"
                  )
                }

                className="
                  rounded-md
                  border
                  px-4
                  py-2
                "
              >

                Rejeitar proposta

              </button>


            </div>


          </div>

        )
      }



      {
        canSendForApproval && !approval && (

          <button

            disabled={loading}

            className="
              mt-4
              rounded-md
              border
              px-4
              py-2
            "

            onClick={
              handleSendForApproval
            }

          >

            Enviar para aprovação

          </button>

        )
      }



      {
        approval?.status === "approved" && (

          <p className="mt-4 text-sm">

            ✓ Proposta aprovada.

          </p>

        )
      }



      {
        approval?.status === "rejected" && (

          <p className="mt-4 text-sm">

            Proposta rejeitada.

          </p>

        )
      }



      {
        message && (

          <p className="mt-3 text-sm">

            ✓ {message}

          </p>

        )
      }


    </section>

  )

}
