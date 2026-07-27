"use client"

import { useState } from "react"

import {
  updateOrganizationProposalChangeAction,
} from "../actions/update-organization-proposal-change-action"

import {
  updateOrganizationProposalChangeStatusAction,
} from "../actions/update-organization-proposal-change-status-action"

import type {
  OrganizationReorganizationProposal,
} from "../types/organization-reorganization-proposal"

import {
  OrganizationProposalChangeStatusBadge,
} from "./organization-proposal-change-status-badge"



type Props = {
  proposal: OrganizationReorganizationProposal
}


export function OrganizationProposalEditor({
  proposal,
}: Props) {

  const [changes, setChanges] = useState(
    proposal.changes
  )

  const [message, setMessage] =
    useState<string | null>(null)


  async function saveChange(
    id: string,
    proposedName: string
  ) {

    await updateOrganizationProposalChangeAction({
      changeId: id,

      proposalId:
        proposal.id,

      proposedName,

      status: "modified",
    })


    setChanges(
      (current) =>
        current.map(
          (change) =>
            change.id === id
              ? {
                  ...change,
                  proposedName,
                  status: "modified",
                }
              : change
        )
    )

    setMessage(
      "Alteração salva com sucesso."
    )
  }


  async function changeStatus(
    id: string,
    status:
      | "accepted"
      | "removed"
  ) {

    await updateOrganizationProposalChangeStatusAction({
      changeId: id,
      status,
    })


    setChanges(
      (current) =>
        current.map(
          (change) =>
            change.id === id
              ? {
                  ...change,
                  status,
                }
              : change
        )
    )

    setMessage(
      "Decisão registrada com sucesso."
    )
  }


  return (
    <div className="mt-4 space-y-4">

      {
        message && (
          <div
            className="
              rounded-lg
              border
              p-3
              text-sm
            "
          >
            ✓ {message}
          </div>
        )
      }


      {
        changes.map(
          (change) => (

            <div
              key={change.id}
              className="
                rounded-xl
                border
                p-5
              "
            >

              <p className="font-medium">
                {change.originalName}
              </p>


              <input
                className="
                  mt-3
                  w-full
                  rounded-md
                  border
                  px-3
                  py-2
                "
                value={
                  change.proposedName
                }
                onChange={
                  (event) =>
                    setChanges(
                      (current) =>
                        current.map(
                          (item) =>
                            item.id === change.id
                              ? {
                                  ...item,
                                  proposedName:
                                    event.target.value,
                                }
                              : item
                        )
                    )
                }
              />


              <div className="mt-3 flex gap-3">

                <button
                  className="
                    rounded-md
                    border
                    px-4
                    py-2
                  "
                  onClick={() =>
                    saveChange(
                      change.id,
                      change.proposedName
                    )
                  }
                >
                  Salvar alteração
                </button>


                <button
                  className="
                    rounded-md
                    border
                    px-4
                    py-2
                  "
                  onClick={() =>
                    changeStatus(
                      change.id,
                      "accepted"
                    )
                  }
                >
                  ✓ Aceitar
                </button>


                <button
                  className="
                    rounded-md
                    border
                    px-4
                    py-2
                  "
                  onClick={() =>
                    changeStatus(
                      change.id,
                      "removed"
                    )
                  }
                >
                  ✕ Rejeitar
                </button>

              </div>


              <div className="mt-3">
                <OrganizationProposalChangeStatusBadge
                  status={
                    change.status
                  }
                />
              </div>

            </div>

          )
        )
      }

    </div>
  )
}
