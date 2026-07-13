"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { createPositionAction } from "../../actions/create-position-action"
import { updatePositionAction } from "../../actions/update-position-action"
import { PositionActionsSection } from "./position-actions-section"
import { PositionBasicInformationSection } from "./position-basic-information-section"
import { PositionOrganizationSection } from "./position-organization-section"
import { PositionWorkArrangementSection } from "./position-work-arrangement-section"
import type {
  DepartmentOption,
  PositionFormPosition,
} from "./types"

type PositionFormProps = {
  companyId: string
  departments: DepartmentOption[]
  position?: PositionFormPosition
  onSuccess?: () => void
}

export function PositionForm({
  companyId,
  departments,
  position,
  onSuccess,
}: PositionFormProps) {
  const [isPending, startTransition] = useTransition()

  const isEditing = Boolean(position)

  function handleSubmit(formData: FormData) {
    const departmentId = String(formData.get("departmentId") ?? "")

    const input = {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      departmentId: departmentId || null,
      hierarchicalLevel: String(
        formData.get("hierarchicalLevel") ?? ""
      ),
      status: String(formData.get("status") ?? ""),
      weeklyWorkloadHours: String(
        formData.get("weeklyWorkloadHours") ?? ""
      ),
      workModel: String(formData.get("workModel") ?? ""),
      employmentType: String(formData.get("employmentType") ?? ""),
      travelRequirement: String(
        formData.get("travelRequirement") ?? ""
      ),
    }

    startTransition(async () => {
      const result = position
        ? await updatePositionAction(companyId, position.id, input)
        : await createPositionAction(companyId, input)

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      onSuccess?.()
    })
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <PositionBasicInformationSection position={position} />

      <PositionOrganizationSection
        departments={departments}
        position={position}
      />

      <PositionWorkArrangementSection position={position} />

      <PositionActionsSection
        isPending={isPending}
        isEditing={isEditing}
      />
    </form>
  )
}

export type {
  DepartmentOption,
  PositionFormPosition,
} from "./types"