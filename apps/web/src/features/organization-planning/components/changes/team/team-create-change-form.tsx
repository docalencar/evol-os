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

type TeamCreateChangeFormProps = {
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

export function TeamCreateChangeForm({
  scenarioId,
  departments,
  onCancel,
  onSuccess,
}: TeamCreateChangeFormProps) {
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

    const departmentId = String(
      formData.get("departmentId") ?? ""
    )

    startTransition(async () => {
      const result =
        await createPlanningChangeSetAction({
          scenarioId,
          changeType: "team.create",
          payload: {
            teamId: crypto.randomUUID(),
            name,
            code,
            description,
            departmentId,
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
        <Label htmlFor="planning-team-name">
          Nome da equipe
        </Label>

        <Input
          id="planning-team-name"
          name="name"
          placeholder="Ex.: Operações de campo"
          minLength={2}
          maxLength={120}
          disabled={isPending}
          required
        />

        <p className="text-xs leading-5 text-muted-foreground">
          Informe o nome que a equipe terá na estrutura
          projetada.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="planning-team-code">
          Código
        </Label>

        <Input
          id="planning-team-code"
          name="code"
          placeholder="Ex.: OPS-CAMPO"
          maxLength={50}
          disabled={isPending}
        />

        <p className="text-xs leading-5 text-muted-foreground">
          Campo opcional para identificação interna da
          equipe.
        </p>
      </div>

      <ProjectedDepartmentSelector
        id="planning-team-department-id"
        name="departmentId"
        label="Departamento"
        departments={departments}
        disabled={isPending}
        description="Selecione o departamento ao qual esta equipe ficará vinculada."
      />

      <div className="space-y-2">
        <Label htmlFor="planning-team-description">
          Descrição
        </Label>

        <textarea
          id="planning-team-description"
          name="description"
          className={textareaClassName}
          placeholder="Descreva a responsabilidade e o objetivo desta equipe."
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
            : "Criar equipe"}
        </Button>
      </div>
    </form>
  )
}
