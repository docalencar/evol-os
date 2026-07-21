import {
  createJobOpeningRepository,
} from "../repositories/job-opening-repository"

export async function getJobOpenings(
  companyId: string
) {
  const repository =
    await createJobOpeningRepository()

  const { data, error } =
    await repository.findAllByCompany(
      companyId
    )

  if (error) {
    throw new Error(
      "Não foi possível carregar as vagas."
    )
  }

  return data ?? []
}
