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
  createScenarioAction,
} from "../actions"

type PlanningScenarioFormProps = {
  workspaceId: string
  baseSnapshotId: string
  onSuccess?: () => void
}

const textareaClassName =
  "flex min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

export function PlanningScenarioForm({
  workspaceId,
  baseSnapshotId,
  onSuccess,
}: PlanningScenarioFormProps) {
  const router = useRouter()

  const [
    isPending,
    startTransition,
  ] = useTransition()

  function handleSubmit(formData: FormData) {
    const input = {
      workspaceId,
      baseSnapshotId,
      name: String(
        formData.get("name") ?? ""
      ),
      description: String(
        formData.get("description") ?? ""
      ),
    }

    startTransition(async () => {
      const result =
        await createScenarioAction(input)

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
        <Label htmlFor="planning-scenario-name">
          Nome do cenário
        </Label>

        <Input
          id="planning-scenario-name"
          name="name"
          placeholder="Ex.: Expansão da operação em 2027"
          minLength={2}
          maxLength={120}
          disabled={isPending}
          required
        />

        <p className="text-xs leading-5 text-muted-foreground">
          Use um nome que facilite identificar a proposta
          organizacional analisada.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="planning-scenario-description">
          Descrição
        </Label>

        <textarea
          id="planning-scenario-description"
          name="description"
          className={textareaClassName}
          placeholder="Descreva o objetivo, as premissas e o contexto deste cenário."
          maxLength={500}
          disabled={isPending}
        />

        <p className="text-xs leading-5 text-muted-foreground">
          A descrição é opcional e pode ter até 500
          caracteres.
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isPending}
        >
          {isPending
            ? "Criando cenário..."
            : "Criar cenário"}
        </Button>
      </div>
    </form>
  )
}
