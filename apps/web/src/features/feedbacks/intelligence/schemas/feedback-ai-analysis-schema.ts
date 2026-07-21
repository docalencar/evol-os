import {
  z,
  type ZodType,
} from "zod"

import type {
  FeedbackAiAnalysis,
} from "../types"

export const feedbackAiAnalysisSchema: ZodType<FeedbackAiAnalysis> =
  z.object({
    summary: z
      .string()
      .trim()
      .min(10)
      .max(1200),

    tone: z.enum([
      "positive",
      "constructive",
      "neutral",
      "attention",
    ]),

    themes: z
      .array(z.string().trim().min(2).max(120))
      .max(10),

    competencies: z
      .array(z.string().trim().min(2).max(120))
      .max(10),

    agreements: z
      .array(z.string().trim().min(2).max(300))
      .max(10),

    nextSteps: z
      .array(z.string().trim().min(2).max(300))
      .max(10),
  })
