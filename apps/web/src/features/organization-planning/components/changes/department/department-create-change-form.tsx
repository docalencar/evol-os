"use client"

import {
  useTransition,
} from "react"
import {
  useRouter,
} from "next/navigation"
import {
  toast,
} from "sonner"

import {
  Button,
} from "@/components/ui/button"
import {
  Input,
} from "@/components/ui/input"
import {
  Label,
} from "@/components/ui/label"

import {
  createPlanningChangeSetAction,
  updatePlanningChangeSetAction,
} from "../../../actions"
import {
  ProjectedDepartmentSelector,
  type ProjectedDepartmentSelectorOption,
} from "../../selectors"

type DepartmentCreateChangeSetEditData = {
  id: string
  version: number
  payload: {
    departmentId: string
    name: string
    code: string | null
    description: string | null
    parentDepartmentId: string | null
  }
}

type DepartmentCreateChangeFormProps = {
  scenarioId: string
  departments:
    readonly ProjectedDepartmentSelectorOption[]
  editChangeSet?:
    DepartmentCreateChangeSetEditData
  onCancel?: () => void
  onSuccess?: () => void
}

const textareaClassName = [
  "flex min-h-28 w-full rounded-md border border-input",
  "bg-background px-3 py-2 text-sm",
  "ring-offset-background",
  "placeholder:text-muted-foreground",
  "focus-visible:outline-none",
  "focus-visible:ring-2",
  "focus-visible:ring-ring",
  "focus-visible:ring-offset-2",
  "disabled:cursor-not-allowed",
  "disabled:opacity-50",
].join(" ")

function normalizeOptionalValue(
  value: string | null | undefined
) {
  return value ?? ""
}

export function DepartmentCreateChangeForm({
  scenarioId,
  departments,
  editChangeSet,
  onCancel,
  onSuccess,
}: DepartmentCreateChangeFormProps) {
  const router = useRouter()

  const [
    isPending,
    startTransition,
  ] = useTransition()

  const isEditing = Boolean(editChangeSet)

  function handleSubmit(formData: FormData) {
    const name = String(
      formData.get("name") ?? ""
    )

    const code = String(
      formData.get("code") ?? ""
    )

    const description = String(
      formData.get("description") ?? ""
    )

    const parentDepartmentId = String(
      formData.get("parentDepartmentId") ?? ""
    )

    if (editChangeSet) {
      const initialCode =
        normalizeOptionalValue(
          editChangeSet.payload.code
        )

      const initialDescription =
        normalizeOptionalValue(
          editChangeSet.payload.description
        )

      const initialParentDepartmentId =
        normalizeOptionalValue(
          editChangeSet.payload
            .parentDepartmentId
        )

      const hasChanges =
        name !== editChangeSet.payload.name ||
        code !== initialCode ||
        description !== initialDescription ||
        parentDepartmentId !==
          initialParentDepartmentId

      if (!hasChanges) {
        toast.info(
          "Nenhuma alteração foi realizada no departamento."
        )
        return
      }
    }

    startTransition(async () => {
      const result = editChangeSet
        ? await updatePlanningChangeSetAction({
            scenarioId,
            changeSetId: editChangeSet.id,
            expectedVersion:
              editChangeSet.version,
            changeType: "department.create",
            payload: {
              departmentId:
                editChangeSet.payload
                  .departmentId,
              name,
              code,
              description,
              parentDepartmentId,
            },
          })
        : await createPlanningChangeSetAction({
            scenarioId,
            changeType: "department.create",
            payload: {
              departmentId:
                crypto.randomUUID(),
              name,
              code,
              description,
              parentDepartmentId,
            },
          })

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)

      onSuccess?.()
      router.refresh()
    })
  }

  return (
    <form
      action={handleSubmit}
      className="space-y-6"
    >
      <div className="space-y-2">
        <Label htmlFor="planning-department-name">
          Nome do departamento
        </Label>

        <Input
          id="planning-department-name"
          name="name"
          defaultValue={
            editChangeSet?.payload.name
          }
          placeholder="Ex.: Operações"
          minLength={2}
          maxLength={120}
          disabled={isPending}
          required
        />

        <p className="text-xs leading-5 text-muted-foreground">
          Informe o nome que o departamento terá na
          estrutura projetada.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="planning-department-code">
          Código
        </Label>

        <Input
          id="planning-department-code"
          name="code"
          defaultValue={normalizeOptionalValue(
            editChangeSet?.payload.code
          )}
          placeholder="Ex.: OPS"
          maxLength={50}
          disabled={isPending}
        />

        <p className="text-xs leading-5 text-muted-foreground">
          Campo opcional para identificação interna do
          departamento.
        </p>
      </div>

      <ProjectedDepartmentSelector
        id="planning-parent-department-id"
        name="parentDepartmentId"
        label="Departamento superior"
        departments={departments}
        defaultValue={normalizeOptionalValue(
          editChangeSet?.payload
            .parentDepartmentId
        )}
        disabled={isPending}
        allowNoDepartment
        description="Selecione o departamento ao qual esta nova unidade ficará subordinada ou mantenha-a no nível principal."
      />

      <div className="space-y-2">
        <Label htmlFor="planning-department-description">
          Descrição
        </Label>

        <textarea
          id="planning-department-description"
          name="description"
          className={textareaClassName}
          defaultValue={normalizeOptionalValue(
            editChangeSet?.payload.description
          )}
          placeholder="Descreva a responsabilidade e o objetivo deste departamento."
          maxLength={500}
          disabled={isPending}
        />

        <p className="text-xs leading-5 text-muted-foreground">
          A descrição é opcional e pode ter até 500
          caracteres.
        </p>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={onCancel}
        >
          {isEditing
            ? "Cancelar"
            : "Voltar"}
        </Button>

        <Button
          type="submit"
          disabled={isPending}
        >
          {isPending
            ? isEditing
              ? "Salvando alteração..."
              : "Criando alteração..."
            : isEditing
              ? "Salvar alterações"
              : "Criar departamento"}
        </Button>
      </div>
    </form>
  )
}
