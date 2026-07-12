"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import type {
  DevelopmentPlan,
} from "../types/development-plan"

import {
  DevelopmentPlanForm,
} from "./development-plan-form"

type EmployeeSelectOption = {
  id: string
  name: string
}

type DevelopmentPlanEditDialogProps = {
  plan: DevelopmentPlan
  employeeName: string
  templateName?: string | null
  owners: EmployeeSelectOption[]
}

export function DevelopmentPlanEditDialog({
  plan,
  employeeName,
  templateName,
  owners,
}: DevelopmentPlanEditDialogProps) {
  const [open, setOpen] =
    useState(false)

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button
          variant="secondary"
          size="sm"
        >
          Editar
        </Button>
      }
      title="Editar Plano de Desenvolvimento"
      description="Atualize as informações administrativas deste PDI."
    >
      <DevelopmentPlanForm
        plan={plan}
        employeeName={employeeName}
        templateName={templateName}
        owners={owners}
        onSuccess={() =>
          setOpen(false)
        }
      />
    </EntityDialog>
  )
}