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

import {
  createPositionRequirementAction,
} from "../actions/create-position-requirement-action"

import {
  updatePositionRequirementAction,
} from "../actions/update-position-requirement-action"

import type {
  PositionRequirementCategory,
} from "../types/position-requirement"

type PositionRequirementFormValue = {
  id: string
  category: PositionRequirementCategory
  value: string
  required: boolean
  notes: string | null
}

type PositionRequirementFormProps = {
  positionId: string
  positionRequirement?: PositionRequirementFormValue
  onSuccess?: () => void
}

const CATEGORY_OPTIONS: {
  value: PositionRequirementCategory
  label: string
}[] = [
  {
    value: "education",
    label: "Formação",
  },
  {
    value: "experience",
    label: "Experiência",
  },
  {
    value: "certification",
    label: "Certificação",
  },
  {
    value: "language",
    label: "Idioma",
  },
  {
    value: "knowledge",
    label: "Conhecimento",
  },
  {
    value: "other",
    label: "Outro",
  },
]

export function PositionRequirementForm({
  positionId,
  positionRequirement,
  onSuccess,
}: PositionRequirementFormProps) {
  const isEditing =
    Boolean(positionRequirement)

  const [
    category,
    setCategory,
  ] =
    useState<PositionRequirementCategory>(
      positionRequirement?.category ??
        "education"
    )

  const [
    value,
    setValue,
  ] = useState(
    positionRequirement?.value ?? ""
  )

  const [
    required,
    setRequired,
  ] = useState(
    positionRequirement?.required ??
      true
  )

  const [
    notes,
    setNotes,
  ] = useState(
    positionRequirement?.notes ?? ""
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
      category,
      value,
      required,
      notes:
        notes.trim() || undefined,
    }

    startTransition(async () => {
      const result =
        positionRequirement
          ? await updatePositionRequirementAction(
              positionRequirement.id,
              input
            )
          : await createPositionRequirementAction(
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
        <Label htmlFor="category">
          Categoria
        </Label>

        <select
          id="category"
          name="category"
          value={category}
          onChange={(event) =>
            setCategory(
              event.target
                .value as PositionRequirementCategory
            )
          }
          className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          disabled={isPending}
          required
        >
          {CATEGORY_OPTIONS.map(
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
        <Label htmlFor="value">
          Requisito
        </Label>

        <Textarea
          id="value"
          name="value"
          value={value}
          onChange={(event) =>
            setValue(
              event.target.value
            )
          }
          placeholder="Ex.: Ensino superior completo em Administração, Psicologia ou áreas relacionadas."
          rows={3}
          maxLength={200}
          disabled={isPending}
          required
        />

        <p className="mt-1 text-right text-xs text-slate-500">
          {value.length}/200
        </p>
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
            Requisito obrigatório
          </Label>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Quando desmarcado, o requisito será tratado como desejável.
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
          placeholder="Registre critérios complementares, equivalências ou informações importantes."
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
            value.trim().length < 2
          }
        >
          {isPending
            ? "Salvando..."
            : isEditing
              ? "Salvar alterações"
              : "Adicionar requisito"}
        </Button>
      </div>
    </form>
  )
}