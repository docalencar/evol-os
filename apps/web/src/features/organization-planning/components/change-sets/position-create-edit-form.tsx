"use client"

import {
  useState,
} from "react"

import {
  Button,
} from "@/components/ui/button"

import {
  updatePlanningChangeSetAction,
} from "../../actions/update-planning-change-set-action"

import type {
  PositionCreateChangeSet,
} from "../../change-sets"

type PositionCreateEditFormProps = {
  changeSet: PositionCreateChangeSet
  scenarioId: string
  onSuccess: () => void
  onCancel: () => void
}


export function PositionCreateEditForm({
  changeSet,
  scenarioId,
  onSuccess,
  onCancel,
}: PositionCreateEditFormProps) {

  const [
    title,
    setTitle,
  ] = useState(
    changeSet.payload.title
  )


  const [
    code,
    setCode,
  ] = useState(
    changeSet.payload.code ?? ""
  )


  const [
    departmentId,
    setDepartmentId,
  ] = useState(
    changeSet.payload.departmentId
  )


  const [
    teamId,
    setTeamId,
  ] = useState(
    changeSet.payload.teamId ?? ""
  )


  const [
    hierarchicalLevel,
    setHierarchicalLevel,
  ] = useState(
    changeSet.payload.hierarchicalLevel ?? ""
  )


  const [
    reportsToPositionId,
    setReportsToPositionId,
  ] = useState(
    changeSet.payload.reportsToPositionId ?? ""
  )


  const [
    saving,
    setSaving,
  ] = useState(false)


  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setSaving(true)

    const result =
      await updatePlanningChangeSetAction({
        scenarioId,
        changeSetId: changeSet.id,
        expectedVersion: changeSet.version,
        changeType: "position.create",
        payload: {
          positionId:
            changeSet.payload.positionId,

          title,

          code:
            code.trim()
              ? code.trim()
              : null,

          departmentId,

          teamId:
            teamId.trim()
              ? teamId.trim()
              : null,

          hierarchicalLevel:
            hierarchicalLevel.trim()
              ? hierarchicalLevel.trim()
              : null,

          reportsToPositionId:
            reportsToPositionId.trim()
              ? reportsToPositionId.trim()
              : null,
        },
      })


    setSaving(false)


    if (result.success) {
      onSuccess()
    }
  }


  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >

      <div>
        <label className="text-sm font-medium">
          Título do cargo
        </label>

        <input
          value={title}
          onChange={(event) =>
            setTitle(event.target.value)
          }
          className="mt-1 w-full rounded-md border p-2"
        />
      </div>


      <div>
        <label className="text-sm font-medium">
          Código
        </label>

        <input
          value={code}
          onChange={(event) =>
            setCode(event.target.value)
          }
          className="mt-1 w-full rounded-md border p-2"
        />
      </div>


      <div>
        <label className="text-sm font-medium">
          Departamento
        </label>

        <input
          value={departmentId}
          onChange={(event) =>
            setDepartmentId(event.target.value)
          }
          className="mt-1 w-full rounded-md border p-2"
        />
      </div>


      <div>
        <label className="text-sm font-medium">
          Time
        </label>

        <input
          value={teamId}
          onChange={(event) =>
            setTeamId(event.target.value)
          }
          className="mt-1 w-full rounded-md border p-2"
        />
      </div>


      <div>
        <label className="text-sm font-medium">
          Nível hierárquico
        </label>

        <input
          value={hierarchicalLevel}
          onChange={(event) =>
            setHierarchicalLevel(event.target.value)
          }
          className="mt-1 w-full rounded-md border p-2"
        />
      </div>


      <div>
        <label className="text-sm font-medium">
          Cargo superior
        </label>

        <input
          value={reportsToPositionId}
          onChange={(event) =>
            setReportsToPositionId(event.target.value)
          }
          className="mt-1 w-full rounded-md border p-2"
        />
      </div>


      <div className="flex justify-end gap-2">

        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancelar
        </Button>


        <Button
          type="submit"
          disabled={saving}
        >
          {saving
            ? "Salvando..."
            : "Salvar"}
        </Button>

      </div>

    </form>
  )
}
