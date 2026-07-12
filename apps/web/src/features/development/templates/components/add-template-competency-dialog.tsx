"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { CrudCreateDialog } from "@/components/shared/crud/crud-create-dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

import type { Competency } from "@/features/competencies"

import { createDevelopmentTemplateGoalAction } from "../actions/create-development-template-goal-action"

type AddTemplateCompetencyDialogProps = {
  templateId: string
  competencies: Competency[]
}

export function AddTemplateCompetencyDialog({
  templateId,
  competencies,
}: AddTemplateCompetencyDialogProps) {
  const [selectedCompetencyId, setSelectedCompetencyId] =
    useState("")
  const [targetLevel, setTargetLevel] = useState("3")
  const [isPending, startTransition] = useTransition()

  const hasCompetencies = competencies.length > 0

  function resetForm() {
    setSelectedCompetencyId("")
    setTargetLevel("3")
  }

  return (
    <CrudCreateDialog
      trigger={
        <Button disabled={!hasCompetencies}>
          Adicionar Competência
        </Button>
      }
      title="Adicionar competência"
      description="Selecione uma competência do catálogo da empresa e defina o nível desejado."
    >
      {({ close }) => (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()

            startTransition(async () => {
              const result =
                await createDevelopmentTemplateGoalAction({
                  templateId,
                  competencyId: selectedCompetencyId,
                  suggestedTargetLevel:
                    Number(targetLevel),
                })

              if (!result.success) {
                toast.error(result.message)
                return
              }

              toast.success(result.message)

              resetForm()
              close()
            })
          }}
        >
          <div>
            <Label htmlFor="competencyId">
              Competência
            </Label>

            <select
              id="competencyId"
              name="competencyId"
              value={selectedCompetencyId}
              onChange={(event) =>
                setSelectedCompetencyId(
                  event.target.value
                )
              }
              className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              required
              disabled={isPending}
            >
              <option value="">
                Selecione uma competência
              </option>

              {competencies.map((competency) => (
                <option
                  key={competency.id}
                  value={competency.id}
                >
                  {competency.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="targetLevel">
              Nível desejado
            </Label>

            <select
              id="targetLevel"
              name="targetLevel"
              value={targetLevel}
              onChange={(event) =>
                setTargetLevel(event.target.value)
              }
              className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              disabled={isPending}
            >
              <option value="1">Nível 1</option>
              <option value="2">Nível 2</option>
              <option value="3">Nível 3</option>
              <option value="4">Nível 4</option>
              <option value="5">Nível 5</option>
            </select>
          </div>

          {!hasCompetencies ? (
            <p className="text-sm text-amber-700">
              Nenhuma competência ativa está cadastrada
              para esta empresa.
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                resetForm()
                close()
              }}
              disabled={isPending}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={
                isPending ||
                !selectedCompetencyId
              }
            >
              {isPending
                ? "Adicionando..."
                : "Adicionar"}
            </Button>
          </div>
        </form>
      )}
    </CrudCreateDialog>
  )
}
