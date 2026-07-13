"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { createPositionAction } from "../actions/create-position-action"
import { updatePositionAction } from "../actions/update-position-action"
import type {
  PositionHierarchicalLevel,
  PositionStatus,
} from "../types/position"

type DepartmentOption = {
  id: string
  name: string
}

type PositionFormProps = {
  companyId: string
  departments: DepartmentOption[]
  position?: {
    id: string
    name: string
    description: string | null
    department_id: string | null
    hierarchical_level: PositionHierarchicalLevel
    status: PositionStatus
  }
  onSuccess?: () => void
}

const hierarchicalLevelOptions: Array<{
  value: PositionHierarchicalLevel
  label: string
}> = [
  {
    value: "intern",
    label: "Estagiário",
  },
  {
    value: "assistant",
    label: "Assistente",
  },
  {
    value: "analyst",
    label: "Analista",
  },
  {
    value: "specialist",
    label: "Especialista",
  },
  {
    value: "coordinator",
    label: "Coordenador",
  },
  {
    value: "supervisor",
    label: "Supervisor",
  },
  {
    value: "manager",
    label: "Gerente",
  },
  {
    value: "director",
    label: "Diretor",
  },
  {
    value: "executive",
    label: "Executivo",
  },
]

const statusOptions: Array<{
  value: PositionStatus
  label: string
}> = [
  {
    value: "draft",
    label: "Rascunho",
  },
  {
    value: "active",
    label: "Ativo",
  },
  {
    value: "inactive",
    label: "Inativo",
  },
  {
    value: "obsolete",
    label: "Obsoleto",
  },
]

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

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
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>

        <Input
          id="name"
          name="name"
          placeholder="Ex: Analista de RH"
          defaultValue={position?.name ?? ""}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>

        <Textarea
          id="description"
          name="description"
          placeholder="Descreva a responsabilidade deste cargo."
          defaultValue={position?.description ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="departmentId">Departamento responsável</Label>

        <select
          id="departmentId"
          name="departmentId"
          className={selectClassName}
          defaultValue={position?.department_id ?? ""}
        >
          <option value="">Sem departamento</option>

          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hierarchicalLevel">Nível hierárquico</Label>

        <select
          id="hierarchicalLevel"
          name="hierarchicalLevel"
          className={selectClassName}
          defaultValue={position?.hierarchical_level ?? "analyst"}
          required
        >
          {hierarchicalLevelOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>

        <select
          id="status"
          name="status"
          className={selectClassName}
          defaultValue={position?.status ?? "active"}
          required
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Salvando..."
            : isEditing
              ? "Salvar alterações"
              : "Criar cargo"}
        </Button>
      </div>
    </form>
  )
}