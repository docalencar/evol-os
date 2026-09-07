"use client"

import { useMemo, useState, useTransition, type FormEvent } from "react"
import { toast } from "sonner"

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

/**
 * Bootstrap the FIRST expectation of a competency on a position.
 *
 * The matrix editor can only edit a cell, and the matrix only has cells for
 * competencies that already carry a row in `position_seniority_competencies`.
 * That made the first row unreachable: no row -> no cell -> no editor -> no row.
 * This dialog is the missing front door, and nothing more — it writes through
 * the SAME server action the cell editor uses, with the same field set, and so
 * reaches the same canonical trusted mutation boundary. No new schema, no
 * second write path. (The RPC name is deliberately not spelled out here: a
 * sibling test asserts this component never references it, because naming an
 * RPC in the UI layer is how direct calls start.)
 *
 * A competency already carrying its OWN row on the selected profile is removed
 * from the picker, so this dialog can never present itself as "add" while
 * silently overwriting. Editing such a combination stays where it already is:
 * the cell's own editor.
 */

type MutationResult = {
  success: boolean
  message: string
}

type CompetencyOption = {
  id: string
  name: string
}

type ProfileOption = {
  profileId: string
  label: string
}

type AddPositionSeniorityCompetencyDialogProps = {
  positionId: string
  /** Active BASE profile, when the position has one. */
  baseProfileId: string | null
  /** Active specific seniority profiles, already presented for this position. */
  seniorityProfiles: ProfileOption[]
  competencies: CompetencyOption[]
  cells: CompetencyMatrixCellViewModel[]
  setAction: (input: unknown) => Promise<MutationResult>
}

/**
 * True when this exact profile already stores its own row for the competency.
 * Base owns `baseRowId`; a specific profile owns `overrideRowId`. An inherited
 * cell owns nothing, so adding a specific expectation there is a real create.
 */
export function hasOwnExpectation(
  cells: CompetencyMatrixCellViewModel[],
  profileId: string,
  competencyId: string
): boolean {
  const cell = cells.find(
    (candidate) =>
      candidate.positionSeniorityProfileId === profileId &&
      candidate.competencyId === competencyId
  )

  if (!cell) return false

  return cell.isBaseProfile
    ? cell.baseRowId !== null
    : cell.overrideRowId !== null
}

export function AddPositionSeniorityCompetencyDialog({
  positionId,
  baseProfileId,
  seniorityProfiles,
  competencies,
  cells,
  setAction,
}: AddPositionSeniorityCompetencyDialogProps) {
  const profileOptions = useMemo<ProfileOption[]>(
    () => [
      ...(baseProfileId
        ? [{ profileId: baseProfileId, label: "Base (expectativa comum do cargo)" }]
        : []),
      ...seniorityProfiles,
    ],
    [baseProfileId, seniorityProfiles]
  )

  // Base first: the common expectation of the position is the one a user
  // almost always wants to define before any seniority-specific override.
  const defaultProfileId = profileOptions[0]?.profileId ?? ""

  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [profileId, setProfileId] = useState(defaultProfileId)
  const [competencyId, setCompetencyId] = useState("")
  const [expectedLevel, setExpectedLevel] = useState(String(PROFICIENCY_LEVELS[2]))
  const [weight, setWeight] = useState(String(WEIGHT_LEVELS[2]))
  const [required, setRequired] = useState(true)
  const [type, setType] = useState<CompetencyType>(COMPETENCY_TYPES[0])
  const [notes, setNotes] = useState("")

  const selectableCompetencies = useMemo(
    () =>
      competencies.filter(
        (competency) => !hasOwnExpectation(cells, profileId, competency.id)
      ),
    [competencies, cells, profileId]
  )

  function resetForm() {
    setProfileId(defaultProfileId)
    setCompetencyId("")
    setExpectedLevel(String(PROFICIENCY_LEVELS[2]))
    setWeight(String(WEIGHT_LEVELS[2]))
    setRequired(true)
    setType(COMPETENCY_TYPES[0])
    setNotes("")
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) resetForm()
    setOpen(nextOpen)
  }

  function handleProfileChange(nextProfileId: string) {
    setProfileId(nextProfileId)

    // The picker is scoped to the profile, so a competency that is valid for one
    // profile may already be configured on another. Drop a now-invalid choice
    // rather than submitting it against a combination the user cannot see.
    if (competencyId && hasOwnExpectation(cells, nextProfileId, competencyId)) {
      setCompetencyId("")
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!profileId || !competencyId) return

    startTransition(async () => {
      const result = await setAction({
        positionId,
        profileId,
        competencyId,
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

  const canSubmit = Boolean(profileId) && Boolean(competencyId) && !isPending

  return (
    <EntityDialog
      open={open}
      onOpenChange={handleOpenChange}
      trigger={<Button>Adicionar competência à matriz</Button>}
      title="Adicionar competência à matriz"
      description="Defina a expectativa de uma competência para este cargo. Comece pela Base para valer em todas as senioridades, ou escolha uma senioridade específica."
      dismissible={!isPending}
      contentClassName="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="add-expectation-profile">Perfil de senioridade</Label>
          <select
            id="add-expectation-profile"
            value={profileId}
            onChange={(event) => handleProfileChange(event.target.value)}
            disabled={isPending}
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {profileOptions.map((option) => (
              <option key={option.profileId} value={option.profileId}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            A expectativa Base vale para todas as senioridades do cargo enquanto
            não houver uma expectativa específica.
          </p>
        </div>

        <div>
          <Label htmlFor="add-expectation-competency">Competência</Label>
          <select
            id="add-expectation-competency"
            value={competencyId}
            onChange={(event) => setCompetencyId(event.target.value)}
            disabled={isPending || selectableCompetencies.length === 0}
            required
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Selecione uma competência</option>
            {selectableCompetencies.map((competency) => (
              <option key={competency.id} value={competency.id}>
                {competency.name}
              </option>
            ))}
          </select>
          {selectableCompetencies.length === 0 ? (
            <p className="mt-1 text-xs text-slate-500">
              Todas as competências do catálogo já possuem expectativa neste
              perfil. Edite a expectativa existente pela própria matriz.
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="add-expectation-level">Proficiência esperada</Label>
            <select
              id="add-expectation-level"
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
            <Label htmlFor="add-expectation-weight">Peso</Label>
            <select
              id="add-expectation-weight"
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
          <Label htmlFor="add-expectation-type">Tipo</Label>
          <select
            id="add-expectation-type"
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
          <Label htmlFor="add-expectation-notes">Observações</Label>
          <Textarea
            id="add-expectation-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={500}
            disabled={isPending}
            placeholder="Contexto opcional para esta expectativa"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {isPending ? "Salvando..." : "Salvar expectativa"}
          </Button>
        </div>
      </form>
    </EntityDialog>
  )
}
