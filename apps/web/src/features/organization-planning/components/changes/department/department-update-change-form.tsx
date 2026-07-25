"use client"

import {
  useState,
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
} from "../../../actions"
import {
  ProjectedDepartmentSelector,
  type ProjectedDepartmentSelectorOption,
} from "../../selectors"

type DepartmentUpdateChangeFormProps = {
  scenarioId: string
  department: ProjectedDepartmentSelectorOption
  departments:
    readonly ProjectedDepartmentSelectorOption[]
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
  value: string | null
) {
  return value ?? ""
}

export function DepartmentUpdateChangeForm({
  scenarioId,
  department,
  departments,
  onCancel,
  onSuccess,
}: DepartmentUpdateChangeFormProps) {
  const router = useRouter()

  const [
    name,
    setName,
  ] = useState(department.name)

  const [
    code,
    setCode,
  ] = useState(
    normalizeOptionalValue(department.code)
  )

  const [
    description,
    setDescription,
  ] = useState(
    normalizeOptionalValue(department.description)
  )

  const [
    isPending,
    startTransition,
  ] = useTransition()

  const availableParentDepartments =
    departments.filter(
      (candidateDepartment) =>
        candidateDepartment.id !== department.id
    )

  function handleSubmit(formData: FormData) {
    const parentDepartmentId = String(
      formData.get("parentDepartmentId") ?? ""
    )

    const initialCode =
      normalizeOptionalValue(department.code)

    const initialDescription =
      normalizeOptionalValue(
        department.description
      )

    const initialParentDepartmentId =
      normalizeOptionalValue(
        department.parentDepartmentId
      )

    const hasChanges =
      name !== department.name ||
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

    startTransition(async () => {
      const result =
        await createPlanningChangeSetAction({
          scenarioId,
          changeType: "department.update",
          payload: {
            departmentId: department.id,
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

      router.refresh()
      onSuccess?.()
    })
  }

  return (
    <form
      action={handleSubmit}
      className="space-y-6"
    >
      <div className="space-y-2">
        <Label htmlFor="planning-department-update-name">
          Nome do departamento
        </Label>

        <Input
          id="planning-department-update-name"
          name="name"
          value={name}
          onChange={(event) =>
            setName(event.target.value)
          }
          placeholder="Ex.: Operações"
          minLength={2}
          maxLength={120}
          disabled={isPending}
          required
        />

        <p className="text-xs leading-5 text-muted-foreground">
          Atualize o nome que o departamento terá na
          estrutura projetada.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="planning-department-update-code">
          Código
        </Label>

        <Input
          id="planning-department-update-code"
          name="code"
          value={code}
          onChange={(event) =>
            setCode(event.target.value)
          }
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
        id="planning-department-update-parent-id"
        name="parentDepartmentId"
        label="Departamento superior"
        departments={availableParentDepartments}
        defaultValue={
          department.parentDepartmentId ?? ""
        }
        disabled={isPending}
        allowNoDepartment
        description="Selecione o departamento ao qual esta unidade ficará subordinada ou mantenha-a no nível principal."
      />

      <div className="space-y-2">
        <Label htmlFor="planning-department-update-description">
          Descrição
        </Label>

        <textarea
          id="planning-department-update-description"
          name="description"
          className={textareaClassName}
          value={description}
          onChange={(event) =>
            setDescription(event.target.value)
          }
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
          Voltar
        </Button>

        <Button
          type="submit"
          disabled={isPending}
        >
          {isPending
            ? "Criando alteração..."
            : "Atualizar departamento"}
        </Button>
      </div>
    </form>
  )
}
