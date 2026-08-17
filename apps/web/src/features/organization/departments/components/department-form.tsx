"use client"

import { useRef, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { newSubmissionId } from "@/features/people-organization-mutations/submission-id"

import { createDepartmentAction } from "../actions/create-department-action"
import { updateDepartmentAction } from "../actions/update-department-action"

type DepartmentFormProps = {
  companyId: string
  department?: {
    id: string
    name: string
    description: string | null
  }
  onSuccess?: () => void
}

export function DepartmentForm({
  companyId,
  department,
  onSuccess,
}: DepartmentFormProps) {
  const [isPending, startTransition] = useTransition()

  const isEditing = Boolean(department)
  // Stable per-form-instance idempotency token (reset after a successful create).
  const submissionIdRef = useRef<string | null>(null)

  function handleSubmit(formData: FormData) {
    if (!isEditing && !submissionIdRef.current) {
      submissionIdRef.current = newSubmissionId()
    }

    const input = {
      idempotencyKey: isEditing
        ? undefined
        : submissionIdRef.current,
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      leaderId: null,
    }

    startTransition(async () => {
      const result = department
        ? await updateDepartmentAction(companyId, department.id, input)
        : await createDepartmentAction(companyId, input)

      if (!result.success) {
        toast.error(result.message)
        return
      }

      if (!isEditing) {
        submissionIdRef.current = null
      }

      toast.success(result.message)
      onSuccess?.()
    })
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          name="name"
          placeholder="Ex: Comercial"
          defaultValue={department?.name ?? ""}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Descreva a responsabilidade deste departamento."
          defaultValue={department?.description ?? ""}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Salvando..."
            : isEditing
              ? "Salvar alterações"
              : "Criar departamento"}
        </Button>
      </div>
    </form>
  )
}