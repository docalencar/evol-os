import type { PlanningChangeSet } from "../../change-sets"

import {
  getChangeSetPresentation,
  type ChangeSetEntity,
} from "./change-set-description"

export type ChangeSetEntityFilter =
  | "all"
  | Exclude<ChangeSetEntity, "unknown">

export type ChangeSetFilters = Readonly<{
  query: string
  entity: ChangeSetEntityFilter
}>

export const DEFAULT_CHANGE_SET_FILTERS: ChangeSetFilters =
  Object.freeze({
    query: "",
    entity: "all",
  })

function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim()
}

function serializePayload(payload: unknown): string {
  try {
    return JSON.stringify(payload)
  } catch {
    return ""
  }
}

function matchesEntityFilter(
  changeSet: PlanningChangeSet,
  entityFilter: ChangeSetEntityFilter
): boolean {
  if (entityFilter === "all") {
    return true
  }

  const presentation =
    getChangeSetPresentation(changeSet)

  return presentation.entity === entityFilter
}

function matchesSearchQuery(
  changeSet: PlanningChangeSet,
  query: string
): boolean {
  const normalizedQuery =
    normalizeSearchValue(query)

  if (normalizedQuery.length === 0) {
    return true
  }

  const presentation =
    getChangeSetPresentation(changeSet)

  const searchableValues = [
    presentation.title,
    presentation.subject ?? "",
    presentation.description,
    presentation.entityLabel,
    presentation.actionLabel,
    changeSet.changeType,
    serializePayload(changeSet.payload),
  ]

  return searchableValues.some((value) =>
    normalizeSearchValue(value).includes(
      normalizedQuery
    )
  )
}

export function filterChangeSets(
  changeSets: readonly PlanningChangeSet[],
  filters: ChangeSetFilters
): PlanningChangeSet[] {
  return changeSets.filter(
    (changeSet) =>
      matchesEntityFilter(
        changeSet,
        filters.entity
      ) &&
      matchesSearchQuery(
        changeSet,
        filters.query
      )
  )
}
