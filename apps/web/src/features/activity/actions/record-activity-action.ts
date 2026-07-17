"use server"

import {
  recordActivity,
} from "../services/record-activity"
import type {
  RecordActivityInput,
} from "../schemas/activity-schema"
import type {
  ActivityViewModel,
} from "../view-models/activity-view-model"

export type RecordActivityActionState =
  | {
      success: true
      message: string
      activity: ActivityViewModel
    }
  | {
      success: false
      message: string
    }

export async function recordActivityAction(
  input: RecordActivityInput
): Promise<RecordActivityActionState> {
  try {
    const activity =
      await recordActivity(input)

    return {
      success: true,
      message:
        "Atividade registrada com sucesso.",
      activity,
    }
  } catch (error) {
    console.error(
      "Erro ao registrar atividade:",
      error
    )

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível registrar a atividade.",
    }
  }
}
