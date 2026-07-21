import {
  z,
} from "zod"

import {
  createFeedbackMentionRepository,
} from "../repositories/feedback-mention-repository"

const getFeedbackMentionsSchema =
  z.object({
    companyId: z.string().uuid(),
    threadId: z.string().uuid(),
    messageId:
      z.string().uuid().optional(),
  })

export type GetFeedbackMentionsInput =
  z.input<
    typeof getFeedbackMentionsSchema
  >

export async function getFeedbackMentions(
  input: GetFeedbackMentionsInput
) {
  const validatedInput =
    getFeedbackMentionsSchema.parse(input)

  const repository =
    await createFeedbackMentionRepository()

  const { data, error } =
    validatedInput.messageId
      ? await repository.findByMessage(
          validatedInput.companyId,
          validatedInput.messageId
        )
      : await repository.findByThread(
          validatedInput.companyId,
          validatedInput.threadId
        )

  if (error) {
    throw new Error(
      `Não foi possível carregar as menções da conversa: ${error.message}`
    )
  }

  return data ?? []
}
