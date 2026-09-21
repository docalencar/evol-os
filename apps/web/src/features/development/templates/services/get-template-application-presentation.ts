import type { CorporateRole } from "@/features/authorization"
import type { Employee } from "@/features/people"

export type TemplateApplicationPresentation = Readonly<{
  targets: Employee[]
  owners: Employee[]
  fixedOwnerId: string | null
}>

const ADMINISTRATIVE_ROLES = new Set<CorporateRole>(["owner", "admin", "hr"])

/** Presentation only; trusted persistence independently authorizes the pair. */
export function getTemplateApplicationPresentation(input: {
  people: Employee[]
  actorPersonId: string | null
  actorRole: CorporateRole
}): TemplateApplicationPresentation | null {
  const eligiblePeople = input.people.filter(
    (person) => person.status === "active" || person.status === "on_leave"
  )

  if (input.actorRole === "manager") {
    if (!input.actorPersonId) return null
    const actor = eligiblePeople.find(
      (person) => person.id === input.actorPersonId && person.status === "active"
    )
    if (!actor) return null
    return {
      targets: eligiblePeople.filter((person) => person.manager_id === actor.id),
      owners: [actor],
      fixedOwnerId: actor.id,
    }
  }

  if (ADMINISTRATIVE_ROLES.has(input.actorRole)) {
    return {
      targets: eligiblePeople,
      owners: eligiblePeople.filter((person) => person.status === "active"),
      fixedOwnerId: null,
    }
  }

  return null
}
