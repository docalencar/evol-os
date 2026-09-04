"use client"

import {
  useState,
  useTransition,
  type FormEvent,
  type ReactElement,
} from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  COMPETENCY_TYPE_LABELS,
  COMPETENCY_TYPES,
  PROFICIENCY_LABELS,
  PROFICIENCY_LEVELS,
  WEIGHT_LABELS,
  WEIGHT_LEVELS,
  type CompetencyType,
} from "@/features/competencies/constants/competency-scale"

import type { CompetencyMatrixCellViewModel } from "../presenters/present-position-seniority-competency-matrix"

type MutationResult = {
  success: boolean
  message: string
}

type SetAction = (input: unknown) => Promise<MutationResult>
type ClearAction = (input: unknown) => Promise<MutationResult>

type PositionSeniorityCompetencyEditorDialogProps = {
  positionId: string
  competencyName: string
  profileLabel: string
  cell: CompetencyMatrixCellViewModel
  trigger: ReactElement
  setAction: SetAction
  clearAction: ClearAction
}

function initialExpectedLevel(cell: CompetencyMatrixCellViewModel): string {
  return String(cell.expectedLevel ?? PROFICIENCY_LEVELS[0])
}

function initialWeight(cell: CompetencyMatrixCellViewModel): string {
  return String(cell.weight ?? WEIGHT_LEVELS[0])
}

function initialType(cell: CompetencyMatrixCellViewModel): CompetencyType {
  return COMPETENCY_TYPES.includes(cell.type as CompetencyType)
    ? (cell.type as CompetencyType)
    : COMPETENCY_TYPES[0]
}

export function PositionSeniorityCompetencyEditorDialog({
  positionId,
  competencyName,
  profileLabel,
  cell,
  trigger,
  setAction,
  clearAction,
}: PositionSeniorityCompetencyEditorDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [expectedLevel, setExpectedLevel] = useState(initialExpectedLevel(cell))
  const [weight, setWeight] = useState(initialWeight(cell))
  const [required, setRequired] = useState(cell.required ?? true)
  const [type, setType] = useState<CompetencyType>(initialType(cell))
  const [notes, setNotes] = useState(cell.notes ?? "")

  const canClear = cell.state === "base" || cell.state === "override"
  const isBase = cell.isBaseProfile

  function resetForm() {
    setExpectedLevel(initialExpectedLevel(cell))
    setWeight(initialWeight(cell))
    setRequired(cell.required ?? true)
    setType(initialType(cell))
    setNotes(cell.notes ?? "")
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) resetForm()
    setOpen(nextOpen)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      const result = await setAction({
        positionId,
        profileId: cell.positionSeniorityProfileId,
        competencyId: cell.competencyId,
        expectedLevel: Number(expectedLevel),
        weight: Number(weight),
        required,
        type,
        notes: notes.trim() || null,
      })

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      setOpen(false)
    })
  }

  function handleClear() {
    startTransition(async () => {
      const result = await clearAction({
        positionId,
        profileId: cell.positionSeniorityProfileId,
        competencyId: cell.competencyId,
      })

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(
        isBase ? "Expectativa Base removida." : "Personalização removida."
      )
      setOpen(false)
    })
  }

  const saveExplanation = isBase
    ? "Salvar substitui a expectativa Base completa desta competência."
    : cell.state === "inherited"
      ? "Você está vendo os valores herdados da Base. Salvar cria uma expectativa específica completa para esta senioridade."
      : cell.state === "override"
        ? "Salvar substitui a expectativa específica completa desta senioridade."
        : "Salvar cria uma expectativa específica completa para esta senioridade."

  const clearCopy = isBase
    ? {
        label: "Remover expectativa Base",
        title: "Remover somente a expectativa Base?",
        description:
          "Esta ação remove apenas a expectativa Base desta competência. Expectativas específicas das senioridades não serão removidas.",
      }
    : {
        label: "Remover personalização",
        title: "Remover a expectativa específica?",
        description:
          "Esta senioridade deixará de ter uma expectativa própria. Após atualizar, ela herdará a Base quando houver uma; caso contrário, ficará como Não definido.",
      }

  return (
    <EntityDialog
      open={open}
      onOpenChange={handleOpenChange}
      trigger={trigger}
      title={`${competencyName} — ${profileLabel}`}
      description={`Estado atual: ${cell.stateLabel}. ${saveExplanation}`}
      dismissible={!isPending}
      contentClassName="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          {saveExplanation}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={`expected-level-${cell.positionSeniorityProfileId}-${cell.competencyId}`}>
              Proficiência esperada
            </Label>
            <select
              id={`expected-level-${cell.positionSeniorityProfileId}-${cell.competencyId}`}
              value={expectedLevel}
              onChange={(event) => setExpectedLevel(event.target.value)}
              disabled={isPending}
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {PROFICIENCY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {PROFICIENCY_LABELS[level]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor={`weight-${cell.positionSeniorityProfileId}-${cell.competencyId}`}>
              Peso
            </Label>
            <select
              id={`weight-${cell.positionSeniorityProfileId}-${cell.competencyId}`}
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              disabled={isPending}
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {WEIGHT_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {WEIGHT_LABELS[level]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor={`type-${cell.positionSeniorityProfileId}-${cell.competencyId}`}>
            Tipo
          </Label>
          <select
            id={`type-${cell.positionSeniorityProfileId}-${cell.competencyId}`}
            value={type}
            onChange={(event) => setType(event.target.value as CompetencyType)}
            disabled={isPending}
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {COMPETENCY_TYPES.map((option) => (
              <option key={option} value={option}>
                {COMPETENCY_TYPE_LABELS[option]}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={required}
            onChange={(event) => setRequired(event.target.checked)}
            disabled={isPending}
            className="h-4 w-4 rounded border-slate-300"
          />
          Competência obrigatória neste perfil
        </label>

        <div>
          <Label htmlFor={`notes-${cell.positionSeniorityProfileId}-${cell.competencyId}`}>
            Observações
          </Label>
          <Textarea
            id={`notes-${cell.positionSeniorityProfileId}-${cell.competencyId}`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={500}
            disabled={isPending}
            placeholder="Contexto opcional para esta expectativa"
          />
        </div>

        <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-200 pt-4 sm:flex-row">
          <div>
            {canClear ? (
              <ConfirmDialog
                title={clearCopy.title}
                description={clearCopy.description}
                confirmLabel={clearCopy.label}
                loading={isPending}
                onConfirm={handleClear}
              >
                <Button type="button" variant="destructive" disabled={isPending}>
                  {clearCopy.label}
                </Button>
              </ConfirmDialog>
            ) : null}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar expectativa"}
            </Button>
          </div>
        </div>
      </form>
    </EntityDialog>
  )
}
