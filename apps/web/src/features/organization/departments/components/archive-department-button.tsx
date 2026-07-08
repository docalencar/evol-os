"use client"

import { useTransition } from "react"

import { Button } from "@/components/ui/button"

import { archiveDepartmentAction } from "../actions/archive-department-action"

type Props = {
  companyId: string
  departmentId: string
}

export function ArchiveDepartmentButton({
  companyId,
  departmentId,
}: Props) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    const confirmed = window.confirm(
      "Deseja realmente arquivar este departamento?"
    )

    if (!confirmed) return

    startTransition(async () => {
      await archiveDepartmentAction(companyId, departmentId)
    })
  }

  return (
    <Button
  variant="secondary"
  size="sm"
  onClick={handleClick}
  disabled={isPending}
>
      {isPending ? "Arquivando..." : "Arquivar"}
    </Button>
  )
}
