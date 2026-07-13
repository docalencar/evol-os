"use client"

import {
  useState,
  useTransition,
} from "react"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import type {
  Competency,
} from "@/features/competencies"

import {
  createEmployeeCompetencyAction,
} from "../actions/create-employee-competency-action"

import {
  updateEmployeeCompetencyAction,
} from "../actions/update-employee-competency-action"

import type {
  EmployeeCompetencySource,
} from "../types/employee-competency"

type EmployeeCompetencyFormValue = {
  id: string

  competencyId: string

  currentLevel: number

  source: EmployeeCompetencySource

  validatedAt: string | null

  notes: string | null
}

type EmployeeCompetencyFormProps = {
  companyId: string

  employeeId: string

  competencies: Competency[]

  employeeCompetency?: EmployeeCompetencyFormValue

  onSuccess?: () => void
}

const SOURCE_OPTIONS: {
  value: EmployeeCompetencySource
  label: string
}[] = [
  {
    value: "manual",
    label: "Manual",
  },
  {
    value: "manager",
    label: "Gestor",
  },
  {
    value: "self",
    label: "Autoavaliação",
  },
  {
    value: "assessment",
    label: "Avaliação",
  },
]

export function EmployeeCompetencyForm({
  companyId,
  employeeId,
  competencies,
  employeeCompetency,
  onSuccess,
}: EmployeeCompetencyFormProps) {
  const isEditing =
    Boolean(employeeCompetency)

  const [
    competencyId,
    setCompetencyId,
  ] = useState(
    employeeCompetency?.competencyId ??
      ""
  )

  const [
    currentLevel,
    setCurrentLevel,
  ] = useState(
    String(
      employeeCompetency?.currentLevel ??
        1
    )
  )

  const [
    source,
    setSource,
  ] =
    useState<EmployeeCompetencySource>(
      employeeCompetency?.source ??
        "manual"
    )

  const [
    validatedAt,
    setValidatedAt,
  ] = useState(
    employeeCompetency?.validatedAt ??
      ""
  )

  const [
    notes,
    setNotes,
  ] = useState(
    employeeCompetency?.notes ?? ""
  )

  const [
    isPending,
    startTransition,
  ] = useTransition()

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    const input = {
      employeeId,

      competencyId,

      currentLevel:
        Number(currentLevel),

      source,

      validatedAt:
        validatedAt || undefined,

      notes:
        notes.trim() || undefined,
    }

    startTransition(async () => {
      const result =
        employeeCompetency
          ? await updateEmployeeCompetencyAction(
              companyId,
              employeeCompetency.id,
              input
            )
          : await createEmployeeCompetencyAction(
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

      <div>
        <Label htmlFor="currentLevel">
          Nível atual
        </Label>

        <select
          id="currentLevel"
          name="currentLevel"
          value={currentLevel}
          onChange={(event) =>
            setCurrentLevel(
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

        <p className="mt-1 text-xs text-slate-500">
          Informe o nível demonstrado atualmente pelo colaborador.
        </p>
      </div>

      <div>
        <Label htmlFor="source">
          Origem da informação
        </Label>

        <select
          id="source"
          name="source"
          value={source}
          onChange={(event) =>
            setSource(
              event.target
                .value as EmployeeCompetencySource
            )
          }
          className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          disabled={isPending}
        >
          {SOURCE_OPTIONS.map(
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

      <div>
        <Label htmlFor="validatedAt">
          Data da validação
        </Label>

        <Input
          id="validatedAt"
          name="validatedAt"
          type="date"
          value={validatedAt}
          onChange={(event) =>
            setValidatedAt(
              event.target.value
            )
          }
          disabled={isPending}
        />
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
          placeholder="Registre evidências, contexto ou observações sobre o nível informado."
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