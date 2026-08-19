import {
  createJobOpeningRepository,
} from "../repositories/job-opening-repository"
import type {
  CreateJobOpeningInput,
} from "../schemas/job-opening-schema"

type CreateJobOpeningServiceInput = {
  companyId: string
  values: CreateJobOpeningInput
}

export async function createJobOpening(
  input: CreateJobOpeningServiceInput
) {
  const repository =
    await createJobOpeningRepository()

  // Tenant/FK validation and the creation activity now happen atomically inside
  // the 0093 trusted boundary, so the service no longer performs direct-read
  // relation validation nor a separate activity write (which would duplicate it).
  const { data, error } = await repository.create({
    companyId: input.companyId,
    idempotencyKey: crypto.randomUUID(),
    values: input.values,
  })

  if (error || !data) {
    throw new Error(
      "Não foi possível criar a vaga."
    )
  }

  return data
}
