"use client"

import {
  useState,
  useTransition,
} from "react"

import {
  RefreshCw,
  Sparkles,
} from "lucide-react"

import { toast } from "sonner"

import {
  CrudCreateDialog,
} from "@/components/shared/crud/crud-create-dialog"

import {
  Button,
} from "@/components/ui/button"

import {
  generateDevelopmentPlanSuggestionAction,
} from "../actions/generate-development-plan-suggestion-action"

import type {
  DevelopmentPlanAiInput,
  DevelopmentPlanAiOutput,
} from "../ai"

type DevelopmentPlanAiSuggestionDialogProps = {
  input: DevelopmentPlanAiInput
}

export function DevelopmentPlanAiSuggestionDialog({
  input,
}: DevelopmentPlanAiSuggestionDialogProps) {
  const [
    suggestion,
    setSuggestion,
  ] =
    useState<DevelopmentPlanAiOutput | null>(
      null
    )

  const [
    isPending,
    startTransition,
  ] = useTransition()

  function generateSuggestion() {
    startTransition(async () => {
      const result =
        await generateDevelopmentPlanSuggestionAction(
          input
        )

      if (
        !result.success ||
        !result.data
      ) {
        toast.error(result.message)
        return
      }

      setSuggestion(result.data)

      toast.success(result.message)
    })
  }

  function resetSuggestion() {
    setSuggestion(null)
  }

  return (
    <CrudCreateDialog
      trigger={
        <Button>
          <Sparkles size={16} />

          Gerar PDI com IA
        </Button>
      }
      title="Sugestão de PDI com IA"
      description="Gere uma proposta de plano com base nas competências que precisam ser desenvolvidas."
    >
      {({ close }) => (
        <div className="space-y-5">
          {suggestion ? (
            <>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Título sugerido
                </p>

                <h3 className="mt-2 text-lg font-semibold text-slate-900">
                  {suggestion.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {suggestion.summary}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Objetivos sugeridos
                </h3>

                <div className="mt-3 space-y-3">
                  {suggestion.goals.map(
                    (goal, index) => (
                      <div
                        key={`${goal.title}-${index}`}
                        className="rounded-lg border border-slate-200 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                            {index + 1}
                          </div>

                          <div className="min-w-0">
                            <p className="font-medium text-slate-900">
                              {goal.title}
                            </p>

                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              {
                                goal.description
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Esta é uma pré-visualização.
                Nenhuma informação foi salva.
              </p>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    resetSuggestion()
                    close()
                  }}
                  disabled={isPending}
                >
                  Fechar
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={
                    generateSuggestion
                  }
                  disabled={isPending}
                >
                  <RefreshCw
                    size={16}
                    className={
                      isPending
                        ? "animate-spin"
                        : undefined
                    }
                  />

                  Gerar novamente
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg border border-dashed border-slate-200 px-6 py-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <Sparkles size={22} />
                </div>

                <h3 className="mt-4 font-semibold text-slate-900">
                  Gerar sugestão personalizada
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  A sugestão utilizará o cargo e
                  os GAPs de competências
                  informados para estruturar o
                  plano.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    resetSuggestion()
                    close()
                  }}
                  disabled={isPending}
                >
                  Cancelar
                </Button>

                <Button
                  type="button"
                  onClick={
                    generateSuggestion
                  }
                  disabled={isPending}
                >
                  <Sparkles size={16} />

                  {isPending
                    ? "Gerando sugestão..."
                    : "Gerar sugestão"}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </CrudCreateDialog>
  )
}
