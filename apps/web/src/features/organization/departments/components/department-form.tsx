"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

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
  const [message, setMessage] = useState<string | null>(null)

  const isEditing = Boolean(department)

  function handleSubmit(formData: FormData) {
    setMessage(null)

    const input = {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      leaderId: null,
    }

    startTransition(async () => {
      const result = department
        ? await updateDepartmentAction(companyId, department.id, input)
        : await createDepartmentAction(companyId, input)

      setMessage(result.message)

      if (result.success) {
        onSuccess?.()
      }
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

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}

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
