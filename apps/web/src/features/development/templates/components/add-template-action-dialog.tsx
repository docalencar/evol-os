"use client"

import { useTransition } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { CrudCreateDialog } from "@/components/shared/crud/crud-create-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import {
  DEVELOPMENT_ACTION_TYPES,
  DEVELOPMENT_ACTION_TYPE_LABELS,
} from "../../constants/development-action"
import type { DevelopmentActionType } from "../../constants/development-action"
import { createActionForTemplateGoalAction } from "../actions/create-action-for-template-goal-action"

type AddTemplateActionDialogProps = {
  templateId: string
  templateGoalId: string
}

export function AddTemplateActionDialog({
  templateId,
  templateGoalId,
}: AddTemplateActionDialogProps) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(
    formData: FormData,
    close: () => void
  ) {
    const suggestedDueDaysValue = String(
      formData.get("suggestedDueDays") ?? ""
    ).trim()

    const type = String(
      formData.get("type") ?? "course"
    ) as DevelopmentActionType

    const input = {
      templateId,
      templateGoalId,
      title: String(formData.get("title") ?? ""),
      description: String(
        formData.get("description") ?? ""
      ),
      type,
      suggestedDueDays:
        suggestedDueDaysValue === ""
          ? undefined
          : Number(suggestedDueDaysValue),
    }

    startTransition(async () => {
      const result =
        await createActionForTemplateGoalAction(
          input
        )

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      close()
    })
  }

  return (
    <CrudCreateDialog
      trigger={
        <Button
          type="button"
          variant="secondary"
          size="sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar ação
        </Button>
      }
      title="Adicionar ação de desenvolvimento"
      description="Defina uma atividade prática para desenvolver esta competência."
    >
      {({ close }) => (
        <form
          action={(formData) =>
            handleSubmit(formData, close)
          }
          className="space-y-4"
        >
          <div>
            <Label htmlFor={`title-${templateGoalId}`}>
              Título
            </Label>

            <Input
              id={`title-${templateGoalId}`}
              name="title"
              placeholder="Ex.: Realizar curso de comunicação"
              required
              disabled={isPending}
            />
          </div>

          <div>
            <Label
              htmlFor={`description-${templateGoalId}`}
            >
              Descrição
            </Label>

            <Textarea
              id={`description-${templateGoalId}`}
              name="description"
              placeholder="Descreva como esta ação deverá ser realizada."
              disabled={isPending}
            />
          </div>

          <div>
            <Label htmlFor={`type-${templateGoalId}`}>
              Tipo da ação
            </Label>

            <select
              id={`type-${templateGoalId}`}
              name="type"
              defaultValue="course"
              className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-evol-blue focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isPending}
            >
              {DEVELOPMENT_ACTION_TYPES.map(
                (actionType) => (
                  <option
                    key={actionType}
                    value={actionType}
                  >
                    {
                      DEVELOPMENT_ACTION_TYPE_LABELS[
                        actionType
                      ]
                    }
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <Label
              htmlFor={`suggestedDueDays-${templateGoalId}`}
            >
              Prazo sugerido (dias)
            </Label>

            <Input
              id={`suggestedDueDays-${templateGoalId}`}
              name="suggestedDueDays"
              type="number"
              min={1}
              placeholder="Ex.: 30"
              disabled={isPending}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={close}
              disabled={isPending}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={isPending}
            >
              {isPending
                ? "Adicionando..."
                : "Adicionar ação"}
            </Button>
          </div>
        </form>
      )}
    </CrudCreateDialog>
  )
}