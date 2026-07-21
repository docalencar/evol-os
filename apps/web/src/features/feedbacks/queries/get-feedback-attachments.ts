import {
  z,
} from "zod"

import {
  createFeedbackAttachmentRepository,
} from "../repositories/feedback-attachment-repository"

const getFeedbackAttachmentsSchema =
  z.object({
    companyId: z.string().uuid(),
    threadId: z.string().uuid(),
    messageId:
      z.string().uuid().optional(),
  })

export type GetFeedbackAttachmentsInput =
  z.input<
    typeof getFeedbackAttachmentsSchema
  >

export async function getFeedbackAttachments(
  input: GetFeedbackAttachmentsInput
) {
  const validatedInput =
    getFeedbackAttachmentsSchema.parse(
      input
    )

  const repository =
    await createFeedbackAttachmentRepository()

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
      `Não foi possível carregar os anexos da conversa: ${error.message}`
    )
  }

  return data ?? []
}
