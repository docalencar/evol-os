"use client"

import { useRouter } from "next/navigation"

import type { SeniorityOptionsByPosition } from "../queries/get-people-seniority-options"
import { EmployeeForm } from "./employee-form"

type EmployeeSelectOption = {
  id: string
  name: string
}

type EmployeeCreatePageProps = {
  companyId: string
  teams: EmployeeSelectOption[]
  positions: EmployeeSelectOption[]
  managers: EmployeeSelectOption[]
  seniorityOptionsByPosition?: SeniorityOptionsByPosition
}

export function EmployeeCreatePage({
  companyId,
  teams,
  positions,
  managers,
  seniorityOptionsByPosition,
}: EmployeeCreatePageProps) {
  const router = useRouter()

  function returnToPeople() {
    router.push("/app/people")
    router.refresh()
  }

  return (
    <EmployeeForm
      companyId={companyId}
      teams={teams}
      positions={positions}
      managers={managers}
      seniorityOptionsByPosition={seniorityOptionsByPosition}
      onSuccess={returnToPeople}
      onCancel={returnToPeople}
    />
  )
}
