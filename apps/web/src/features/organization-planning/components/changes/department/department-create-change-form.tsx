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
} from "../../../actions"
import {
  ProjectedDepartmentSelector,
  type ProjectedDepartmentSelectorOption,
} from "../../selectors"

type DepartmentCreateChangeFormProps = {
  scenarioId: string
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

export function DepartmentCreateChangeForm({
  scenarioId,
  departments,
  onCancel,
  onSuccess,
}: DepartmentCreateChangeFormProps) {
  const router = useRouter()

  const [
    isPending,
    startTransition,
  ] = useTransition()

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

    startTransition(async () => {
      const result =
        await createPlanningChangeSetAction({
          scenarioId,
          changeType: "department.create",
          payload: {
            departmentId: crypto.randomUUID(),
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
            : "Criar departamento"}
        </Button>
      </div>
    </form>
  )
}
