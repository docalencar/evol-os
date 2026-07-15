import "server-only"

import {
  createOrganizationTimelineRepository,
} from "../repositories/organization-timeline-repository"
import {
  persistOrganizationTimelineSchema,
} from "../schemas/organization-timeline-schema"
import type {
  PersistOrganizationTimelineInput,
} from "../schemas/organization-timeline-schema"

export type PersistOrganizationTimelineResult = {
  timelineId: string
}

export async function persistOrganizationTimeline(
  input: PersistOrganizationTimelineInput
): Promise<PersistOrganizationTimelineResult> {
  const validatedInput =
    persistOrganizationTimelineSchema.parse(input)

  const repository =
    await createOrganizationTimelineRepository()

  const { data, error } =
    await repository.create(validatedInput)

  if (error) {
    throw new Error(
      `Não foi possível registrar a execução na Timeline: ${error.message}`
    )
  }

  if (!data?.id) {
    throw new Error(
      "A Timeline foi persistida sem retornar um identificador."
    )
  }

  return {
    timelineId: data.id,
  }
}
