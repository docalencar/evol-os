import {
  z,
} from "zod"

import {
  createFeedbackThreadRepository,
} from "../repositories/feedback-thread-repository"

const getFeedbackThreadByIdSchema =
  z.object({
    companyId: z.string().uuid(),
    threadId: z.string().uuid(),
  })

export type GetFeedbackThreadByIdInput =
  z.input<
    typeof getFeedbackThreadByIdSchema
  >

export async function getFeedbackThreadById(
  input: GetFeedbackThreadByIdInput
) {
  const validatedInput =
    getFeedbackThreadByIdSchema.parse(
      input
    )

  const repository =
    await createFeedbackThreadRepository()

  const { data, error } =
    await repository.findById(
      validatedInput.companyId,
      validatedInput.threadId
    )

  if (error) {
    throw new Error(
      `Não foi possível localizar a conversa de feedback: ${error.message}`
    )
  }

  return data
}
