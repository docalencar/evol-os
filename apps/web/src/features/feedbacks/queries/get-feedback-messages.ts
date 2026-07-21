import {
  z,
} from "zod"

import {
  createFeedbackMessageRepository,
} from "../repositories/feedback-message-repository"

const getFeedbackMessagesSchema =
  z.object({
    companyId: z.string().uuid(),
    threadId: z.string().uuid(),
  })

export type GetFeedbackMessagesInput =
  z.input<
    typeof getFeedbackMessagesSchema
  >

export async function getFeedbackMessages(
  input: GetFeedbackMessagesInput
) {
  const validatedInput =
    getFeedbackMessagesSchema.parse(input)

  const repository =
    await createFeedbackMessageRepository()

  const { data, error } =
    await repository.findByThread(
      validatedInput.companyId,
      validatedInput.threadId
    )

  if (error) {
    throw new Error(
      `Não foi possível carregar as mensagens da conversa: ${error.message}`
    )
  }

  return data ?? []
}
