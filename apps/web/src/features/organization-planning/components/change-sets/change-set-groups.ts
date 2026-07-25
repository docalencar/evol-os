import type { PlanningChangeSet } from "../../change-sets"

import {
  getChangeSetPresentation,
  type ChangeSetEntity,
} from "./change-set-description"

export type ChangeSetGroupEntity =
  Exclude<ChangeSetEntity, "unknown">

export type ChangeSetGroup = Readonly<{
  entity: ChangeSetGroupEntity
  label: string
  changeSets: readonly PlanningChangeSet[]
}>

const GROUP_ORDER: readonly ChangeSetGroupEntity[] =
  Object.freeze([
    "department",
    "team",
    "position",
    "employee",
  ])

const GROUP_LABELS: Record<
  ChangeSetGroupEntity,
  string
> = {
  department: "Departamentos",
  team: "Equipes",
  position: "Cargos",
  employee: "Colaboradores",
}

export function groupChangeSets(
  changeSets: readonly PlanningChangeSet[]
): ChangeSetGroup[] {
  const groupedChangeSets = new Map<
    ChangeSetGroupEntity,
    PlanningChangeSet[]
  >()

  for (const entity of GROUP_ORDER) {
    groupedChangeSets.set(entity, [])
  }

  for (const changeSet of changeSets) {
    const presentation =
      getChangeSetPresentation(changeSet)

    if (presentation.entity === "unknown") {
      continue
    }

    groupedChangeSets
      .get(presentation.entity)
      ?.push(changeSet)
  }

  return GROUP_ORDER.flatMap((entity) => {
    const entityChangeSets =
      groupedChangeSets.get(entity) ?? []

    if (entityChangeSets.length === 0) {
      return []
    }

    return [
      Object.freeze({
        entity,
        label: GROUP_LABELS[entity],
        changeSets: Object.freeze([
          ...entityChangeSets,
        ]),
      }),
    ]
  })
}
