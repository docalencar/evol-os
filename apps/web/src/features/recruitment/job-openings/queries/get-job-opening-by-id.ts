import {
  createJobOpeningRepository,
} from "../repositories/job-opening-repository"

export async function getJobOpeningById(
  companyId: string,
  jobOpeningId: string
) {
  const repository =
    await createJobOpeningRepository()

  const { data, error } =
    await repository.findById(
      companyId,
      jobOpeningId
    )

  if (error) {
    throw new Error(
      "Não foi possível carregar a vaga."
    )
  }

  return data
}
