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
  type ProjectedTeamSelectorOption,
} from "../../selectors"

type TeamUpdateChangeFormProps = {
  scenarioId: string
  team: ProjectedTeamSelectorOption
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

export function TeamUpdateChangeForm({
  scenarioId,
  team,
  departments,
  onCancel,
  onSuccess,
}: TeamUpdateChangeFormProps) {
  const router = useRouter()

  const [
    name,
    setName,
  ] = useState(team.name)

  const [
    code,
    setCode,
  ] = useState(
    normalizeOptionalValue(team.code)
  )

  const [
    description,
    setDescription,
  ] = useState(
    normalizeOptionalValue(team.description)
  )

  const [
    isPending,
    startTransition,
  ] = useTransition()

  function handleSubmit(formData: FormData) {
    const departmentId = String(
      formData.get("departmentId") ?? ""
    )

    const initialCode =
      normalizeOptionalValue(team.code)

    const initialDescription =
      normalizeOptionalValue(
        team.description
      )

    const initialDepartmentId =
      normalizeOptionalValue(
        team.departmentId
      )

    const hasChanges =
      name !== team.name ||
      code !== initialCode ||
      description !== initialDescription ||
      departmentId !== initialDepartmentId

    if (!hasChanges) {
      toast.info(
        "Nenhuma alteração foi realizada na equipe."
      )
      return
    }

    startTransition(async () => {
      const result =
        await createPlanningChangeSetAction({
          scenarioId,
          changeType: "team.update",
          payload: {
            teamId: team.id,
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
        <Label htmlFor="planning-team-update-name">
          Nome da equipe
        </Label>

        <Input
          id="planning-team-update-name"
          name="name"
          value={name}
          onChange={(event) =>
            setName(event.target.value)
          }
          placeholder="Ex.: Atendimento"
          minLength={2}
          maxLength={120}
          disabled={isPending}
          required
        />

        <p className="text-xs leading-5 text-muted-foreground">
          Atualize o nome que a equipe terá na
          estrutura projetada.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="planning-team-update-code">
          Código
        </Label>

        <Input
          id="planning-team-update-code"
          name="code"
          value={code}
          onChange={(event) =>
            setCode(event.target.value)
          }
          placeholder="Ex.: ATD"
          maxLength={50}
          disabled={isPending}
        />

        <p className="text-xs leading-5 text-muted-foreground">
          Campo opcional para identificação interna da
          equipe.
        </p>
      </div>

      <ProjectedDepartmentSelector
        id="planning-team-update-department-id"
        name="departmentId"
        label="Departamento"
        departments={departments}
        defaultValue={
          team.departmentId ?? ""
        }
        disabled={isPending}
        required
        description="Selecione o departamento ao qual esta equipe ficará vinculada na estrutura projetada."
      />

      <div className="space-y-2">
        <Label htmlFor="planning-team-update-description">
          Descrição
        </Label>

        <textarea
          id="planning-team-update-description"
          name="description"
          className={textareaClassName}
          value={description}
          onChange={(event) =>
            setDescription(event.target.value)
          }
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
            : "Atualizar equipe"}
        </Button>
      </div>
    </form>
  )
}
