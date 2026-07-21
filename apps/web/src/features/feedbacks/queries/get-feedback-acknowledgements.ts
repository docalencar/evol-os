import {
  z,
} from "zod"

import {
  createFeedbackAcknowledgementRepository,
} from "../repositories/feedback-acknowledgement-repository"

const getFeedbackAcknowledgementsSchema =
  z.object({
    companyId: z.string().uuid(),
    threadId: z.string().uuid(),
  })

export type GetFeedbackAcknowledgementsInput =
  z.input<
    typeof getFeedbackAcknowledgementsSchema
  >

export async function getFeedbackAcknowledgements(
  input: GetFeedbackAcknowledgementsInput
) {
  const validatedInput =
    getFeedbackAcknowledgementsSchema.parse(
      input
    )

  const repository =
    await createFeedbackAcknowledgementRepository()

  const { data, error } =
    await repository.findByThread(
      validatedInput.companyId,
      validatedInput.threadId
    )

  if (error) {
    throw new Error(
      `Não foi possível carregar as confirmações da conversa: ${error.message}`
    )
  }

  return data ?? []
}
