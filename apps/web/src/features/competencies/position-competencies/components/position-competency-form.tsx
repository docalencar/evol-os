"use client"

import {
  useState,
  useTransition,
  type FormEvent,
} from "react"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import type {
  Competency,
} from "@/features/competencies"

import {
  createPositionCompetencyAction,
} from "../actions/create-position-competency-action"

import {
  updatePositionCompetencyAction,
} from "../actions/update-position-competency-action"

import type {
  PositionCompetencyType,
} from "../types/position-competency"

type PositionCompetencyFormValue = {
  id: string
  competencyId: string
  expectedLevel: number
  weight: number
  required: boolean
  type: PositionCompetencyType
  notes: string | null
}

type PositionCompetencyFormProps = {
  companyId: string
  positionId: string
  competencies: Competency[]
  positionCompetency?: PositionCompetencyFormValue
  onSuccess?: () => void
}

const TYPE_OPTIONS: {
  value: PositionCompetencyType
  label: string
}[] = [
  {
    value: "core",
    label: "Essencial",
  },
  {
    value: "leadership",
    label: "Liderança",
  },
  {
    value: "promotion",
    label: "Promoção",
  },
  {
    value: "optional",
    label: "Opcional",
  },
]

export function PositionCompetencyForm({
  companyId,
  positionId,
  competencies,
  positionCompetency,
  onSuccess,
}: PositionCompetencyFormProps) {
  const isEditing =
    Boolean(positionCompetency)

  const [
    competencyId,
    setCompetencyId,
  ] = useState(
    positionCompetency?.competencyId ??
      ""
  )

  const [
    expectedLevel,
    setExpectedLevel,
  ] = useState(
    String(
      positionCompetency?.expectedLevel ??
        1
    )
  )

  const [
    weight,
    setWeight,
  ] = useState(
    String(
      positionCompetency?.weight ?? 1
    )
  )

  const [
    required,
    setRequired,
  ] = useState(
    positionCompetency?.required ?? true
  )

  const [
    type,
    setType,
  ] =
    useState<PositionCompetencyType>(
      positionCompetency?.type ??
        "core"
    )

  const [
    notes,
    setNotes,
  ] = useState(
    positionCompetency?.notes ?? ""
  )

  const [
    isPending,
    startTransition,
  ] = useTransition()

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    const input = {
      positionId,
      competencyId,
      expectedLevel:
        Number(expectedLevel),
      weight:
        Number(weight),
      required,
      type,
      notes:
        notes.trim() || undefined,
    }

    startTransition(async () => {
      const result =
        positionCompetency
          ? await updatePositionCompetencyAction(
              companyId,
              positionCompetency.id,
              input
            )
          : await createPositionCompetencyAction(
              companyId,
              input
            )

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      onSuccess?.()
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <div>
        <Label htmlFor="competencyId">
          Competência
        </Label>

        <select
          id="competencyId"
          name="competencyId"
          value={competencyId}
          onChange={(event) =>
            setCompetencyId(
              event.target.value
            )
          }
          className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          required
          disabled={
            isPending || isEditing
          }
        >
          <option value="">
            Selecione uma competência
          </option>

          {competencies.map(
            (competency) => (
              <option
                key={competency.id}
                value={competency.id}
              >
                {competency.name}
              </option>
            )
          )}
        </select>

        {isEditing ? (
          <p className="mt-1 text-xs text-slate-500">
            A competência vinculada não pode ser alterada.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="expectedLevel">
            Nível esperado
          </Label>

          <select
            id="expectedLevel"
            name="expectedLevel"
            value={expectedLevel}
            onChange={(event) =>
              setExpectedLevel(
                event.target.value
              )
            }
            className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            required
            disabled={isPending}
          >
            <option value="1">
              1 — Inicial
            </option>

            <option value="2">
              2 — Básico
            </option>

            <option value="3">
              3 — Intermediário
            </option>

            <option value="4">
              4 — Avançado
            </option>

            <option value="5">
              5 — Referência
            </option>
          </select>
        </div>

        <div>
          <Label htmlFor="weight">
            Peso
          </Label>

          <select
            id="weight"
            name="weight"
            value={weight}
            onChange={(event) =>
              setWeight(
                event.target.value
              )
            }
            className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            required
            disabled={isPending}
          >
            <option value="1">
              1 — Baixo
            </option>

            <option value="2">
              2
            </option>

            <option value="3">
              3 — Médio
            </option>

            <option value="4">
              4
            </option>

            <option value="5">
              5 — Crítico
            </option>
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="type">
          Tipo
        </Label>

        <select
          id="type"
          name="type"
          value={type}
          onChange={(event) =>
            setType(
              event.target
                .value as PositionCompetencyType
            )
          }
          className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          disabled={isPending}
        >
          {TYPE_OPTIONS.map(
            (option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            )
          )}
        </select>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
        <input
          id="required"
          name="required"
          type="checkbox"
          checked={required}
          onChange={(event) =>
            setRequired(
              event.target.checked
            )
          }
          className="mt-1 h-4 w-4 rounded border-slate-300"
          disabled={isPending}
        />

        <div>
          <Label htmlFor="required">
            Competência obrigatória
          </Label>

          <p className="mt-1 text-sm text-slate-500">
            Competências obrigatórias devem receber maior prioridade no desenvolvimento do colaborador.
          </p>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">
          Observações
        </Label>

        <Textarea
          id="notes"
          name="notes"
          value={notes}
          onChange={(event) =>
            setNotes(
              event.target.value
            )
          }
          placeholder="Registre critérios, contexto ou expectativas para esta competência."
          rows={4}
          maxLength={500}
          disabled={isPending}
        />

        <p className="mt-1 text-right text-xs text-slate-500">
          {notes.length}/500
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={
            isPending ||
            !competencyId
          }
        >
          {isPending
            ? "Salvando..."
            : isEditing
              ? "Salvar alterações"
              : "Adicionar competência"}
        </Button>
      </div>
    </form>
  )
}