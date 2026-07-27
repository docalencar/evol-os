"use client"

import {
  useState,
} from "react"

import {
  createOrganizationProposalAction,
} from "../actions/create-organization-proposal-action"

import {
  OrganizationProposalEditor,
} from "./organization-proposal-editor"

import type {
  OrganizationReorganizationProposal,
} from "../types/organization-reorganization-proposal"


type Props = {
  companyId: string
  suggestedUnits: string[]
}


export function OrganizationProposalButton({
  companyId,
  suggestedUnits,
}: Props) {

  const [
    proposal,
    setProposal,
  ] =
    useState<OrganizationReorganizationProposal | null>(
      null
    )


  const [
    loading,
    setLoading,
  ] =
    useState(false)


  async function handleCreate() {

    try {

      setLoading(true)


      const result =
        await createOrganizationProposalAction({
          companyId,
          suggestedUnits,
        })


      setProposal(result)

    } finally {

      setLoading(false)

    }

  }


  return (
    <div className="space-y-4">

      {!proposal && (
        <button
          type="button"
          onClick={handleCreate}
          disabled={loading}
          className="
            inline-flex
            rounded-lg
            border
            px-4
            py-2
            text-sm
            font-medium
            hover:bg-background
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          {loading
            ? "Criando proposta..."
            : "Criar proposta de reorganização"}
        </button>
      )}


      {proposal && (
        <OrganizationProposalEditor
          proposal={proposal}
        />
      )}

    </div>
  )
}
