"use client"

import { useRouter } from "next/navigation"

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
}

export function EmployeeCreatePage({
  companyId,
  teams,
  positions,
  managers,
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
      onSuccess={returnToPeople}
      onCancel={returnToPeople}
    />
  )
}
