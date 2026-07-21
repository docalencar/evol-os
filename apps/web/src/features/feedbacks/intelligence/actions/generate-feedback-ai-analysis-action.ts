"use server"

import { z } from "zod"

import {
  failureResult,
  successResult,
} from "@/lib/actions"

import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

import {
  getEmployees,
  type Employee,
} from "@/features/people"

import {
  getFeedbackMessages,
} from "../../queries/get-feedback-messages"

import {
  getFeedbackThreadById,
} from "../../queries/get-feedback-thread-by-id"

import {
  createFeedbackAiContext,
} from "../context"

import {
  presentFeedbackAiContext,
} from "../presenters"

import {
  createFeedbackMockAiProvider,
  generateFeedbackAiAnalysis,
} from "../services"

import type {
  FeedbackAiAnalysis,
} from "../types"

const generateFeedbackAiAnalysisInputSchema =
  z.object({
    threadId: z
      .string()
      .uuid(
        "A conversa de feedback informada é inválida."
      ),
  })

export type GenerateFeedbackAiAnalysisActionInput =
  z.infer<
    typeof generateFeedbackAiAnalysisInputSchema
  >

export type GenerateFeedbackAiAnalysisActionData = {
  analysis: FeedbackAiAnalysis
  provider: string
  model: string
}

export async function generateFeedbackAiAnalysisAction(
  values: unknown
) {
  const parsedInput =
    generateFeedbackAiAnalysisInputSchema.safeParse(
      values
    )

  if (!parsedInput.success) {
    return failureResult(
      parsedInput.error.issues[0]?.message ??
        "Dados inválidos para gerar a análise."
    )
  }

  try {
    const {
      companyId,
      personId,
    } = await getCurrentCompanyContext()

    if (!personId) {
      return failureResult(
        "Não foi possível identificar a pessoa vinculada ao usuário."
      )
    }

    const thread =
      await getFeedbackThreadById({
        companyId,
        threadId:
          parsedInput.data.threadId,
      })

    if (!thread) {
      return failureResult(
        "Conversa de feedback não encontrada."
      )
    }

    const isParticipant =
      thread.senderEmployeeId ===
        personId ||
      thread.receiverEmployeeId ===
        personId

    if (!isParticipant) {
      return failureResult(
        "Somente participantes podem gerar a análise desta conversa."
      )
    }

    const [
      messages,
      employeesData,
    ] = await Promise.all([
      getFeedbackMessages({
        companyId,
        threadId: thread.id,
      }),

      getEmployees(companyId),
    ])

    if (messages.length === 0) {
      return failureResult(
        "A conversa ainda não possui mensagens para analisar."
      )
    }

    const employees =
      (employeesData ?? []) as Employee[]

    const context =
      createFeedbackAiContext({
        thread,
        messages,
        employees,
        locale: "pt-BR",
        timeZone: "America/Sao_Paulo",
      })

    const presentation =
      presentFeedbackAiContext(
        context
      )

    const provider =
      createFeedbackMockAiProvider()

    const result =
      await generateFeedbackAiAnalysis(
        provider,
        presentation
      )

    const data: GenerateFeedbackAiAnalysisActionData =
      {
        analysis: result.output,
        provider: result.provider,
        model: result.model,
      }

    return successResult(
      "Análise inteligente gerada com sucesso.",
      data
    )
  } catch (error) {
    console.error(
      "Erro ao gerar análise inteligente do feedback:",
      error
    )

    return failureResult(
      error instanceof Error
        ? error.message
        : "Não foi possível gerar a análise inteligente."
    )
  }
}
