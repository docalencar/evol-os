import {
  z,
} from "zod"

import {
  createFeedbackThreadRepository,
} from "../repositories/feedback-thread-repository"

const getFeedbackThreadsSchema =
  z.object({
    companyId: z.string().uuid(),
    employeeId:
      z.string().uuid().optional(),
  })

export type GetFeedbackThreadsInput =
  z.input<
    typeof getFeedbackThreadsSchema
  >

export async function getFeedbackThreads(
  input: GetFeedbackThreadsInput
) {
  const validatedInput =
    getFeedbackThreadsSchema.parse(input)

  const repository =
    await createFeedbackThreadRepository()

  const { data, error } =
    validatedInput.employeeId
      ? await repository.findByEmployee(
          validatedInput.companyId,
          validatedInput.employeeId
        )
      : await repository.findAllByCompany(
          validatedInput.companyId
        )

  if (error) {
    throw new Error(
      `Não foi possível carregar as conversas de feedback: ${error.message}`
    )
  }

  return data ?? []
}
