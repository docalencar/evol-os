"use client"

import {
  useTransition,
} from "react"
import {
  useRouter,
} from "next/navigation"
import {
  Archive,
  AlertTriangle,
  Building2,
} from "lucide-react"
import {
  toast,
} from "sonner"

import {
  Button,
} from "@/components/ui/button"

import {
  createPlanningChangeSetAction,
} from "../../../actions"
import type {
  ProjectedDepartmentSelectorOption,
} from "../../selectors"

type DepartmentArchiveChangeFormProps = {
  scenarioId: string
  department: ProjectedDepartmentSelectorOption
  onCancel?: () => void
  onSuccess?: () => void
}

function getDepartmentLabel(
  department: ProjectedDepartmentSelectorOption
) {
  if (!department.code) {
    return department.name
  }

  return `${department.name} (${department.code})`
}

export function DepartmentArchiveChangeForm({
  scenarioId,
  department,
  onCancel,
  onSuccess,
}: DepartmentArchiveChangeFormProps) {
  const router = useRouter()

  const [
    isPending,
    startTransition,
  ] = useTransition()

  function handleSubmit() {
    startTransition(async () => {
      const result =
        await createPlanningChangeSetAction({
          scenarioId,
          changeType: "department.archive",
          payload: {
            departmentId: department.id,
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
      <div className="rounded-xl border bg-muted/20 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="min-w-0">
            <h3 className="font-medium">
              {getDepartmentLabel(department)}
            </h3>

            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Este departamento será marcado como
              arquivado na estrutura projetada do
              cenário.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />

          <div>
            <h3 className="font-medium text-destructive">
              Confirme o arquivamento
            </h3>

            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              O departamento deixará de aparecer como
              ativo na projeção deste cenário. Esta
              alteração não modifica imediatamente a
              estrutura atual da empresa.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-dashed p-4">
        <div className="flex items-start gap-3">
          <Archive className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

          <p className="text-sm leading-6 text-muted-foreground">
            Dependências organizacionais vinculadas ao
            departamento serão avaliadas pela projeção
            antes da publicação do cenário.
          </p>
        </div>
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
          variant="destructive"
          disabled={isPending}
        >
          {isPending
            ? "Criando alteração..."
            : "Arquivar departamento"}
        </Button>
      </div>
    </form>
  )
}
